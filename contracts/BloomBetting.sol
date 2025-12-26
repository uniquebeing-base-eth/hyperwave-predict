// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BloomBetting
 * @dev A prediction market contract for ETH price movements using $BLOOM token
 * @notice Users stake BLOOM tokens to predict if ETH price will go UP or DOWN
 */
contract BloomBetting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    IERC20 public immutable bloomToken;
    uint256 public constant MINIMUM_STAKE = 100_000 * 10**18; // 100,000 BLOOM (assuming 18 decimals)
    uint256 public constant BETTING_DURATION = 50 seconds; // 60s total - 10s lock
    uint256 public constant LOCK_DURATION = 10 seconds;
    uint256 public constant RESOLUTION_DURATION = 60 seconds;
    
    // ============ Enums ============
    enum Direction { None, Up, Down }
    enum RoundPhase { Betting, Locked, Resolving, Resolved }
    enum BetResult { Pending, Win, Lose, Draw }

    // ============ Structs ============
    struct Round {
        uint256 roundId;
        uint256 startTime;
        uint256 lockTime;
        uint256 resolutionTime;
        uint256 endTime;
        uint256 startPrice;
        uint256 endPrice;
        uint256 totalUpPool;
        uint256 totalDownPool;
        Direction result;
        bool resolved;
    }

    struct Bet {
        uint256 roundId;
        address user;
        Direction direction;
        uint256 amount;
        uint256 timestamp;
        BetResult result;
        uint256 payout;
        bool claimed;
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
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Bet)) public userBets; // roundId => user => bet
    mapping(address => UserStats) public userStats;
    mapping(address => uint256[]) public userRoundHistory;
    
    uint256 public totalFeesCollected;
    uint256 public feePercentage = 300; // 3% in basis points (300/10000)
    uint256 public constant BASIS_POINTS = 10000;

    address public priceOracle; // Address authorized to submit prices

    // ============ Events ============
    event RoundStarted(uint256 indexed roundId, uint256 startTime, uint256 startPrice);
    event BetPlaced(uint256 indexed roundId, address indexed user, Direction direction, uint256 amount);
    event RoundLocked(uint256 indexed roundId, uint256 lockTime);
    event RoundResolved(uint256 indexed roundId, Direction result, uint256 endPrice);
    event WinningsClaimed(uint256 indexed roundId, address indexed user, uint256 amount);
    event StreakUpdated(address indexed user, uint256 streak);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
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
     * @param _startPrice The ETH price at round start (in wei, 8 decimals from Chainlink)
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
            lockTime: startTime + BETTING_DURATION,
            resolutionTime: startTime + BETTING_DURATION + LOCK_DURATION,
            endTime: startTime + BETTING_DURATION + LOCK_DURATION + RESOLUTION_DURATION,
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
     * @notice Place a bet on the current round
     * @param _direction UP (1) or DOWN (2)
     * @param _amount Amount of BLOOM tokens to stake
     */
    function placeBet(Direction _direction, uint256 _amount) external nonReentrant {
        require(_direction == Direction.Up || _direction == Direction.Down, "Invalid direction");
        require(_amount >= MINIMUM_STAKE, "Below minimum stake");
        require(currentRoundId > 0, "No active round");
        
        Round storage round = rounds[currentRoundId];
        require(block.timestamp < round.lockTime, "Betting closed");
        require(userBets[currentRoundId][msg.sender].amount == 0, "Already bet this round");

        // Transfer BLOOM tokens from user
        bloomToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Update pools
        if (_direction == Direction.Up) {
            round.totalUpPool += _amount;
        } else {
            round.totalDownPool += _amount;
        }

        // Record bet
        userBets[currentRoundId][msg.sender] = Bet({
            roundId: currentRoundId,
            user: msg.sender,
            direction: _direction,
            amount: _amount,
            timestamp: block.timestamp,
            result: BetResult.Pending,
            payout: 0,
            claimed: false
        });

        userRoundHistory[msg.sender].push(currentRoundId);

        // Update streak (1 per day regardless of win/lose)
        _updateStreak(msg.sender);

        emit BetPlaced(currentRoundId, msg.sender, _direction, _amount);
    }

    /**
     * @notice Resolve a round with the final price
     * @param _roundId The round to resolve
     * @param _endPrice The ETH price at resolution time
     */
    function resolveRound(uint256 _roundId, uint256 _endPrice) external onlyOracle roundExists(_roundId) {
        Round storage round = rounds[_roundId];
        require(!round.resolved, "Already resolved");
        require(block.timestamp >= round.resolutionTime, "Too early to resolve");
        require(_endPrice > 0, "Invalid end price");

        round.endPrice = _endPrice;
        
        // Determine result
        if (_endPrice > round.startPrice) {
            round.result = Direction.Up;
        } else if (_endPrice < round.startPrice) {
            round.result = Direction.Down;
        } else {
            round.result = Direction.None; // Draw - price unchanged
        }

        round.resolved = true;

        emit RoundResolved(_roundId, round.result, _endPrice);
    }

    /**
     * @notice Claim winnings from a resolved round
     * @param _roundId The round to claim from
     */
    function claimWinnings(uint256 _roundId) external nonReentrant roundExists(_roundId) {
        Round storage round = rounds[_roundId];
        require(round.resolved, "Round not resolved");
        
        Bet storage bet = userBets[_roundId][msg.sender];
        require(bet.amount > 0, "No bet placed");
        require(!bet.claimed, "Already claimed");

        uint256 payout = 0;
        
        if (round.result == Direction.None) {
            // Draw - return original stake
            payout = bet.amount;
            bet.result = BetResult.Draw;
        } else if (bet.direction == round.result) {
            // Winner - calculate payout
            uint256 totalPool = round.totalUpPool + round.totalDownPool;
            uint256 winningPool = bet.direction == Direction.Up ? round.totalUpPool : round.totalDownPool;
            
            // Calculate proportional winnings
            uint256 grossPayout = (bet.amount * totalPool) / winningPool;
            uint256 fee = (grossPayout * feePercentage) / BASIS_POINTS;
            payout = grossPayout - fee;
            
            totalFeesCollected += fee;
            bet.result = BetResult.Win;
            
            // Update user stats
            userStats[msg.sender].totalWins++;
            userStats[msg.sender].totalWinnings += payout - bet.amount;
        } else {
            // Loser - no payout
            bet.result = BetResult.Lose;
            userStats[msg.sender].totalLosses++;
        }

        bet.payout = payout;
        bet.claimed = true;
        userStats[msg.sender].totalBets++;
        userStats[msg.sender].totalStaked += bet.amount;

        if (payout > 0) {
            bloomToken.safeTransfer(msg.sender, payout);
            emit WinningsClaimed(_roundId, msg.sender, payout);
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get current round phase
     */
    function getCurrentPhase() public view returns (RoundPhase) {
        if (currentRoundId == 0) return RoundPhase.Betting;
        
        Round storage round = rounds[currentRoundId];
        
        if (round.resolved) return RoundPhase.Resolved;
        if (block.timestamp >= round.resolutionTime) return RoundPhase.Resolving;
        if (block.timestamp >= round.lockTime) return RoundPhase.Locked;
        return RoundPhase.Betting;
    }

    /**
     * @notice Get time remaining in current phase
     */
    function getTimeRemaining() public view returns (uint256) {
        if (currentRoundId == 0) return 0;
        
        Round storage round = rounds[currentRoundId];
        RoundPhase phase = getCurrentPhase();

        if (phase == RoundPhase.Betting) {
            return round.lockTime > block.timestamp ? round.lockTime - block.timestamp : 0;
        } else if (phase == RoundPhase.Locked) {
            return round.resolutionTime > block.timestamp ? round.resolutionTime - block.timestamp : 0;
        } else if (phase == RoundPhase.Resolving) {
            return round.endTime > block.timestamp ? round.endTime - block.timestamp : 0;
        }
        return 0;
    }

    /**
     * @notice Get round info
     */
    function getRound(uint256 _roundId) external view returns (Round memory) {
        return rounds[_roundId];
    }

    /**
     * @notice Get user's bet for a round
     */
    function getUserBet(uint256 _roundId, address _user) external view returns (Bet memory) {
        return userBets[_roundId][_user];
    }

    /**
     * @notice Get user stats
     */
    function getUserStats(address _user) external view returns (UserStats memory) {
        return userStats[_user];
    }

    /**
     * @notice Get current pool sizes
     */
    function getCurrentPools() external view returns (uint256 upPool, uint256 downPool) {
        if (currentRoundId == 0) return (0, 0);
        Round storage round = rounds[currentRoundId];
        return (round.totalUpPool, round.totalDownPool);
    }

    /**
     * @notice Calculate potential payout for a bet
     */
    function calculatePotentialPayout(Direction _direction, uint256 _amount) external view returns (uint256) {
        if (currentRoundId == 0) return _amount * 2; // Default 2x
        
        Round storage round = rounds[currentRoundId];
        uint256 totalPool = round.totalUpPool + round.totalDownPool + _amount;
        uint256 winningPool = _direction == Direction.Up 
            ? round.totalUpPool + _amount 
            : round.totalDownPool + _amount;
        
        uint256 grossPayout = (_amount * totalPool) / winningPool;
        uint256 fee = (grossPayout * feePercentage) / BASIS_POINTS;
        return grossPayout - fee;
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

    function setFeePercentage(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        emit FeeUpdated(feePercentage, _newFee);
        feePercentage = _newFee;
    }

    function setPriceOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle");
        emit OracleUpdated(priceOracle, _newOracle);
        priceOracle = _newOracle;
    }

    function withdrawFees(address _to) external onlyOwner {
        require(_to != address(0), "Invalid address");
        uint256 amount = totalFeesCollected;
        totalFeesCollected = 0;
        bloomToken.safeTransfer(_to, amount);
    }

    /**
     * @notice Emergency function to cancel a round and refund all bets
     */
    function emergencyCancelRound(uint256 _roundId) external onlyOwner roundExists(_roundId) {
        Round storage round = rounds[_roundId];
        require(!round.resolved, "Already resolved");
        
        round.resolved = true;
        round.result = Direction.None;
        
        // Users can claim refunds via claimWinnings (will get Draw result)
    }
}
