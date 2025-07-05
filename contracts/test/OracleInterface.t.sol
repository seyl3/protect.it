// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import "../src/PredictionMarketFactory.sol";
import "../src/PredictionMarket.sol";
import "../src/PredictionToken.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "../src/IOracle.sol";

contract OracleInterfaceTest is Test {
    PredictionMarketFactory public factory;
    PredictionMarket public market;
    PredictionToken public yesToken;
    PredictionToken public noToken;
    MockUSDC public usdc;
    MockOracle public oracle;
    
    address public oracleOwner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    uint256 public constant INITIAL_USDC = 1000000 * 1e6;
    
    function setUp() public {
        usdc = new MockUSDC();
        
        vm.prank(oracleOwner);
        oracle = new MockOracle();
        
        factory = new PredictionMarketFactory(address(usdc), oracle);
        
        // Deploy a market using the factory
        (address marketAddr, address yesTokenAddr, address noTokenAddr) = factory.deployMarket("Ankr", 30);
        
        market = PredictionMarket(marketAddr);
        yesToken = PredictionToken(yesTokenAddr);
        noToken = PredictionToken(noTokenAddr);
        
        usdc.mint(user1, INITIAL_USDC);
        usdc.mint(user2, INITIAL_USDC);
        
        vm.prank(user1);
        usdc.approve(address(market), INITIAL_USDC);
        vm.prank(user2);
        usdc.approve(address(market), INITIAL_USDC);
    }
    
    function testOracleInterface() public view {
        // Test that the oracle interface is properly implemented
        assertTrue(oracle.canResolve(address(market)));
        assertTrue(oracle.canFreeze(address(market)));
        assertEq(oracle.getOwner(), oracleOwner);
    }
    
    function testOracleCanResolveMarket() public {
        // Test that the oracle can resolve the market
        vm.prank(user1);
        market.buyYes(1000 * 1e6);
        
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        assertTrue(market.resolved());
        assertTrue(market.yesWon());
        
        // Check oracle's internal tracking
        (bool resolved, bool result) = oracle.getResolution(address(market));
        assertTrue(resolved);
        assertTrue(result);
    }
    
    function testOracleCanFreezeMarket() public {
        // Test that the oracle can freeze the market
        vm.prank(oracleOwner);
        oracle.freezeMarket(address(market));
        
        vm.prank(user1);
        vm.expectRevert("Market inactive");
        market.buyYes(1000 * 1e6);
        
        // Test that the oracle can unfreeze the market
        vm.prank(oracleOwner);
        oracle.unfreezeMarket(address(market));
        
        vm.prank(user1);
        market.buyYes(1000 * 1e6); // Should work now
    }
    
    function testOnlyOracleOwnerCanResolve() public {
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(user1);
        vm.expectRevert("Only owner");
        oracle.resolveMarket(address(market), true);
        
        vm.prank(user2);
        vm.expectRevert("Only owner");
        oracle.resolveMarket(address(market), true);
    }
    
    function testOnlyOracleOwnerCanFreeze() public {
        vm.prank(user1);
        vm.expectRevert("Only owner");
        oracle.freezeMarket(address(market));
        
        vm.prank(user2);
        vm.expectRevert("Only owner");
        oracle.unfreezeMarket(address(market));
    }
    
    function testOracleEventsEmitted() public {
        vm.warp(block.timestamp + 31 days);
        
        // Test MarketResolved event
        vm.expectEmit(true, false, false, true, address(oracle));
        emit IOracle.MarketResolved(address(market), true);
        
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        // Create a new market to test freeze/unfreeze events
        (address market2Addr, , ) = factory.deployMarket("Uniswap", 30);
        
        // Test MarketFrozen event
        vm.expectEmit(true, false, false, false, address(oracle));
        emit IOracle.MarketFrozen(market2Addr);
        
        vm.prank(oracleOwner);
        oracle.freezeMarket(market2Addr);
        
        // Test MarketUnfrozen event
        vm.expectEmit(true, false, false, false, address(oracle));
        emit IOracle.MarketUnfrozen(market2Addr);
        
        vm.prank(oracleOwner);
        oracle.unfreezeMarket(market2Addr);
    }
    
    function testCannotResolveAlreadyResolvedMarket() public {
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        vm.prank(oracleOwner);
        vm.expectRevert("Market already resolved");
        oracle.resolveMarket(address(market), false);
    }
    
    function testCannotResolveNonExistentMarket() public {
        address fakeMarket = address(0x999);
        
        vm.prank(oracleOwner);
        vm.expectRevert();
        oracle.resolveMarket(fakeMarket, true);
    }
    
    function testMarketOracleReference() public view {
        // Test that the market correctly references the oracle
        assertEq(address(market.oracle()), address(oracle));
        
        // Test that canResolve works correctly
        assertTrue(oracle.canResolve(address(market)));
        assertTrue(oracle.canFreeze(address(market)));
    }
    
    function testMultipleMarketsWithSameOracle() public {
        // Create a second market with the same oracle
        (address market2Addr, , ) = factory.deployMarket("Compound", 30);
        
        // Test that the oracle can resolve both markets
        assertTrue(oracle.canResolve(address(market)));
        assertTrue(oracle.canResolve(market2Addr));
        
        vm.warp(block.timestamp + 31 days);
        
        // Resolve first market
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        // Resolve second market
        vm.prank(oracleOwner);
        oracle.resolveMarket(market2Addr, false);
        
        assertTrue(market.resolved());
        assertTrue(market.yesWon());
        assertTrue(PredictionMarket(market2Addr).resolved());
        assertFalse(PredictionMarket(market2Addr).yesWon());
    }
} 