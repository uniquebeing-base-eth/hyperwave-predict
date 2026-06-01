// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BloomBettingV2 (Multi-Asset, Multi-Token Edition)
 * @author Bloom Finance
 * @notice Prediction betting game with continuous 60-second rounds.
 *         Supports multiple price assets (ETH, BTC, SOL, …) and multiple
 *         stake tokens (BLOOM, USDC, DEGEN, …) inside the SAME round timeline.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  RULES (unchanged vs V1)
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Continuous 60s rounds. Betting closes 10s before end.
 *  • One bet per (user, round, asset, token). A user CAN diversify across
 *    different (asset, token) pairs within the same round.
 *  • Fixed 2x payout for winners. Draws = loss. House keeps loser stakes.
 *  • Oracle backend submits start/end prices for every whitelisted asset.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  KEY DIFFERENCES vs V1
 * ─────────────────────────────────────────────────────────────────────────────
 *  • Multi-asset: bytes32 assetId (e.g. keccak256("ETH"), "BTC", "SOL").
 *    Each asset has its own start/end price per round and its own result.
 *  • Multi-token: address stakeToken whitelisted by owner with per-token
 *    minimumStake. Pools, payouts and solvency checks are per-token.
 *  • Round liquidity is isolated per stakeToken — USDC bettors cannot drain
 *    the BLOOM house and vice-versa.
 *  • Owner can whitelist/blacklist assets and tokens at any time.
 */
contract BloomBettingV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 public constant ROUND_DURATION = 60;
    uint256 public constant BETTING_CUTOFF = 10;
    uint256 public constant PAYOUT_MULTIPLIER = 2;

    // ============ Enums ============
    enum Direction { None, Up, Down }
    enum BetResult { Pending, Win, Lose }

    // ============ Structs ============
    struct AssetConfig {
        bool enabled;
        string symbol;          // "ETH", "BTC", "SOL"
        uint8 priceDecimals;    // typically 8 (Chainlink)
    }

    struct TokenConfig {
        bool enabled;
        uint256 minimumStake;   // in token's smallest unit
    }

    struct AssetRoundData {
        uint256 startPrice;
        uint256 endPrice;
        Direction result;
        bool resolved;
    }

    struct Round {
        uint256 roundId;
        uint256 startTime;
        uint256 endTime;
        bool started;
    }

    struct Bet {
        uint256 betId;
        uint256 roundId;
        bytes32 assetId;
        address stakeToken;
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
        uint256 currentStreak;
        uint256 lastPlayedDay;
    }

    // ============ State ============
    uint256 public currentRoundId;
    uint256 public nextBetId;
    bool public paused;
    address public priceOracle;

    // Whitelists
    bytes32[] public assetList;
    address[] public tokenList;
    mapping(bytes32 => AssetConfig) public assets;       // assetId => config
    mapping(address => TokenConfig) public tokens;       // token   => config

    // Rounds
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(bytes32 => AssetRoundData)) public assetRound; // roundId => assetId => data

    // Pools per (round, asset, token, direction) for UI odds + payout calc
    mapping(uint256 => mapping(bytes32 => mapping(address => uint256))) public upPool;
    mapping(uint256 => mapping(bytes32 => mapping(address => uint256))) public downPool;

    // Bets
    mapping(uint256 => Bet) public betsById;
    mapping(uint256 => uint256[]) public roundBetIds;
    mapping(address => uint256[]) public userBetIds;

    // One bet per (round, asset, token) per user
    mapping(uint256 => mapping(bytes32 => mapping(address => mapping(address => bool))))
        public hasUserBet; // roundId => assetId => token => user => bool

    // Stats
    mapping(address => UserStats) public userStats;

    // ============ Events ============
    event AssetWhitelisted(bytes32 indexed assetId, string symbol, uint8 priceDecimals);
    event AssetDisabled(bytes32 indexed assetId);
    event TokenWhitelisted(address indexed token, uint256 minimumStake);
    event TokenMinimumUpdated(address indexed token, uint256 newMinimum);
    event TokenDisabled(address indexed token);

    event RoundStarted(uint256 indexed roundId, uint256 startTime);
    event AssetPriceOpened(uint256 indexed roundId, bytes32 indexed assetId, uint256 startPrice);
    event AssetSettled(
        uint256 indexed roundId,
        bytes32 indexed assetId,
        Direction result,
        uint256 endPrice
    );

    event BetPlaced(
        uint256 indexed roundId,
        uint256 indexed betId,
        address indexed user,
        bytes32 assetId,
        address stakeToken,
        Direction direction,
        uint256 amount
    );

    event StreakUpdated(address indexed user, uint256 streak);
    event OracleUpdated(address oldOracle, address newOracle);
    event Paused(bool isPaused);
    event HouseWithdrawn(address indexed token, address indexed to, uint256 amount);

    // ============ Modifiers ============
    modifier onlyOracle() {
        require(msg.sender == priceOracle || msg.sender == owner(), "Not oracle");
        _;
    }
    modifier notPaused() {
        require(!paused, "Paused");
        _;
    }

    // ============ Constructor ============
    constructor(address _priceOracle) Ownable(msg.sender) {
        priceOracle = _priceOracle;
    }

    // ============ Admin: assets ============
    function whitelistAsset(string calldata _symbol, uint8 _priceDecimals) external onlyOwner {
        bytes32 id = keccak256(bytes(_symbol));
        if (!assets[id].enabled && bytes(assets[id].symbol).length == 0) {
            assetList.push(id);
        }
        assets[id] = AssetConfig({ enabled: true, symbol: _symbol, priceDecimals: _priceDecimals });
        emit AssetWhitelisted(id, _symbol, _priceDecimals);
    }

    function disableAsset(bytes32 _assetId) external onlyOwner {
        assets[_assetId].enabled = false;
        emit AssetDisabled(_assetId);
    }

    // ============ Admin: tokens ============
    function whitelistToken(address _token, uint256 _minimumStake) external onlyOwner {
        require(_token != address(0), "Bad token");
        if (!tokens[_token].enabled && tokens[_token].minimumStake == 0) {
            tokenList.push(_token);
        }
        tokens[_token] = TokenConfig({ enabled: true, minimumStake: _minimumStake });
        emit TokenWhitelisted(_token, _minimumStake);
    }

    function setTokenMinimum(address _token, uint256 _minimumStake) external onlyOwner {
        require(tokens[_token].enabled, "Token not enabled");
        tokens[_token].minimumStake = _minimumStake;
        emit TokenMinimumUpdated(_token, _minimumStake);
    }

    function disableToken(address _token) external onlyOwner {
        tokens[_token].enabled = false;
        emit TokenDisabled(_token);
    }

    // ============ Admin: misc ============
    function setOracle(address _oracle) external onlyOwner {
        emit OracleUpdated(priceOracle, _oracle);
        priceOracle = _oracle;
    }

    function setPaused(bool _p) external onlyOwner {
        paused = _p;
        emit Paused(_p);
    }

    /// @notice Withdraw house liquidity/profits for a specific token.
    function withdrawHouse(address _token, address _to, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(_to, _amount);
        emit HouseWithdrawn(_token, _to, _amount);
    }

    // ============ Oracle: rounds ============

    /// @notice Start a new round. Asset start prices are submitted separately.
    function startRound() external onlyOracle notPaused {
        // Previous round must have all enabled assets resolved? We relax that:
        // operator is trusted to settle before starting a new round.
        currentRoundId++;
        uint256 startTime = block.timestamp;
        rounds[currentRoundId] = Round({
            roundId: currentRoundId,
            startTime: startTime,
            endTime: startTime + ROUND_DURATION,
            started: true
        });
        emit RoundStarted(currentRoundId, startTime);
    }

    /// @notice Submit the open price for an asset in a round (one-shot).
    function openAssetPrice(
        uint256 _roundId,
        bytes32 _assetId,
        uint256 _startPrice
    ) external onlyOracle notPaused {
        require(rounds[_roundId].started, "Round not started");
        require(assets[_assetId].enabled, "Asset disabled");
        require(_startPrice > 0, "Bad price");
        AssetRoundData storage ar = assetRound[_roundId][_assetId];
        require(ar.startPrice == 0, "Already opened");
        ar.startPrice = _startPrice;
        emit AssetPriceOpened(_roundId, _assetId, _startPrice);
    }

    /// @notice Settle one asset within a round. Pays out winners across ALL
    ///         whitelisted stake tokens for that asset.
    function settleAsset(
        uint256 _roundId,
        bytes32 _assetId,
        uint256 _endPrice
    ) external onlyOracle notPaused nonReentrant {
        Round storage r = rounds[_roundId];
        require(r.started, "Round not started");
        require(block.timestamp >= r.endTime, "Round not ended");

        AssetRoundData storage ar = assetRound[_roundId][_assetId];
        require(ar.startPrice > 0, "Asset never opened");
        require(!ar.resolved, "Asset already resolved");
        require(_endPrice > 0, "Bad price");

        ar.endPrice = _endPrice;
        if (_endPrice > ar.startPrice) ar.result = Direction.Up;
        else if (_endPrice < ar.startPrice) ar.result = Direction.Down;
        else ar.result = Direction.None;
        ar.resolved = true;

        // Solvency check per token, then payout pass.
        _settleAssetBets(_roundId, _assetId, ar.result);

        emit AssetSettled(_roundId, _assetId, ar.result, _endPrice);
    }

    function _settleAssetBets(
        uint256 _roundId,
        bytes32 _assetId,
        Direction _result
    ) internal {
        uint256[] storage ids = roundBetIds[_roundId];

        // Per-token required payout
        // We use a small in-memory map via parallel arrays; tokenList is bounded by owner.
        uint256 tlen = tokenList.length;
        uint256[] memory required = new uint256[](tlen);

        // Pass 1: tally required payouts per token
        for (uint256 i = 0; i < ids.length; i++) {
            Bet storage b = betsById[ids[i]];
            if (b.assetId != _assetId) continue;
            if (b.result != BetResult.Pending) continue;
            if (_result != Direction.None && b.direction == _result) {
                uint256 idx = _tokenIndex(b.stakeToken);
                required[idx] += b.amount * PAYOUT_MULTIPLIER;
            }
        }

        // Solvency check per token
        for (uint256 t = 0; t < tlen; t++) {
            if (required[t] == 0) continue;
            require(
                IERC20(tokenList[t]).balanceOf(address(this)) >= required[t],
                "House illiquid"
            );
        }

        // Pass 2: pay winners + mark losers
        for (uint256 i = 0; i < ids.length; i++) {
            Bet storage b = betsById[ids[i]];
            if (b.assetId != _assetId) continue;
            if (b.result != BetResult.Pending) continue;

            if (_result != Direction.None && b.direction == _result) {
                uint256 payout = b.amount * PAYOUT_MULTIPLIER;
                b.payout = payout;
                b.result = BetResult.Win;
                IERC20(b.stakeToken).safeTransfer(b.user, payout);
                userStats[b.user].totalWins++;
            } else {
                b.result = BetResult.Lose;
                userStats[b.user].totalLosses++;
            }
        }
    }

    function _tokenIndex(address _token) internal view returns (uint256) {
        uint256 tlen = tokenList.length;
        for (uint256 i = 0; i < tlen; i++) {
            if (tokenList[i] == _token) return i;
        }
        revert("Token not listed");
    }

    // ============ User: betting ============

    /// @notice Place a bet on (asset, token, direction) for the current round.
    function placeBet(
        bytes32 _assetId,
        address _stakeToken,
        Direction _direction,
        uint256 _amount
    ) external nonReentrant notPaused {
        require(_direction == Direction.Up || _direction == Direction.Down, "Bad direction");
        require(currentRoundId > 0, "No round");

        Round storage r = rounds[currentRoundId];
        require(block.timestamp < r.endTime - BETTING_CUTOFF, "Betting closed");

        AssetConfig storage a = assets[_assetId];
        require(a.enabled, "Asset disabled");

        AssetRoundData storage ar = assetRound[currentRoundId][_assetId];
        require(ar.startPrice > 0, "Asset not opened");
        require(!ar.resolved, "Asset resolved");

        TokenConfig storage t = tokens[_stakeToken];
        require(t.enabled, "Token disabled");
        require(_amount >= t.minimumStake, "Below minimum");

        require(
            !hasUserBet[currentRoundId][_assetId][_stakeToken][msg.sender],
            "Already bet"
        );
        hasUserBet[currentRoundId][_assetId][_stakeToken][msg.sender] = true;

        IERC20(_stakeToken).safeTransferFrom(msg.sender, address(this), _amount);

        if (_direction == Direction.Up) {
            upPool[currentRoundId][_assetId][_stakeToken] += _amount;
        } else {
            downPool[currentRoundId][_assetId][_stakeToken] += _amount;
        }

        nextBetId++;
        betsById[nextBetId] = Bet({
            betId: nextBetId,
            roundId: currentRoundId,
            assetId: _assetId,
            stakeToken: _stakeToken,
            user: msg.sender,
            direction: _direction,
            amount: _amount,
            timestamp: block.timestamp,
            result: BetResult.Pending,
            payout: 0
        });
        roundBetIds[currentRoundId].push(nextBetId);
        userBetIds[msg.sender].push(nextBetId);

        userStats[msg.sender].totalBets++;
        _updateStreak(msg.sender);

        emit BetPlaced(
            currentRoundId,
            nextBetId,
            msg.sender,
            _assetId,
            _stakeToken,
            _direction,
            _amount
        );
    }

    function _updateStreak(address _user) internal {
        UserStats storage s = userStats[_user];
        uint256 today = block.timestamp / 1 days;
        if (s.lastPlayedDay == today) {
            // already counted today
        } else if (s.lastPlayedDay + 1 == today) {
            s.currentStreak++;
        } else {
            s.currentStreak = 1;
        }
        s.lastPlayedDay = today;
        emit StreakUpdated(_user, s.currentStreak);
    }

    // ============ Views ============

    function isBettingOpen() external view returns (bool) {
        if (currentRoundId == 0 || paused) return false;
        Round storage r = rounds[currentRoundId];
        return block.timestamp < r.endTime - BETTING_CUTOFF;
    }

    function getTimeRemaining() external view returns (uint256) {
        if (currentRoundId == 0) return 0;
        Round storage r = rounds[currentRoundId];
        if (block.timestamp >= r.endTime) return 0;
        return r.endTime - block.timestamp;
    }

    function getAssetList() external view returns (bytes32[] memory) {
        return assetList;
    }

    function getTokenList() external view returns (address[] memory) {
        return tokenList;
    }

    function getAssetRound(uint256 _roundId, bytes32 _assetId)
        external
        view
        returns (AssetRoundData memory)
    {
        return assetRound[_roundId][_assetId];
    }

    function getPools(uint256 _roundId, bytes32 _assetId, address _token)
        external
        view
        returns (uint256 up, uint256 down)
    {
        return (upPool[_roundId][_assetId][_token], downPool[_roundId][_assetId][_token]);
    }

    function getRoundBetIds(uint256 _roundId) external view returns (uint256[] memory) {
        return roundBetIds[_roundId];
    }

    function getUserBetIds(address _user) external view returns (uint256[] memory) {
        return userBetIds[_user];
    }

    function getBet(uint256 _betId) external view returns (Bet memory) {
        return betsById[_betId];
    }

    function hasBet(
        uint256 _roundId,
        bytes32 _assetId,
        address _token,
        address _user
    ) external view returns (bool) {
        return hasUserBet[_roundId][_assetId][_token][_user];
    }
}
