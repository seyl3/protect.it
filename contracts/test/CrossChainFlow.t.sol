// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/FlowHackWatcher.sol";
import "../src/LayerZeroBridge.sol";
import "../src/UMAResponseHandler.sol";
import "../src/PredictionMarket.sol";
import "../src/PredictionMarketFactory.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "../src/IOracle.sol";
import "./LayerZeroEndpoint.t.sol";

contract CrossChainFlowTest is Test {
    FlowHackWatcher public watcher;
    LayerZeroBridge public bridge;
    UMAResponseHandler public umaHandler;
    PredictionMarketFactory public factory;
    PredictionMarket public market;
    MockUSDC public usdc;
    MockOracle public oracle;
    MockLayerZeroEndpoint public lzEndpoint;
    
    address public constant ALICE = address(0x1);
    address public constant BOB = address(0x2);
    
    event MessageSent(
        uint16 indexed dstChainId,
        address indexed destination,
        bytes payload,
        address payable refundAddress,
        address zroPaymentAddress,
        bytes adapterParams
    );
    
    function setUp() public {
        // Déployer les contrats
        usdc = new MockUSDC();
        oracle = new MockOracle();
        lzEndpoint = new MockLayerZeroEndpoint();
        
        bridge = new LayerZeroBridge(
            address(lzEndpoint), // Mock LayerZero endpoint
            address(this), // Mock Flow endpoint
            address(this)  // Mock UMA endpoint
        );
        
        watcher = new FlowHackWatcher(
            address(lzEndpoint), // Mock LayerZero endpoint
            address(0), // Will be set after factory deployment
            address(bridge)
        );
        
        factory = new PredictionMarketFactory(
            address(usdc),
            IOracle(address(watcher)) // Use watcher as oracle
        );
        
        watcher.setFactoryAddress(address(factory));
        
        umaHandler = new UMAResponseHandler(
            address(lzEndpoint), // Mock LayerZero endpoint
            address(bridge)
        );
        
        // Configurer les adresses de confiance
        bridge.setTrustedRemote(1, abi.encodePacked(address(watcher)));
        bridge.setTrustedRemote(2, abi.encodePacked(address(umaHandler)));
        
        // Donner des USDC aux utilisateurs
        vm.startPrank(ALICE);
        usdc.mint(ALICE, 1000e6);
        usdc.approve(address(factory), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(BOB);
        usdc.mint(BOB, 1000e6);
        usdc.approve(address(factory), type(uint256).max);
        vm.stopPrank();
    }
    
    function test_FullFlowWithHack() public {
        // Créer un nouveau marché
        vm.startPrank(ALICE);
        vm.deal(ALICE, 1 ether); // Give ALICE some ETH
        (address marketAddress, address yesToken, address noToken) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        market = PredictionMarket(marketAddress);
        
        // Send query to watcher
        bytes32 queryId = keccak256(abi.encodePacked(
            "KiffyPunch",
            uint256(1), // startTime
            uint256(block.timestamp + (30 * 1 days)) // endTime
        ));
        watcher.sendQuery{value: 0.1 ether}("KiffyPunch", 30);
        
        // Approuver les tokens et ajouter de la liquidité
        usdc.approve(marketAddress, type(uint256).max);
        market.buyYes(100e6); // Alice achète des YES tokens
        vm.stopPrank();
        
        // Vérifier que le marché est créé
        assertEq(market.protocolName(), "KiffyPunch");
        assertEq(market.endTime(), block.timestamp + (30 * 1 days));
        assertEq(market.totalUsdcDeposited(), 100e6);
        
        // Bob parie sur "pas de hack"
        vm.startPrank(BOB);
        usdc.approve(marketAddress, type(uint256).max);
        market.buyNo(50e6);
        vm.stopPrank();
        
        // Warp to after market end time
        vm.warp(block.timestamp + (30 * 1 days) + 1);
        
        // Simuler la réponse d'UMA (hack détecté)
        vm.startPrank(address(bridge));
        vm.deal(address(bridge), 1 ether); // Give bridge some ETH
        vm.stopPrank();
        
        // Send response through watcher
        bytes memory payload = abi.encode(queryId, true);
        vm.prank(address(lzEndpoint));
        watcher.lzReceive(1, abi.encodePacked(address(bridge)), 0, payload);
        
        // Vérifier que le marché est résolu correctement
        assertTrue(market.resolved());
        assertTrue(market.yesWon());
        
        // Alice peut réclamer ses gains
        uint256 aliceBalanceBefore = usdc.balanceOf(ALICE);
        vm.startPrank(ALICE);
        market.claimWinnings();
        vm.stopPrank();
        
        // Vérifier qu'Alice a reçu les bons gains
        assertEq(
            usdc.balanceOf(ALICE) - aliceBalanceBefore,
            150e6 // Mise initiale + gains
        );
    }
    
    function test_FullFlowWithoutHack() public {
        // Créer un nouveau marché
        vm.startPrank(ALICE);
        vm.deal(ALICE, 1 ether); // Give ALICE some ETH
        (address marketAddress, address yesToken, address noToken) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        market = PredictionMarket(marketAddress);
        
        // Send query to watcher
        bytes32 queryId = keccak256(abi.encodePacked(
            "KiffyPunch",
            uint256(1), // startTime
            uint256(block.timestamp + (30 * 1 days)) // endTime
        ));
        watcher.sendQuery{value: 0.1 ether}("KiffyPunch", 30);
        
        // Approuver les tokens
        usdc.approve(marketAddress, type(uint256).max);
        vm.stopPrank();
        
        // Bob parie sur "pas de hack"
        vm.startPrank(BOB);
        usdc.approve(marketAddress, type(uint256).max);
        market.buyNo(50e6);
        vm.stopPrank();
        
        // Warp to after market end time
        vm.warp(block.timestamp + (30 * 1 days) + 1);
        
        // Simuler la réponse d'UMA (pas de hack)
        vm.startPrank(address(bridge));
        vm.deal(address(bridge), 1 ether); // Give bridge some ETH
        vm.stopPrank();
        
        // Send response through watcher
        bytes memory payload = abi.encode(queryId, false);
        vm.prank(address(lzEndpoint));
        watcher.lzReceive(1, abi.encodePacked(address(bridge)), 0, payload);
        
        // Vérifier que le marché est résolu correctement
        assertTrue(market.resolved());
        assertFalse(market.yesWon());
        
        // Bob peut réclamer ses gains
        uint256 bobBalanceBefore = usdc.balanceOf(BOB);
        vm.startPrank(BOB);
        market.claimWinnings();
        vm.stopPrank();
        
        // Vérifier que Bob a reçu les bons gains
        assertEq(
            usdc.balanceOf(BOB) - bobBalanceBefore,
            150e6 // Mise initiale + gains
        );
    }
    
    function test_MarketCreationAndQueryFlow() public {
        // Setup event expectations
        bytes32 expectedQueryId = keccak256(abi.encodePacked(
            "KiffyPunch",
            block.timestamp,
            block.timestamp + (30 * 1 days)
        ));

        // Configure bridge to accept messages from watcher
        bridge.setTrustedRemote(1, abi.encodePacked(address(watcher)));
        
        // Alice creates a market and sends query
        vm.startPrank(ALICE);
        vm.deal(ALICE, 1 ether); // Give ALICE some ETH for LayerZero fees

        // Send query to watcher which will bridge it to UMA
        vm.expectEmit(true, true, true, true);
        emit MessageSent(
            1, // UMA chain ID
            watcher.trustedUMAReceiver(), // destination
            abi.encode(
                expectedQueryId,
                "KiffyPunch",
                block.timestamp,
                block.timestamp + (30 * 1 days)
            ),
            payable(ALICE), // refund to ALICE who paid for the tx
            address(0),
            bytes("")
        );
        watcher.sendQuery{value: 0.1 ether}("KiffyPunch", 30);

        // Deploy market
        (address marketAddress, address yesToken, address noToken) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        market = PredictionMarket(marketAddress);
        vm.stopPrank();

        // Verify market was created correctly
        assertEq(market.protocolName(), "KiffyPunch");
        assertEq(market.endTime(), block.timestamp + (30 * 1 days));
        assertFalse(market.resolved());
        assertEq(address(market.oracle()), address(watcher));

        // Verify query was stored in watcher
        (
            bool exists,
            bool isResolved,
            bool hackConfirmed,
            string memory protocol,
            uint256 startTime,
            uint256 endTime,
            bytes32 marketId
        ) = watcher.getQueryStatus(expectedQueryId);

        assertTrue(exists);
        assertEq(protocol, "KiffyPunch");
        assertFalse(isResolved);
        assertFalse(hackConfirmed);
        assertEq(endTime, block.timestamp + (30 * 1 days));

        // Verify market is still unresolved (waiting for UMA)
        assertFalse(market.resolved());

        // Warp to after market end time
        vm.warp(block.timestamp + (30 * 1 days) + 1);

        // Simulate UMA responding with "no hack"
        vm.startPrank(address(lzEndpoint));
        bytes memory bridgePayload = abi.encode(expectedQueryId, false); // No hack detected
        watcher.lzReceive(1, abi.encodePacked(address(bridge)), 0, bridgePayload);
        vm.stopPrank();

        // Verify market is resolved with "no hack" result
        assertTrue(market.resolved());
        (
            bool exists2,
            bool isResolved2,
            bool hackConfirmed2,
            string memory protocol2,
            uint256 startTime2,
            uint256 endTime2,
            bytes32 marketId2
        ) = watcher.getQueryStatus(expectedQueryId);
        assertTrue(isResolved2);
        assertFalse(hackConfirmed2);
    }
    
    // Fonctions mock pour LayerZero
    function send(
        uint16,
        address,
        bytes memory,
        address payable,
        address,
        bytes memory
    ) external payable {}
    
    function estimateFees(
        uint16,
        address,
        bytes memory,
        bool,
        bytes memory
    ) external pure returns (uint256, uint256) {
        return (0.01 ether, 0);
    }
} 