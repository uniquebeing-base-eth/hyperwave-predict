// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BloomCommentTipping
 * @dev Pull-based tipping for Farcaster comment tips (e.g. reply with "bloom" or 🌸).
 *
 * Flow:
 *   1) User approves this contract for BLOOM once inside the mini app.
 *      bloomToken.approve(BloomCommentTipping, MAX_UINT256)
 *   2) User replies to a cast with the trigger keyword ("bloom" / 🌸 / "$bloom 100").
 *   3) Off-chain webhook (Neynar) parses the reply, resolves recipient wallet,
 *      and the authorized executor calls executeTip(...) which pulls BLOOM from
 *      the tipper's wallet using their pre-approved allowance and forwards to
 *      the recipient — no per-tip signature from the user required.
 *
 * Security:
 *   - Only addresses in `executors` can move user funds.
 *   - Per-cast idempotency: each (tipper, castHash) can be processed only once.
 *   - User can revoke at any time by setting allowance to 0 (standard ERC20).
 *   - Optional per-tx maxTipAmount cap as a guard against backend bugs.
 *   - Owner can pause in emergencies.
 */
contract BloomCommentTipping is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ State ============

    IERC20 public immutable bloomToken;

    /// Authorized backend addresses allowed to execute tips on users' behalf.
    mapping(address => bool) public executors;

    /// Optional per-tip safety cap (0 = no cap). Guard rail, not a feature.
    uint256 public maxTipAmount;

    /// Idempotency: keccak256(tipper, castHash) => already processed.
    mapping(bytes32 => bool) public processedTips;

    struct Tip {
        address from;
        address to;
        uint256 amount;
        uint256 fromFid;
        uint256 toFid;
        bytes32 castHash;
        uint256 timestamp;
    }

    Tip[] public tips;
    mapping(address => uint256[]) public tipsSent;
    mapping(address => uint256[]) public tipsReceived;

    // ============ Events ============

    event TipExecuted(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fromFid,
        uint256 toFid,
        bytes32 indexed castHash,
        address executor,
        uint256 timestamp
    );
    event ExecutorUpdated(address indexed executor, bool allowed);
    event MaxTipAmountUpdated(uint256 newMax);

    // ============ Errors ============

    error NotExecutor();
    error InvalidRecipient();
    error ZeroAmount();
    error AmountExceedsCap();
    error AlreadyProcessed();
    error InsufficientAllowance();
    error InsufficientBalance();
    error EmptyBatch();
    error BatchTooLarge();

    // ============ Modifiers ============

    modifier onlyExecutor() {
        if (!executors[msg.sender]) revert NotExecutor();
        _;
    }

    // ============ Constructor ============

    constructor(address _bloomToken, address _initialExecutor) Ownable(msg.sender) {
        require(_bloomToken != address(0), "Invalid token");
        require(_initialExecutor != address(0), "Invalid executor");
        bloomToken = IERC20(_bloomToken);
        executors[_initialExecutor] = true;
        emit ExecutorUpdated(_initialExecutor, true);
    }

    // ============ Core: Execute Tip ============

    /**
     * @dev Backend pulls `amount` BLOOM from `from` to `to` based on a Farcaster reply.
     * Requires that `from` previously approved this contract.
     */
    function executeTip(
        address from,
        address to,
        uint256 amount,
        uint256 fromFid,
        uint256 toFid,
        bytes32 castHash
    ) external nonReentrant whenNotPaused onlyExecutor {
        _executeTip(from, to, amount, fromFid, toFid, castHash);
    }

    struct TipInput {
        address from;
        address to;
        uint256 amount;
        uint256 fromFid;
        uint256 toFid;
        bytes32 castHash;
    }

    /**
     * @dev Batch process — independent tips, each validated separately.
     * Reverts the entire batch on any failure (deterministic).
     */
    function executeBatch(TipInput[] calldata batch)
        external
        nonReentrant
        whenNotPaused
        onlyExecutor
    {
        uint256 n = batch.length;
        if (n == 0) revert EmptyBatch();
        if (n > 100) revert BatchTooLarge();

        for (uint256 i = 0; i < n; i++) {
            TipInput calldata t = batch[i];
            _executeTip(t.from, t.to, t.amount, t.fromFid, t.toFid, t.castHash);
        }
    }

    function _executeTip(
        address from,
        address to,
        uint256 amount,
        uint256 fromFid,
        uint256 toFid,
        bytes32 castHash
    ) internal {
        if (from == address(0) || to == address(0) || from == to) revert InvalidRecipient();
        if (amount == 0) revert ZeroAmount();
        if (maxTipAmount != 0 && amount > maxTipAmount) revert AmountExceedsCap();

        bytes32 key = keccak256(abi.encodePacked(from, castHash));
        if (processedTips[key]) revert AlreadyProcessed();

        if (bloomToken.allowance(from, address(this)) < amount) revert InsufficientAllowance();
        if (bloomToken.balanceOf(from) < amount) revert InsufficientBalance();

        // CEI: mark before transfer
        processedTips[key] = true;

        uint256 idx = tips.length;
        tips.push(Tip({
            from: from,
            to: to,
            amount: amount,
            fromFid: fromFid,
            toFid: toFid,
            castHash: castHash,
            timestamp: block.timestamp
        }));
        tipsSent[from].push(idx);
        tipsReceived[to].push(idx);

        bloomToken.safeTransferFrom(from, to, amount);

        emit TipExecuted(from, to, amount, fromFid, toFid, castHash, msg.sender, block.timestamp);
    }

    // ============ Views ============

    function getTipCount() external view returns (uint256) {
        return tips.length;
    }

    function getAllowance(address user) external view returns (uint256) {
        return bloomToken.allowance(user, address(this));
    }

    function isProcessed(address from, bytes32 castHash) external view returns (bool) {
        return processedTips[keccak256(abi.encodePacked(from, castHash))];
    }

    function getTipsSent(address user, uint256 offset, uint256 limit)
        external view returns (Tip[] memory)
    {
        return _slice(tipsSent[user], offset, limit);
    }

    function getTipsReceived(address user, uint256 offset, uint256 limit)
        external view returns (Tip[] memory)
    {
        return _slice(tipsReceived[user], offset, limit);
    }

    function _slice(uint256[] storage indices, uint256 offset, uint256 limit)
        internal view returns (Tip[] memory)
    {
        uint256 total = indices.length;
        if (offset >= total) return new Tip[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        Tip[] memory out = new Tip[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = tips[indices[i]];
        }
        return out;
    }

    // ============ Admin ============

    function setExecutor(address executor, bool allowed) external onlyOwner {
        require(executor != address(0), "Invalid executor");
        executors[executor] = allowed;
        emit ExecutorUpdated(executor, allowed);
    }

    function setMaxTipAmount(uint256 newMax) external onlyOwner {
        maxTipAmount = newMax;
        emit MaxTipAmountUpdated(newMax);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// Recover non-BLOOM tokens accidentally sent here.
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(bloomToken), "Cannot recover BLOOM");
        IERC20(token).safeTransfer(owner(), amount);
    }
}
