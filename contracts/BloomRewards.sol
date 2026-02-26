// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BloomRewards
 * @notice Phase vault for $BLOOM reward claims. Users accumulate rewards across
 *         phases and claim anytime. Eligibility is verified via an oracle signature.
 *
 * Flow:
 *  1. Backend tracks each user's cumulative earned $BLOOM.
 *  2. When a user wants to claim, backend signs (user, cumulativeAmount, nonce).
 *  3. User submits the signature to `claim()`.
 *  4. Contract transfers (cumulativeAmount - alreadyClaimed) from the vault.
 */
contract BloomRewards is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ── State ──────────────────────────────────────────────────────────

    IERC20 public immutable bloomToken;
    address public oracleSigner;

    /// @notice Total amount already claimed by each user (cumulative).
    mapping(address => uint256) public claimed;

    /// @notice Nonces to prevent replay (each claim uses a unique nonce).
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    // ── Events ─────────────────────────────────────────────────────────

    event Claimed(address indexed user, uint256 amount, uint256 nonce);
    event OracleSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event VaultFunded(address indexed funder, uint256 amount);
    event VaultWithdrawn(address indexed to, uint256 amount);

    // ── Errors ─────────────────────────────────────────────────────────

    error InvalidSignature();
    error NonceAlreadyUsed();
    error NothingToClaim();
    error ZeroAddress();

    // ── Constructor ────────────────────────────────────────────────────

    constructor(address _bloomToken, address _oracleSigner) Ownable(msg.sender) {
        if (_bloomToken == address(0) || _oracleSigner == address(0)) revert ZeroAddress();
        bloomToken = IERC20(_bloomToken);
        oracleSigner = _oracleSigner;
    }

    // ── User Functions ─────────────────────────────────────────────────

    /**
     * @notice Claim accumulated $BLOOM rewards.
     * @param cumulativeAmount Total lifetime earned amount (not the delta).
     * @param nonce            Unique nonce for this claim (prevents replay).
     * @param signature        Oracle signature over (user, cumulativeAmount, nonce, chainId, contract).
     */
    function claim(
        uint256 cumulativeAmount,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant {
        if (usedNonces[msg.sender][nonce]) revert NonceAlreadyUsed();

        // Verify oracle signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, cumulativeAmount, nonce, block.chainid, address(this))
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(signature);
        if (recovered != oracleSigner) revert InvalidSignature();

        // Calculate claimable delta
        uint256 alreadyClaimed = claimed[msg.sender];
        if (cumulativeAmount <= alreadyClaimed) revert NothingToClaim();
        uint256 payout = cumulativeAmount - alreadyClaimed;

        // Update state before transfer
        claimed[msg.sender] = cumulativeAmount;
        usedNonces[msg.sender][nonce] = true;

        // Transfer
        bloomToken.safeTransfer(msg.sender, payout);

        emit Claimed(msg.sender, payout, nonce);
    }

    /**
     * @notice Check how much a user can claim given a cumulative entitlement.
     */
    function claimable(address user, uint256 cumulativeAmount) external view returns (uint256) {
        uint256 alreadyClaimed = claimed[user];
        return cumulativeAmount > alreadyClaimed ? cumulativeAmount - alreadyClaimed : 0;
    }

    // ── Admin Functions ────────────────────────────────────────────────

    /**
     * @notice Fund the vault with $BLOOM tokens.
     */
    function fundVault(uint256 amount) external {
        bloomToken.safeTransferFrom(msg.sender, address(this), amount);
        emit VaultFunded(msg.sender, amount);
    }

    /**
     * @notice Update the oracle signer address.
     */
    function setOracleSigner(address _newSigner) external onlyOwner {
        if (_newSigner == address(0)) revert ZeroAddress();
        emit OracleSignerUpdated(oracleSigner, _newSigner);
        oracleSigner = _newSigner;
    }

    /**
     * @notice Emergency withdraw tokens from the vault.
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        bloomToken.safeTransfer(to, amount);
        emit VaultWithdrawn(to, amount);
    }

    /**
     * @notice Get the current vault balance.
     */
    function vaultBalance() external view returns (uint256) {
        return bloomToken.balanceOf(address(this));
    }
}
