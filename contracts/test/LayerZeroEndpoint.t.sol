// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/ILayerZeroEndpoint.sol";

contract LayerZeroEndpointTest is Test {
    address constant MOCK_DESTINATION = address(0x123);
    uint16 constant MOCK_CHAIN_ID = 1;
    uint256 constant MOCK_NATIVE_FEE = 0.01 ether;
    uint256 constant MOCK_ZRO_FEE = 0;
    
    MockLayerZeroEndpoint endpoint;
    
    function setUp() public {
        endpoint = new MockLayerZeroEndpoint();
    }
    
    function testSend() public {
        bytes memory payload = abi.encode("test");
        
        vm.deal(address(this), 1 ether);
        
        endpoint.send{value: 0.01 ether}(
            MOCK_CHAIN_ID,
            MOCK_DESTINATION,
            payload,
            payable(address(this)),
            address(0),
            bytes("")
        );
    }
    
    function testSendInsufficientFee() public {
        bytes memory payload = abi.encode("test");
        
        vm.deal(address(this), 1 ether);
        
        vm.expectRevert("Insufficient fee");
        endpoint.send{value: 0.005 ether}(
            MOCK_CHAIN_ID,
            MOCK_DESTINATION,
            payload,
            payable(address(this)),
            address(0),
            bytes("")
        );
    }
    
    function testEstimateFees() public {
        bytes memory payload = abi.encode("test");
        
        (uint256 nativeFee, uint256 zroFee) = endpoint.estimateFees(
            MOCK_CHAIN_ID,
            MOCK_DESTINATION,
            payload,
            false,
            bytes("")
        );
        
        assertEq(nativeFee, MOCK_NATIVE_FEE);
        assertEq(zroFee, MOCK_ZRO_FEE);
    }
}

contract MockLayerZeroEndpoint is ILayerZeroEndpoint {
    uint256 constant MOCK_NATIVE_FEE = 0.01 ether;
    uint256 constant MOCK_ZRO_FEE = 0;
    
    event MessageSent(
        uint16 indexed dstChainId,
        address indexed destination,
        bytes payload,
        address payable refundAddress,
        address zroPaymentAddress,
        bytes adapterParams
    );
    
    function send(
        uint16 _dstChainId,
        address _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable {
        require(msg.value >= MOCK_NATIVE_FEE, "Insufficient fee");
        
        emit MessageSent(
            _dstChainId,
            _destination,
            _payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
    }
    
    function estimateFees(
        uint16 _dstChainId,
        address _destination,
        bytes calldata _payload,
        bool _useZro,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        return (MOCK_NATIVE_FEE, MOCK_ZRO_FEE);
    }
    
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external {
        // Mock implementation
    }
}