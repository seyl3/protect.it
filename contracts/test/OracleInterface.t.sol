// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/PredictionMarket.sol";
import "../src/PredictionMarketFactory.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "../src/IOracle.sol";

contract OracleInterfaceTest is Test {
    PredictionMarketFactory public factory;
    PredictionMarket public market;
    MockUSDC public usdc;
    MockOracle public oracle;
    
    address public constant ALICE = address(0x1);
    address public constant BOB = address(0x2);
    
    function setUp() public {
        // Deploy contracts
        usdc = new MockUSDC();
        oracle = new MockOracle();
        
        factory = new PredictionMarketFactory(
            address(usdc),
            IOracle(address(oracle))
        );
        
        // Fund users
        usdc.mint(ALICE, 1000e6);
        usdc.mint(BOB, 1000e6);
        
        vm.startPrank(ALICE);
        usdc.approve(address(factory), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(BOB);
        usdc.approve(address(factory), type(uint256).max);
        vm.stopPrank();
    }
    
    function testOracleInterface() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        market = PredictionMarket(marketAddress);
        vm.stopPrank();
        
        assertEq(address(market.oracle()), address(oracle));
    }
    
    function testMarketOracleReference() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        market = PredictionMarket(marketAddress);
        vm.stopPrank();
        
        assertTrue(oracle.canResolve(address(market)));
    }
    
    function testOracleCanResolveMarket() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        market = PredictionMarket(marketAddress);
        vm.stopPrank();
        
        // Place some bets
        vm.startPrank(ALICE);
        usdc.approve(address(market), type(uint256).max);
        market.buyYes(100e6);
        vm.stopPrank();
        
        vm.startPrank(BOB);
        usdc.approve(address(market), type(uint256).max);
        market.buyNo(100e6);
        vm.stopPrank();
        
        // Warp to after market end
        vm.warp(block.timestamp + 31 days);
        
        // Oracle resolves market
        vm.startPrank(address(oracle));
        market.resolveMarket(true);
        vm.stopPrank();
        
        assertTrue(market.resolved());
        assertTrue(market.yesWon());
    }
    
    function testOracleCanFreezeMarket() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        market = PredictionMarket(marketAddress);
        
        // Approve and buy tokens
        usdc.approve(address(market), type(uint256).max);
        market.buyYes(100e6);
        vm.stopPrank();
        
        vm.startPrank(BOB);
        usdc.approve(address(market), type(uint256).max);
        market.buyNo(100e6);
        vm.stopPrank();
        
        // Oracle freezes market
        vm.startPrank(address(oracle));
        market.freezeMarket();
        vm.stopPrank();
        
        assertTrue(market.frozen());
        
        // Oracle unfreezes market
        vm.startPrank(address(oracle));
        market.unfreezeMarket();
        vm.stopPrank();
        
        assertFalse(market.frozen());
    }
    
    function testOnlyOracleOwnerCanResolve() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        market = PredictionMarket(marketAddress);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 31 days);
        
        vm.startPrank(BOB);
        vm.expectRevert("Only oracle");
        market.resolveMarket(true);
        vm.stopPrank();
    }
    
    function testOnlyOracleOwnerCanFreeze() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        market = PredictionMarket(marketAddress);
        vm.stopPrank();
        
        vm.startPrank(BOB);
        vm.expectRevert("Only oracle");
        market.freezeMarket();
        vm.stopPrank();
    }
    
    function testCannotResolveNonExistentMarket() public {
        vm.startPrank(address(oracle));
        vm.expectRevert();
        oracle.resolveMarket(address(0x123), true);
        vm.stopPrank();
    }
    
    function testCannotResolveAlreadyResolvedMarket() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        market = PredictionMarket(marketAddress);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 31 days);
        
        vm.startPrank(address(oracle));
        market.resolveMarket(true);
        
        vm.expectRevert("Already resolved");
        market.resolveMarket(true);
        vm.stopPrank();
    }
    
    function testMultipleMarketsWithSameOracle() public {
        vm.startPrank(ALICE);
        (address market1Address, , ) = factory.deployMarket("KiffyPunch", 30);
        (address market2Address, , ) = factory.deployMarket("Ankr", 30);
        vm.stopPrank();
        
        PredictionMarket market1 = PredictionMarket(market1Address);
        PredictionMarket market2 = PredictionMarket(market2Address);
        
        assertEq(address(market1.oracle()), address(oracle));
        assertEq(address(market2.oracle()), address(oracle));
        
        assertTrue(oracle.canResolve(market1Address));
        assertTrue(oracle.canResolve(market2Address));
    }
    
    function testOracleEventsEmitted() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        market = PredictionMarket(marketAddress);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 31 days);
        
        vm.startPrank(address(oracle));
        
        vm.expectEmit(true, true, true, true);
        emit MarketFrozen();
        market.freezeMarket();
        
        vm.expectEmit(true, true, true, true);
        emit MarketUnfrozen();
        market.unfreezeMarket();
        
        vm.expectEmit(true, true, true, true);
        emit MarketResolved(true);
        market.resolveMarket(true);
        
        vm.stopPrank();
    }
    
    event MarketResolved(bool yesWon);
    event MarketFrozen();
    event MarketUnfrozen();
} 