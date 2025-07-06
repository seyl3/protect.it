// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/FlowHackWatcher.sol";
import "../src/PredictionMarketFactory.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "./LayerZeroEndpoint.t.sol";

contract FlowHackWatcherTest is Test {
    FlowHackWatcher public watcher;
    PredictionMarketFactory public factory;
    MockUSDC public usdc;
    MockOracle public oracle;
    MockLayerZeroEndpoint public lzEndpoint;
    
    address public constant MOCK_UMA_RECEIVER = address(0x1234567890);
    uint16 public constant UMA_CHAIN_ID = 1;
    
    event QuerySent(
        bytes32 indexed queryId,
        string protocol,
        uint256 startTime,
        uint256 endTime
    );
    
    event QueryResolved(
        bytes32 indexed queryId,
        string protocol,
        bool wasHacked
    );

    function setUp() public {
        // Deploy all required contracts
        usdc = new MockUSDC();
        oracle = new MockOracle();
        lzEndpoint = new MockLayerZeroEndpoint();
        
        // Deploy FlowHackWatcher first
        watcher = new FlowHackWatcher(
            address(lzEndpoint),
            address(0), // Will be set after factory deployment
            MOCK_UMA_RECEIVER
        );
        
        // Deploy PredictionMarketFactory with watcher as oracle
        factory = new PredictionMarketFactory(
            address(usdc),
            IOracle(address(watcher))
        );
        
        // Set factory address in watcher
        watcher.setFactoryAddress(address(factory));
        
        // Fund the test contract with USDC
        usdc.mint(address(this), 1000000 * 10**6);
    }

    function test_Initialize() public {
        assertEq(address(watcher.lzEndpoint()), address(lzEndpoint));
        assertEq(address(watcher.marketFactory()), address(factory));
        assertEq(watcher.trustedUMAReceiver(), MOCK_UMA_RECEIVER);
        assertEq(watcher.owner(), address(this));
    }

    function test_RequestHackCheck() public {
        string memory protocol = "KiffyPunch";
        uint256 duration = 30;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (duration * 1 days);
        
        bytes32 expectedQueryId = keccak256(abi.encodePacked(
            protocol,
            startTime,
            endTime
        ));
        
        vm.expectEmit(true, true, true, true);
        emit QuerySent(
            expectedQueryId,
            protocol,
            startTime,
            endTime
        );

        watcher.sendQuery{value: 0.01 ether}(protocol, duration);
        
        // Verify query storage
        (
            bool exists,
            bool isResolved,
            bool hackConfirmed,
            string memory storedProtocol,
            uint256 storedStartTime,
            uint256 storedEndTime,
            bytes32 storedMarketId
        ) = watcher.getQueryStatus(expectedQueryId);

        assertTrue(exists);
        assertFalse(isResolved);
        assertFalse(hackConfirmed);
        assertEq(storedProtocol, protocol);
        assertEq(storedStartTime, startTime);
        assertEq(storedEndTime, endTime);
    }

    function test_RevertWhen_UnsupportedProtocol() public {
        vm.expectRevert("Empty protocol name");
        watcher.sendQuery{value: 0.01 ether}("", 30);
    }

    function test_RevertWhen_UnsupportedDuration() public {
        vm.expectRevert("Invalid duration");
        watcher.sendQuery{value: 0.01 ether}("KiffyPunch", 0);
    }

    function test_RevertWhen_InsufficientFee() public {
        vm.expectRevert("Insufficient LZ fees");
        watcher.sendQuery{value: 0}("KiffyPunch", 30);
    }

    function test_ReceiveUMAResponse_HackConfirmed() public {
        // First create a query
        string memory protocol = "KiffyPunch";
        uint256 duration = 30;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (duration * 1 days);
        
        watcher.sendQuery{value: 0.01 ether}(protocol, duration);
        
        bytes32 queryId = keccak256(abi.encodePacked(
            protocol,
            uint256(1), // startTime
            uint256(block.timestamp + (duration * 1 days)) // endTime
        ));

        // Create a market for this protocol
        (address market, , ) = factory.deployMarket(protocol, duration);
        
        // Store the query
        bytes32 queryIdStored = keccak256(abi.encodePacked(
            protocol,
            uint256(1), // startTime
            uint256(block.timestamp + (duration * 1 days)) // endTime
        ));
        
        // Warp to after market end time
        vm.warp(block.timestamp + (duration * 1 days) + 1);
        
        // Simulate UMA response via LayerZero
        bytes memory payload = abi.encode(queryId, true);
        
        vm.expectEmit(true, true, true, true);
        emit QueryResolved(queryId, protocol, true);
        
        vm.prank(address(lzEndpoint));
        watcher.lzReceive(
            UMA_CHAIN_ID,
            abi.encodePacked(MOCK_UMA_RECEIVER),
            0,
            payload
        );

        // Verify query was updated
        (
            ,
            bool isResolved,
            bool hackConfirmed,
            ,
            ,
            ,
            
        ) = watcher.getQueryStatus(queryIdStored);

        assertTrue(isResolved);
        assertTrue(hackConfirmed);
        
        // Verify market was resolved
        assertTrue(PredictionMarket(market).resolved());
        assertTrue(PredictionMarket(market).yesWon());
    }

    function test_ReceiveUMAResponse_NoHack() public {
        string memory protocol = "KiffyPunch";
        uint256 duration = 30;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (duration * 1 days);
        
        watcher.sendQuery{value: 0.01 ether}(protocol, duration);
        
        bytes32 queryId = keccak256(abi.encodePacked(
            protocol,
            uint256(1), // startTime
            uint256(block.timestamp + (duration * 1 days)) // endTime
        ));

        // Create a market
        (address market, , ) = factory.deployMarket(protocol, duration);
        
        // Simulate UMA response (no hack)
        bytes memory payload = abi.encode(queryId, false);
        
        vm.prank(address(lzEndpoint));
        watcher.lzReceive(
            UMA_CHAIN_ID,
            abi.encodePacked(MOCK_UMA_RECEIVER),
            0,
            payload
        );

        // Verify query status
        (
            ,
            bool isResolved,
            bool hackConfirmed,
            ,
            ,
            ,
            
        ) = watcher.getQueryStatus(queryId);

        assertTrue(isResolved);
        assertFalse(hackConfirmed);
        
        // Market should not be resolved yet as no hack occurred
        assertFalse(PredictionMarket(market).resolved());
    }

    function test_RevertWhen_InvalidLZEndpoint() public {
        bytes memory payload = abi.encode(bytes32(0), false);
        
        vm.prank(address(0x9999));
        vm.expectRevert("Invalid endpoint");
        watcher.lzReceive(UMA_CHAIN_ID, abi.encodePacked(MOCK_UMA_RECEIVER), 0, payload);
    }

    function test_RevertWhen_InvalidSourceChain() public {
        bytes memory payload = abi.encode(bytes32(0), false);
        
        vm.prank(address(lzEndpoint));
        vm.expectRevert("Invalid source chain");
        watcher.lzReceive(2, abi.encodePacked(MOCK_UMA_RECEIVER), 0, payload);
    }

    function test_RevertWhen_InvalidSourceAddress() public {
        bytes memory payload = abi.encode(bytes32(0), false);
        
        vm.prank(address(lzEndpoint));
        vm.expectRevert("Invalid source address");
        watcher.lzReceive(UMA_CHAIN_ID, hex"9999", 0, payload);
    }

    function test_EstimateQueryFees() public {
        (uint256 nativeFee, uint256 zroFee) = watcher.estimateQueryFees(
            "KiffyPunch",
            30
        );
        
        assertEq(nativeFee, 0.01 ether);
        assertEq(zroFee, 0);
    }

    function test_AdminFunctions() public {
        address newReceiver = address(0x5678);
        
        // Test setTrustedUMAReceiver
        watcher.setTrustedUMAReceiver(newReceiver);
        assertEq(watcher.trustedUMAReceiver(), newReceiver);
        
        // Test withdrawFees
        vm.deal(address(watcher), 1 ether);
        uint256 balanceBefore = address(this).balance;
        
        watcher.withdrawFees();
        
        assertEq(address(watcher).balance, 0);
        assertEq(address(this).balance, balanceBefore + 1 ether);
    }

    function test_RevertWhen_NonOwnerCallsAdmin() public {
        vm.prank(address(0x9999));
        vm.expectRevert("Only owner");
        watcher.setTrustedUMAReceiver(address(0x5678));
        
        vm.prank(address(0x9999));
        vm.expectRevert("Only owner");
        watcher.withdrawFees();
    }

    receive() external payable {}
} 