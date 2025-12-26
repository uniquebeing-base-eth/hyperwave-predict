// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BloomBetting (HyperWave Edition)
 * @dev House-based prediction market with fixed 2x payout
 * @notice Users can bet unlimited times per round. Draws = losses. Instant settlement.
 */
contract BloomBetting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    IERC20 public immutable bloomToken;
    address public constant BLOOM_TOKEN_ADDRESS = 0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07;
    uint256 public constant MINIMUM_STAKE = 100_000 * 10**18; // 100,000 BLOOM (18 decimals)
    uint256 public constant ROUND_DURATION = 60; // 1 minute rounds
    
    // ============ Enums ============
    enum Direction { None, Up, Down }
    enum BetResult { Pending, Win, Lose }

    // ============ Structs ============
    struct Round {
        uint256 roundId;
        uint256 startTime;
        uint256 endTime;
        uint256 startPrice;
        uint256 endPrice;
        uint256 totalUpPool;
        uint256 totalDownPool;
        Direction result;
        bool resolved;
    }

    struct Bet {
        uint256 betId;
        uint256 roundId;
        address user;
        Direction direction;
        uint256 amount;
        uint256 timestamp;
        BetResult result;
        uint256 payout;
    }

    struct UserStats {
        uint256 totalBets;
        uint256 totalWins;
        uint256 totalLosses;
        uint256 totalStaked;
        uint256 totalWinnings;
        uint256 currentStreak;
        uint256 lastPlayedDay;
    }

    // ============ State Variables ============
    uint256 public currentRoundId;
    uint256 public nextBetId;
    
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => Bet[]) public roundBets; // roundId => all bets in round
    mapping(address => uint256[]) public userBetIds; // user => their bet IDs across all rounds
    mapping(uint256 => Bet) public betsById; // betId => Bet
    mapping(address => UserStats) public userStats;

    address public priceOracle;

    // ============ Events ============
    event RoundStarted(uint256 indexed roundId, uint256 startTime, uint256 startPrice);
    event BetPlaced(uint256 indexed roundId, uint256 indexed betId, address indexed user, Direction direction, uint256 amount);
    event RoundSettled(uint256 indexed roundId, Direction result, uint256 endPrice, uint256 totalPayouts);
    event StreakUpdated(address indexed user, uint256 streak);
    event OracleUpdated(address oldOracle, address newOracle);

    // ============ Modifiers ============
    modifier onlyOracle() {
        require(msg.sender == priceOracle || msg.sender == owner(), "Not authorized oracle");
        _;
    }

    modifier roundExists(uint256 _roundId) {
        require(rounds[_roundId].startTime > 0, "Round does not exist");
        _;
    }

    // ============ Constructor ============
    constructor(address _bloomToken, address _priceOracle) Ownable(msg.sender) {
        require(_bloomToken != address(0), "Invalid token address");
        bloomToken = IERC20(_bloomToken);
        priceOracle = _priceOracle;
    }

    // ============ External Functions ============

    /**
     * @notice Start a new betting round
     * @param _startPrice The ETH price at round start (8 decimals from Chainlink)
     */
    function startRound(uint256 _startPrice) external onlyOracle {
        require(_startPrice > 0, "Invalid start price");
        
        // If there's an active round, ensure it's resolved
        if (currentRoundId > 0) {
            require(rounds[currentRoundId].resolved, "Previous round not resolved");
        }

        currentRoundId++;
        uint256 startTime = block.timestamp;
        
        rounds[currentRoundId] = Round({
            roundId: currentRoundId,
            startTime: startTime,
            endTime: startTime + ROUND_DURATION,
            startPrice: _startPrice,
            endPrice: 0,
            totalUpPool: 0,
            totalDownPool: 0,
            result: Direction.None,
            resolved: false
        });

        emit RoundStarted(currentRoundId, startTime, _startPrice);
    }

    /**
     * @notice Place a bet on the current round (UNLIMITED bets per user per round!)
     * @param _direction UP (1) or DOWN (2)
     * @param _amount Amount of BLOOM tokens to stake
     */
    function placeBet(Direction _direction, uint256 _amount) external nonReentrant {
        require(_direction == Direction.Up || _direction == Direction.Down, "Invalid direction");
        require(_amount >= MINIMUM_STAKE, "Below minimum stake");
        require(currentRoundId > 0, "No active round");
        
        Round storage round = rounds[currentRoundId];
        require(block.timestamp < round.endTime - 10, "Betting closed (last 10s locked)");
        require(!round.resolved, "Round already resolved");

        // Transfer BLOOM tokens from user to contract
        bloomToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Update pools (for UI odds display only - not used in payout calc)
        if (_direction == Direction.Up) {
            round.totalUpPool += _amount;
        } else {
            round.totalDownPool += _amount;
        }

        // Create bet
        nextBetId++;
        Bet memory newBet = Bet({
            betId: nextBetId,
            roundId: currentRoundId,
            user: msg.sender,
            direction: _direction,
            amount: _amount,
            timestamp: block.timestamp,
            result: BetResult.Pending,
            payout: 0
        });

        roundBets[currentRoundId].push(newBet);
        betsById[nextBetId] = newBet;
        userBetIds[msg.sender].push(nextBetId);

        // Update streak (1 per day regardless of win/lose)
        _updateStreak(msg.sender);

        emit BetPlaced(currentRoundId, nextBetId, msg.sender, _direction, _amount);
    }

    /**
     * @notice Settle a round - INSTANT PAYOUT, no claiming needed!
     * @param _roundId The round to settle
     * @param _endPrice The ETH price at resolution time
     */
    function settleRound(uint256 _roundId, uint256 _endPrice) external onlyOracle roundExists(_roundId) {
        Round storage round = rounds[_roundId];
        require(!round.resolved, "Already resolved");
        require(block.timestamp >= round.endTime, "Round not ended yet");
        require(_endPrice > 0, "Invalid end price");

        round.endPrice = _endPrice;
        
        // Determine result
        if (_endPrice > round.startPrice) {
            round.result = Direction.Up;
        } else if (_endPrice < round.startPrice) {
            round.result = Direction.Down;
        } else {
            // DRAW = LOSS! Contract keeps all funds
            round.result = Direction.None;
        }

        round.resolved = true;

        // Instant settlement - pay all winners immediately
        Bet[] storage bets = roundBets[_roundId];
        uint256 totalPayouts = 0;

        for (uint256 i = 0; i < bets.length; i++) {
            Bet storage bet = bets[i];
            
            // Only winners get paid (draw = loss, losers = nothing)
            if (round.result != Direction.None && bet.direction == round.result) {
                // Fixed 2x payout
                uint256 payout = bet.amount * 2;
                bet.payout = payout;
                bet.result = BetResult.Win;
                
                // Transfer winnings immediately
                bloomToken.safeTransfer(bet.user, payout);
                totalPayouts += payout;
                
                // Update user stats
                userStats[bet.user].totalWins++;
                userStats[bet.user].totalWinnings += bet.amount; // Net profit
            } else {
                // Losers and draws - contract keeps funds
                bet.result = BetResult.Lose;
                bet.payout = 0;
                userStats[bet.user].totalLosses++;
            }
            
            // Update bet in mapping
            betsById[bet.betId] = bet;
            
            // Update general stats
            userStats[bet.user].totalBets++;
            userStats[bet.user].totalStaked += bet.amount;
        }

        emit RoundSettled(_roundId, round.result, _endPrice, totalPayouts);
    }

    // ============ View Functions ============

    /**
     * @notice Check if betting is currently open
     */
    function isBettingOpen() public view returns (bool) {
        if (currentRoundId == 0) return false;
        Round storage round = rounds[currentRoundId];
        // Betting closes 10 seconds before round ends
        return !round.resolved && block.timestamp < round.endTime - 10;
    }

    /**
     * @notice Get time remaining in current round
     */
    function getTimeRemaining() public view returns (uint256) {
        if (currentRoundId == 0) return 0;
        Round storage round = rounds[currentRoundId];
        if (round.resolved || block.timestamp >= round.endTime) return 0;
        return round.endTime - block.timestamp;
    }

    /**
     * @notice Get all bets for a round
     */
    function getRoundBets(uint256 _roundId) external view returns (Bet[] memory) {
        return roundBets[_roundId];
    }

    /**
     * @notice Get user's bet IDs
     */
    function getUserBetIds(address _user) external view returns (uint256[] memory) {
        return userBetIds[_user];
    }

    /**
     * @notice Get a specific bet by ID
     */
    function getBet(uint256 _betId) external view returns (Bet memory) {
        return betsById[_betId];
    }

    /**
     * @notice Get round info
     */
    function getRound(uint256 _roundId) external view returns (Round memory) {
        return rounds[_roundId];
    }

    /**
     * @notice Get current round
     */
    function getCurrentRound() external view returns (Round memory) {
        return rounds[currentRoundId];
    }

    /**
     * @notice Get user stats
     */
    function getUserStats(address _user) external view returns (UserStats memory) {
        return userStats[_user];
    }

    /**
     * @notice Get current pool sizes (for frontend odds display)
     */
    function getCurrentPools() external view returns (uint256 upPool, uint256 downPool) {
        if (currentRoundId == 0) return (0, 0);
        Round storage round = rounds[currentRoundId];
        return (round.totalUpPool, round.totalDownPool);
    }

    /**
     * @notice Get bet count for current round
     */
    function getCurrentRoundBetCount() external view returns (uint256) {
        return roundBets[currentRoundId].length;
    }

    /**
     * @notice Get contract's BLOOM balance (house profits)
     */
    function getHouseBalance() external view returns (uint256) {
        return bloomToken.balanceOf(address(this));
    }

    // ============ Internal Functions ============

    function _updateStreak(address _user) internal {
        uint256 today = block.timestamp / 1 days;
        UserStats storage stats = userStats[_user];
        
        if (stats.lastPlayedDay == today) {
            // Already played today, streak doesn't change
            return;
        } else if (stats.lastPlayedDay == today - 1) {
            // Played yesterday, increment streak
            stats.currentStreak++;
        } else {
            // Missed a day, reset streak to 1
            stats.currentStreak = 1;
        }
        
        stats.lastPlayedDay = today;
        emit StreakUpdated(_user, stats.currentStreak);
    }

    // ============ Admin Functions ============

    function setPriceOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle");
        emit OracleUpdated(priceOracle, _newOracle);
        priceOracle = _newOracle;
    }

    /**
     * @notice Withdraw house profits (losing bets that stay in contract)
     * @param _to Address to send funds to
     * @param _amount Amount to withdraw
     */
    function withdrawHouseProfits(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Invalid address");
        require(_amount <= bloomToken.balanceOf(address(this)), "Insufficient balance");
        bloomToken.safeTransfer(_to, _amount);
    }

    /**
     * @notice Emergency function to cancel a round (no payouts, everyone keeps pending status)
     */
    function emergencyCancelRound(uint256 _roundId) external onlyOwner roundExists(_roundId) {
        Round storage round = rounds[_roundId];
        require(!round.resolved, "Already resolved");
        
        // Refund all bets in this round
        Bet[] storage bets = roundBets[_roundId];
        for (uint256 i = 0; i < bets.length; i++) {
            bloomToken.safeTransfer(bets[i].user, bets[i].amount);
        }
        
        round.resolved = true;
        round.result = Direction.None;
    }
}
