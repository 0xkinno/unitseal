// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title UnitSealGuard
 * @notice Execution guard that verifies state-bound seals before executing Stock Token transfers
 * @dev Enforces the UnitSeal invariant: no execution unless the sealed state
 *      matches the onchain state (including uiMultiplier) at execution time.
 */
contract UnitSealGuard is Ownable, EIP712 {
    using ECDSA for bytes32;

    // --- Types ---

    struct SealAttestation {
        uint256 chainId;
        address token;
        bytes32 sealId;
        bytes32 planHash;
        bytes32 stateHash;
        uint256 expectedMultiplier;
        uint256 rawAmount;
        address recipient;
        uint256 expiry;
        string capability;
    }

    // --- Events ---

    event SealExecuted(
        bytes32 indexed sealId,
        bytes32 planHash,
        address indexed token,
        address indexed recipient,
        uint256 rawAmount,
        uint256 expectedMultiplier,
        uint256 currentMultiplier,
        uint256 timestamp
    );

    event SealRefused(
        bytes32 indexed sealId,
        bytes32 planHash,
        string reason,
        uint256 timestamp
    );

    event AttestorUpdated(address indexed oldAttestor, address indexed newAttestor);
    event MockMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);

    // --- State ---

    address public attestor;
    mapping(bytes32 => bool) public executedSeals;
    IERC20 public stockToken;
    uint256 public mockMultiplier;

    // --- Constants ---

    bytes32 private constant ATTESTATION_TYPEHASH = keccak256(
        "SealAttestation(uint256 chainId,address token,bytes32 sealId,bytes32 planHash,bytes32 stateHash,uint256 expectedMultiplier,uint256 rawAmount,address recipient,uint256 expiry,string capability)"
    );

    // --- Errors ---

    error SealExpired(bytes32 sealId, uint256 expiry, uint256 currentTimestamp);
    error SealAlreadyExecuted(bytes32 sealId);
    error InvalidAttestor(bytes32 sealId);
    error ChainIdMismatch(uint256 expected, uint256 actual);
    error TokenMismatch(address expected, address actual);
    error RecipientMismatch(address expected, address actual);
    error MultiplierMismatch(uint256 expected, uint256 current);
    error TransferFailed();

    // --- Constructor ---

    constructor(address initialAttestor, address owner) 
        Ownable(owner) 
        EIP712("UnitSealGuard", "1")
    {
        require(initialAttestor != address(0), "Invalid attestor address");
        attestor = initialAttestor;
    }

    // --- Configuration ---

    function setStockToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        stockToken = IERC20(token);
    }

    function setAttestor(address newAttestor) external onlyOwner {
        require(newAttestor != address(0), "Invalid attestor address");
        address old = attestor;
        attestor = newAttestor;
        emit AttestorUpdated(old, newAttestor);
    }

    function setMockMultiplier(uint256 multiplier) external onlyOwner {
        uint256 old = mockMultiplier;
        mockMultiplier = multiplier;
        emit MockMultiplierUpdated(old, multiplier);
    }

    // --- Multiplier Resolution ---

    function getCurrentMultiplier(address token) public view returns (uint256) {
        if (mockMultiplier != 0) {
            return mockMultiplier;
        }

        if (token != address(0)) {
            (bool success, bytes memory data) = token.staticcall(
                abi.encodeWithSignature("uiMultiplier()")
            );
            if (success && data.length >= 32) {
                return abi.decode(data, (uint256));
            }
        }

        return 1e18; // Default 1.0 in 18 decimal scale
    }

    // --- Internal Helpers to prevent Stack Too Deep ---

    function _verifyAttestorSignature(
        SealAttestation calldata attestation,
        bytes calldata signature
    ) internal view {
        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                attestation.chainId,
                attestation.token,
                attestation.sealId,
                attestation.planHash,
                attestation.stateHash,
                attestation.expectedMultiplier,
                attestation.rawAmount,
                attestation.recipient,
                attestation.expiry,
                keccak256(bytes(attestation.capability))
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        if (signer != attestor) {
            revert InvalidAttestor(attestation.sealId);
        }
    }

    function _verifyInvariants(SealAttestation calldata attestation) internal returns (uint256 currentMultiplier) {
        if (block.timestamp > attestation.expiry) {
            emit SealRefused(attestation.sealId, attestation.planHash, "Seal expired", block.timestamp);
            revert SealExpired(attestation.sealId, attestation.expiry, block.timestamp);
        }

        if (executedSeals[attestation.sealId]) {
            emit SealRefused(attestation.sealId, attestation.planHash, "Seal already executed", block.timestamp);
            revert SealAlreadyExecuted(attestation.sealId);
        }

        if (attestation.chainId != block.chainid) {
            emit SealRefused(attestation.sealId, attestation.planHash, "Chain ID mismatch", block.timestamp);
            revert ChainIdMismatch(attestation.chainId, block.chainid);
        }

        if (address(stockToken) != address(0) && attestation.token != address(stockToken)) {
            emit SealRefused(attestation.sealId, attestation.planHash, "Token mismatch", block.timestamp);
            revert TokenMismatch(attestation.token, address(stockToken));
        }

        if (attestation.recipient == address(0)) {
            revert RecipientMismatch(attestation.recipient, address(0));
        }

        currentMultiplier = getCurrentMultiplier(attestation.token);
        if (attestation.expectedMultiplier != currentMultiplier) {
            emit SealRefused(attestation.sealId, attestation.planHash, "Multiplier mismatch", block.timestamp);
            revert MultiplierMismatch(attestation.expectedMultiplier, currentMultiplier);
        }
    }

    function _transferTokens(address token, address recipient, uint256 amount) internal {
        IERC20 targetToken = address(stockToken) != address(0) ? stockToken : IERC20(token);
        
        bool transferred = false;
        if (targetToken.allowance(msg.sender, address(this)) >= amount) {
            transferred = targetToken.transferFrom(msg.sender, recipient, amount);
        } else if (targetToken.balanceOf(address(this)) >= amount) {
            transferred = targetToken.transfer(recipient, amount);
        } else {
            revert TransferFailed();
        }

        if (!transferred) {
            revert TransferFailed();
        }
    }

    // --- Execution ---

    function executeSeal(
        SealAttestation calldata attestation,
        bytes calldata signature
    ) external returns (bool success) {
        _verifyAttestorSignature(attestation, signature);
        uint256 currentMultiplier = _verifyInvariants(attestation);

        executedSeals[attestation.sealId] = true;
        _transferTokens(attestation.token, attestation.recipient, attestation.rawAmount);

        emit SealExecuted(
            attestation.sealId,
            attestation.planHash,
            attestation.token,
            attestation.recipient,
            attestation.rawAmount,
            attestation.expectedMultiplier,
            currentMultiplier,
            block.timestamp
        );

        return true;
    }

    // --- View Functions ---

    function isSealExecuted(bytes32 sealId) external view returns (bool) {
        return executedSeals[sealId];
    }

    function getAttestor() external view returns (address) {
        return attestor;
    }
}
