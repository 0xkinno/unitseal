// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {UnitSealGuard} from "../UnitSealGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Mock Stock Token for testing
contract MockStockToken is IERC20 {
    string public name = "Mock Stock Token";
    string public symbol = "MST";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    uint256 public mockMultiplier = 1000000000000000000; // 1.0
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    // Mock uiMultiplier function
    function uiMultiplier() external view returns (uint256) {
        return mockMultiplier;
    }
    
    // For testing multiplier changes
    function setMockMultiplier(uint256 newMultiplier) external {
        mockMultiplier = newMultiplier;
    }
}

contract UnitSealGuardTest is Test {
    UnitSealGuard public guard;
    MockStockToken public token;
    
    address public owner = makeAddr("owner");
    address public attestor = makeAddr("attestor");
    address public user = makeAddr("user");
    address public recipient = makeAddr("recipient");
    
    bytes32 public constant SEAL_ID = bytes32(uint256(1));
    bytes32 public constant PLAN_HASH = bytes32(uint256(2));
    bytes32 public constant STATE_HASH = bytes32(uint256(3));
    
    uint256 public constant CHAIN_ID = 46630;
    uint256 public constant EXPECTED_MULTIPLIER = 1000000000000000000; // 1.0
    uint256 public constant RAW_AMOUNT = 1000000000000000000; // 1 token
    uint256 public constant EXPIRY = block.timestamp + 300; // 5 minutes
    
    function setUp() public {
        token = new MockStockToken();
        guard = new UnitSealGuard(attestor, owner);
        guard.setStockToken(address(token));
        
        // Mint tokens to user
        token.mint(user, 100 * 10**18);
    }
    
    function _getStructHash() internal view returns (bytes32) {
        return guard.hashTypedDataV4(
            keccak256(
                abi.encode(
                    guard.TYPED_DATA_VERSION(),
                    keccak256(
                        "SealAttestation(uint256 chainId,address token,bytes32 sealId,bytes32 planHash,bytes32 stateHash,uint256 expectedMultiplier,uint256 rawAmount,address recipient,uint256 expiry,string capability)"
                    ),
                    keccak256(
                        abi.encode(
                            CHAIN_ID,
                            address(token),
                            SEAL_ID,
                            PLAN_HASH,
                            STATE_HASH,
                            EXPECTED_MULTIPLIER,
                            RAW_AMOUNT,
                            recipient,
                            EXPIRY,
                            keccak256(bytes("market"))
                        )
                    )
                )
            )
        );
    }
    
    function _signAttestation() internal returns (bytes) {
        bytes32 digest = _getStructHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attestor, digest);
        return abi.encodePacked(r, s, v);
    }
    
    function test_Deploy() public {
        assertEq(guard.owner(), owner);
        assertEq(guard.attestor(), attestor);
        assertEq(address(guard.stockToken()), address(token));
    }
    
    function test_SetStockToken() public {
        address newToken = makeAddr("newToken");
        vm.startPrank(owner);
        guard.setStockToken(newToken);
        vm.stopPrank();
        assertEq(address(guard.stockToken()), newToken);
    }
    
    function test_SetAttestor() public {
        address newAttestor = makeAddr("newAttestor");
        vm.startPrank(owner);
        guard.setAttestor(newAttestor);
        vm.stopPrank();
        assertEq(guard.attestor(), newAttestor);
    }
    
    function test_ExecuteSeal_Success() public {
        // Transfer tokens to contract for execution
        token.mint(address(this), RAW_AMOUNT);
        token.approve(address(guard), RAW_AMOUNT);
        
        bytes memory signature = _signAttestation();
        
        SealAttestation memory attestation = SealAttestation({
            chainId: CHAIN_ID,
            token: address(token),
            sealId: SEAL_ID,
            planHash: PLAN_HASH,
            stateHash: STATE_HASH,
            expectedMultiplier: EXPECTED_MULTIPLIER,
            rawAmount: RAW_AMOUNT,
            recipient: recipient,
            expiry: EXPIRY,
            capability: "market"
        });
        
        vm.prank(user);
        bool success = guard.executeSeal(attestation, signature);
        
        assertTrue(success);
        assertTrue(guard.isSealExecuted(SEAL_ID));
        assertEq(token.balanceOf(recipient), RAW_AMOUNT);
    }
    
    function test_ExecuteSeal_Expired() public {
        bytes memory signature = _signAttestation();
        
        SealAttestation memory attestation = SealAttestation({
            chainId: CHAIN_ID,
            token: address(token),
            sealId: SEAL_ID,
            planHash: PLAN_HASH,
            stateHash: STATE_HASH,
            expectedMultiplier: EXPECTED_MULTIPLIER,
            rawAmount: RAW_AMOUNT,
            recipient: recipient,
            expiry: block.timestamp - 1, // Already expired
            capability: "market"
        });
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(guard.SealExpired.selector, SEAL_ID, attestation.expiry, block.timestamp));
        guard.executeSeal(attestation, signature);
    }
    
    function test_ExecuteSeal_Replay() public {
        // First execution
        token.mint(address(this), RAW_AMOUNT);
        token.approve(address(guard), RAW_AMOUNT);
        
        bytes memory signature = _signAttestation();
        
        SealAttestation memory attestation = SealAttestation({
            chainId: CHAIN_ID,
            token: address(token),
            sealId: SEAL_ID,
            planHash: PLAN_HASH,
            stateHash: STATE_HASH,
            expectedMultiplier: EXPECTED_MULTIPLIER,
            rawAmount: RAW_AMOUNT,
            recipient: recipient,
            expiry: EXPIRY,
            capability: "market"
        });
        
        vm.prank(user);
        guard.executeSeal(attestation, signature);
        assertTrue(guard.isSealExecuted(SEAL_ID));
        
        // Try to replay
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(guard.SealAlreadyExecuted.selector, SEAL_ID));
        guard.executeSeal(attestation, signature);
    }
    
    function test_ExecuteSeal_ChainIdMismatch() public {
        bytes memory signature = _signAttestation();
        
        SealAttestation memory attestation = SealAttestation({
            chainId: 99999, // Wrong chain ID
            token: address(token),
            sealId: SEAL_ID,
            planHash: PLAN_HASH,
            stateHash: STATE_HASH,
            expectedMultiplier: EXPECTED_MULTIPLIER,
            rawAmount: RAW_AMOUNT,
            recipient: recipient,
            expiry: EXPIRY,
            capability: "market"
        });
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(guard.ChainIdMismatch.selector, 99999, CHAIN_ID));
        guard.executeSeal(attestation, signature);
    }
    
    function test_ExecuteSeal_MultiplierMismatch() public {
        // Set multiplier to different value
        token.setMockMultiplier(500000000000000000); // 0.5
        
        bytes memory signature = _signAttestation();
        
        SealAttestation memory attestation = SealAttestation({
            chainId: CHAIN_ID,
            token: address(token),
            sealId: SEAL_ID,
            planHash: PLAN_HASH,
            stateHash: STATE_HASH,
            expectedMultiplier: EXPECTED_MULTIPLIER, // 1.0
            rawAmount: RAW_AMOUNT,
            recipient: recipient,
            expiry: EXPIRY,
            capability: "market"
        });
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(guard.MultiplierMismatch.selector, EXPECTED_MULTIPLIER, 500000000000000000));
        guard.executeSeal(attestation, signature);
    }
    
    function test_ExecuteSeal_WrongAttestor() public {
        bytes32 digest = _getStructHash();
        // Sign with wrong address
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(user, digest);
        bytes memory wrongSignature = abi.encodePacked(r, s, v);
        
        SealAttestation memory attestation = SealAttestation({
            chainId: CHAIN_ID,
            token: address(token),
            sealId: SEAL_ID,
            planHash: PLAN_HASH,
            stateHash: STATE_HASH,
            expectedMultiplier: EXPECTED_MULTIPLIER,
            rawAmount: RAW_AMOUNT,
            recipient: recipient,
            expiry: EXPIRY,
            capability: "market"
        });
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(guard.InvalidAttestor.selector, SEAL_ID));
        guard.executeSeal(attestation, wrongSignature);
    }
    
    function test_IsSealExecuted() public {
        token.mint(address(this), RAW_AMOUNT);
        token.approve(address(guard), RAW_AMOUNT);
        
        bytes memory signature = _signAttestation();
        
        SealAttestation memory attestation = SealAttestation({
            chainId: CHAIN_ID,
            token: address(token),
            sealId: SEAL_ID,
            planHash: PLAN_HASH,
            stateHash: STATE_HASH,
            expectedMultiplier: EXPECTED_MULTIPLIER,
            rawAmount: RAW_AMOUNT,
            recipient: recipient,
            expiry: EXPIRY,
            capability: "market"
        });
        
        vm.prank(user);
        guard.executeSeal(attestation, signature);
        
        assertTrue(guard.isSealExecuted(SEAL_ID));
    }
}
