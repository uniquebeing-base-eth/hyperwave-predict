
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BloomBetting (Hyperwave Edition)
 * @author Bloom Finance
 * @notice Prediction betting game with continuous 60-second rounds
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 *                              CORE GAME RULES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * • Continuous 60-second rounds
 * • Each round has: start price + end price (ETH/USD)
 * • Users can place bets EVERY round
 * • ONE bet per user per round
 * • Bet direction: UP or DOWN
 * • Users cannot place multiple bets in the same round
 * • Betting closes 10 seconds before round ends
 * • Fixed 2x payout for winners
 * • Draws are treated as losses
 * • All losing bets go to the contract (house)
 * • Winners are settled IMMEDIATELY after round ends
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 *                              PAYOUT LOGIC
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * • If price goes UP → UP bettors win
 * • If price goes DOWN → DOWN bettors win
 * • If price is unchanged (draw) → EVERYONE loses
 * • Winners receive exactly 2× their stake
 * • Contract must check solvency before payouts
 * • House keeps all losing and draw funds
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 *                              ORACLE SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * • Uses Chainlink ETH/USD price feed (8 decimals)
 * • Oracle backend workflow:
 *   1. Reads current price from Chainlink
 *   2. Calls startRound(startPrice) to begin new round
 *   3. After 60 seconds, reads Chainlink again
 *   4. Calls settleRound(roundId, endPrice) to resolve
 * • Oracle address is updatable by owner
 * • Start price and end price can only be set ONCE per round
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 *                              USER STATS TRACKED
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * • Total bets placed
 * • Total wins / losses
 * • Total amount staked
 * • Net profits (from winning bets)
 * • Daily play streak
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 *                              ADMIN FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * • Emergency cancel: refunds all users, marks round as resolved
 * • Owner can withdraw house profits
 * • Pausable contract (stops betting and settlement)
 * • Configurable minimum stake
 * • Reentrancy protected
 * 
 */
contract BloomBetting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    IERC20 public immutable bloomToken;
    uint256 public constant ROUND_DURATION = 60; // 60-second rounds
    uint256 public constant BETTING_CUTOFF = 10; // Betting closes 10 seconds before round ends
    uint256 public constant HOUSE_EDGE_BP = 0; // 0% house edge (basis points) - future-proofing
    uint256 public constant PAYOUT_MULTIPLIER = 2; // Fixed 2x payout
    
    // ============ Configurable Parameters ============
    uint256 public minimumStake = 100_000 * 10**18; // 100,000 BLOOM (18 decimals) - configurable
    
    // ============ Enums ============
    enum Direction { None, Up, Down }
    enum BetResult { Pending, Win, Lose }

    // ============ Structs ============
    struct Round {
        uint256 roundId;
        uint256 startTime;
        uint256 endTime;
        uint256 startPrice;     // ETH/USD price at round start (8 decimals from Chainlink)
        uint256 endPrice;       // ETH/USD price at round end (8 decimals from Chainlink)
        uint256 totalUpPool;    // Total staked on UP (for UI odds display)
        uint256 totalDownPool;  // Total staked on DOWN (for UI odds display)
        Direction result;       // Final result: Up, Down, or None (draw)
        bool resolved;          // Whether round has been settled
    }

    struct Bet {
        uint256 betId;
        uint256 roundId;
        address user;
        Direction direction;    // UP or DOWN
        uint256 amount;         // Stake amount
        uint256 timestamp;      // When bet was placed
        BetResult result;       // Win, Lose, or Pending
        uint256 payout;         // Amount paid out (0 for losses, 2x for wins)
    }

    struct UserStats {
        uint256 totalBets;
        uint256 totalWins;
        uint256 totalLosses;
        uint256 totalStaked;
        uint256 totalProfits;   // Net profit from winning bets (stake amount, not payout)
        uint256 currentStreak;  // Daily play streak
        uint256 lastPlayedDay;  // Last day user played (for streak tracking)
    }

    // ============ State Variables ============
    uint256 public currentRoundId;
    uint256 public nextBetId;
    bool public paused;
    
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => uint256[]) public roundBetIds;           // roundId => bet IDs (single source of truth)
    mapping(address => uint256[]) public userBetIds;            // user => their bet IDs across all rounds
    mapping(uint256 => Bet) public betsById;                    // betId => Bet (primary storage)
    mapping(address => UserStats) public userStats;
    
    // One bet per user per round tracking
    mapping(uint256 => mapping(address => bool)) public hasUserBetInRound;

    address public priceOracle;

    // ============ Events ============
    event RoundStarted(uint256 indexed roundId, uint256 startTime, uint256 startPrice);
    event BetPlaced(uint256 indexed roundId, uint256 indexed betId, address indexed user, Direction direction, uint256 amount);
    event RoundSettled(uint256 indexed roundId, Direction result, uint256 endPrice, uint256 totalPayouts);
    event RoundCancelled(uint256 indexed roundId, uint256 totalRefunded);
    event StreakUpdated(address indexed user, uint256 streak);
    event OracleUpdated(address oldOracle, address newOracle);
    event MinimumStakeUpdated(uint256 oldMinimum, uint256 newMinimum);
    event Paused(bool isPaused);
    event HouseProfitsWithdrawn(address indexed to, uint256 amount);

    // ============ Modifiers ============
    modifier onlyOracle() {
        require(msg.sender == priceOracle || msg.sender == owner(), "Not authorized oracle");
        _;
    }

    modifier roundExists(uint256 _roundId) {
        require(rounds[_roundId].startTime > 0, "Round does not exist");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // ============ Constructor ============
    /**
     * @notice Deploy the Hyperwave betting contract
     * @param _bloomToken Address of the BLOOM ERC20 token
     * @param _priceOracle Address of the oracle that provides Chainlink prices
     */
    constructor(address _bloomToken, address _priceOracle) Ownable(msg.sender) {
        require(_bloomToken != address(0), "Invalid token address");
        bloomToken = IERC20(_bloomToken);
        priceOracle = _priceOracle;
    }

    // ============ External Functions ============

    /**
     * @notice Start a new betting round
     * @param _startPrice The ETH/USD price at round start (8 decimals from Chainlink)
     * @dev 
     * - Oracle backend reads Chainlink price offchain
     * - Calls this function with the price
     * - Start price can only be set ONCE per round
     * - Previous round must be resolved before starting new one
     */
    function startRound(uint256 _startPrice) external onlyOracle notPaused {
        require(_startPrice > 0, "Invalid start price");
        
        // If there's an active round, ensure it's resolved
        if (currentRoundId > 0) {
            require(rounds[currentRoundId].resolved, "Previous round not resolved");
        }

        currentRoundId++;
        uint256 startTime = block.timestamp;
        
        // Oracle safety: start price can only be set once (it's 0 for new rounds)
        require(rounds[currentRoundId].startPrice == 0, "Start price already set");
        
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
     * @notice Place a bet on the current round
     * @param _direction UP (1) or DOWN (2)
     * @param _amount Amount of BLOOM tokens to stake
     * @dev 
     * - Users can bet EVERY round
     * - But only ONE bet per user per round
     * - Betting closes 10 seconds before round ends
     */
    function placeBet(Direction _direction, uint256 _amount) external nonReentrant notPaused {
        require(_direction == Direction.Up || _direction == Direction.Down, "Invalid direction");
        require(_amount >= minimumStake, "Below minimum stake");
        require(currentRoundId > 0, "No active round");
        
        Round storage round = rounds[currentRoundId];
        require(block.timestamp < round.endTime - BETTING_CUTOFF, "Betting closed (last 10s locked)");
        require(!round.resolved, "Round already resolved");
        
        // CRITICAL: One bet per user per round
        require(!hasUserBetInRound[currentRoundId][msg.sender], "Already bet in this round");
        hasUserBetInRound[currentRoundId][msg.sender] = true;

        // Transfer BLOOM tokens from user to contract
        bloomToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Update pools (for UI odds display only - not used in payout calculation)
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

        // Single source of truth: store in betsById, reference by ID in roundBetIds
        betsById[nextBetId] = newBet;
        roundBetIds[currentRoundId].push(nextBetId);
        userBetIds[msg.sender].push(nextBetId);

        // Update daily streak
        _updateStreak(msg.sender);

        emit BetPlaced(currentRoundId, nextBetId, msg.sender, _direction, _amount);
    }

    /**
     * @notice Settle a round - INSTANT PAYOUT
     * @param _roundId The round to settle
     * @param _endPrice The ETH/USD price at round end (8 decimals from Chainlink)
     * @dev 
     * - Oracle backend reads Chainlink price after 60s
     * - Calls this function with the end price
     * - End price can only be set ONCE per round
     * - Solvency check ensures contract can cover all payouts
     * - Winners are paid IMMEDIATELY
     * - Draws = losses (contract keeps all funds)
     */
    function settleRound(uint256 _roundId, uint256 _endPrice) external onlyOracle notPaused roundExists(_roundId) {
        Round storage round = rounds[_roundId];
        require(!round.resolved, "Already resolved");
        require(block.timestamp >= round.endTime, "Round not ended yet");
        require(_endPrice > 0, "Invalid end price");
        
        // Oracle safety: end price can only be set ONCE
        require(round.endPrice == 0, "End price already set");

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

        // Calculate total required payout before settling
        uint256[] storage betIds = roundBetIds[_roundId];
        uint256 totalRequiredPayout = 0;
        
        // First pass: calculate required payout
        for (uint256 i = 0; i < betIds.length; i++) {
            Bet storage bet = betsById[betIds[i]];
            if (round.result != Direction.None && bet.direction == round.result) {
                totalRequiredPayout += bet.amount * PAYOUT_MULTIPLIER;
            }
        }
        
        // SOLVENCY CHECK: ensure contract can cover all payouts
        uint256 contractBalance = bloomToken.balanceOf(address(this));
        require(contractBalance >= totalRequiredPayout, "House insufficient liquidity");

        round.resolved = true;

        // Second pass: settle all bets and pay winners INSTANTLY
        uint256 totalPayouts = 0;

        for (uint256 i = 0; i < betIds.length; i++) {
            Bet storage bet = betsById[betIds[i]];
            
            // Only winners get paid (draw = loss, losers = nothing)
            if (round.result != Direction.None && bet.direction == round.result) {
                // Fixed 2x payout
                uint256 payout = bet.amount * PAYOUT_MULTIPLIER;
                bet.payout = payout;
                bet.result = BetResult.Win;
                
                // Transfer winnings IMMEDIATELY
                bloomToken.safeTransfer(bet.user, payout);
                totalPayouts += payout;
                
                // Update user stats
                userStats[bet.user].totalWins++;
                userStats[bet.user].totalProfits += bet.amount; // Net profit (stake amount)
            } else {
                // Losers and draws - contract keeps funds
                bet.result = BetResult.Lose;
                bet.payout = 0;
                userStats[bet.user].totalLosses++;
            }
            
            // Update general stats
            userStats[bet.user].totalBets++;
            userStats[bet.user].totalStaked += bet.amount;
        }

        emit RoundSettled(_roundId, round.result, _endPrice, totalPayouts);
    }

    // ============ View Functions ============

    /**
     * @notice Check if betting is currently open
     * @return True if betting is open for current round
     */
    function isBettingOpen() public view returns (bool) {
        if (currentRoundId == 0 || paused) return false;
        Round storage round = rounds[currentRoundId];
        return !round.resolved && block.timestamp < round.endTime - BETTING_CUTOFF;
    }

    /**
     * @notice Get time remaining in current round
     * @return Seconds remaining until round ends
     */
    function getTimeRemaining() public view returns (uint256) {
        if (currentRoundId == 0) return 0;
        Round storage round = rounds[currentRoundId];
        if (round.resolved || block.timestamp >= round.endTime) return 0;
        return round.endTime - block.timestamp;
    }

    /**
     * @notice Get all bet IDs for a round
     */
    function getRoundBetIds(uint256 _roundId) external view returns (uint256[] memory) {
        return roundBetIds[_roundId];
    }

    /**
     * @notice Get all bets for a round
     */
    function getRoundBets(uint256 _roundId) external view returns (Bet[] memory) {
        uint256[] storage betIds = roundBetIds[_roundId];
        Bet[] memory bets = new Bet[](betIds.length);
        for (uint256 i = 0; i < betIds.length; i++) {
            bets[i] = betsById[betIds[i]];
        }
        return bets;
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
        return roundBetIds[currentRoundId].length;
    }

    /**
     * @notice Get contract's BLOOM balance (house funds + active bets)
     */
    function getHouseBalance() external view returns (uint256) {
        return bloomToken.balanceOf(address(this));
    }

    /**
     * @notice Check if user has already bet in current round
     * @param _user User address to check
     * @return True if user has already placed a bet this round
     */
    function hasUserBetThisRound(address _user) external view returns (bool) {
        return hasUserBetInRound[currentRoundId][_user];
    }

    // ============ Internal Functions ============

    /**
     * @notice Update user's daily play streak
     * @param _user User address
     * @dev Streak increments when playing on consecutive days
     */
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

    /**
     * @notice Pause or unpause the contract
     * @param _paused True to pause, false to unpause
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    /**
     * @notice Update the price oracle address
     * @param _newOracle New oracle address
     */
    function setPriceOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle");
        emit OracleUpdated(priceOracle, _newOracle);
        priceOracle = _newOracle;
    }

    /**
     * @notice Update the minimum stake amount
     * @param _newMinimum New minimum stake in BLOOM tokens (with 18 decimals)
     */
    function setMinimumStake(uint256 _newMinimum) external onlyOwner {
        require(_newMinimum > 0, "Minimum must be greater than 0");
        emit MinimumStakeUpdated(minimumStake, _newMinimum);
        minimumStake = _newMinimum;
    }

    /**
     * @notice Withdraw house profits
     * @param _to Address to send funds to
     * @param _amount Amount to withdraw
     */
    function withdrawHouseProfits(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Invalid address");
        require(_amount <= bloomToken.balanceOf(address(this)), "Insufficient balance");
        bloomToken.safeTransfer(_to, _amount);
        emit HouseProfitsWithdrawn(_to, _amount);
    }

    /**
     * @notice Emergency cancel a round and refund all bets
     * @param _roundId The round to cancel
     * @dev 
     * - Refunds all users their stake
     * - Does NOT count as win or loss in stats
     * - Round is marked as resolved with None result
     * - Note: Stats are not incremented during emergency cancel
     */
    function emergencyCancelRound(uint256 _roundId) external onlyOwner roundExists(_roundId) {
        Round storage round = rounds[_roundId];
        require(!round.resolved, "Already resolved");
        
        uint256 totalRefunded = 0;
        
        // Refund all bets in this round
        uint256[] storage betIds = roundBetIds[_roundId];
        for (uint256 i = 0; i < betIds.length; i++) {
            Bet storage bet = betsById[betIds[i]];
            
            // Update bet state: cancelled rounds are refunded
            // We mark as Lose but with payout = amount (full refund)
            // This distinguishes from actual losses where payout = 0
            bet.result = BetResult.Lose;
            bet.payout = bet.amount;
            
            // Transfer refund
            bloomToken.safeTransfer(bet.user, bet.amount);
            totalRefunded += bet.amount;
            
            // Note: We do NOT update totalBets/totalLosses for cancelled rounds
            // This is intentional - cancelled rounds don't count
        }
        
        round.resolved = true;
        round.result = Direction.None;
        
        emit RoundCancelled(_roundId, totalRefunded);
    }
}
