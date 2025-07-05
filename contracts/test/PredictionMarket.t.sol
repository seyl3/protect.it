// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import "../src/PredictionMarketFactory.sol";
import "../src/PredictionMarket.sol";
import "../src/PredictionToken.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";

contract PredictionMarketTest is Test {
    PredictionMarketFactory public factory;
    PredictionMarket public market;
    PredictionToken public yesToken;
    PredictionToken public noToken;
    MockUSDC public usdc;
    MockOracle public oracle;
    
    address public oracleOwner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);
    
    uint256 public constant INITIAL_USDC = 1000000 * 1e6;
    uint256 public constant INITIAL_TOKENS = 1000000 * 1e18;
    
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
        usdc.mint(user3, INITIAL_USDC);
        
        vm.prank(user1);
        usdc.approve(address(market), INITIAL_USDC);
        vm.prank(user2);
        usdc.approve(address(market), INITIAL_USDC);
        vm.prank(user3);
        usdc.approve(address(market), INITIAL_USDC);
    }
    
    function testInitialState() public view {
        assertEq(market.yesTokens(), INITIAL_TOKENS);
        assertEq(market.noTokens(), INITIAL_TOKENS);
        assertEq(market.k(), INITIAL_TOKENS * INITIAL_TOKENS);
        assertEq(market.totalUsdcDeposited(), 0);
        assertFalse(market.resolved());
        
        // Check ERC20 token initial state
        assertEq(yesToken.totalSupply(), 0);
        assertEq(noToken.totalSupply(), 0);
    }
    
    function testBuyYesTokens() public {
        uint256 usdcAmount = 1000 * 1e6;
        uint256 expectedTokens = market.getYesTokensOut(usdcAmount);
        
        vm.prank(user1);
        market.buyYes(usdcAmount);
        
        assertEq(yesToken.balanceOf(user1), expectedTokens);
        assertEq(yesToken.totalSupply(), expectedTokens);
        assertEq(market.totalUsdcDeposited(), usdcAmount);
        assertEq(usdc.balanceOf(user1), INITIAL_USDC - usdcAmount);
        assertEq(usdc.balanceOf(address(market)), usdcAmount);
    }
    
    function testMinimumTradeAmount() public {
        uint256 belowMinimum = 0.5 * 1e6; // 0.5 USDC
        
        vm.prank(user1);
        vm.expectRevert("Below minimum trade amount");
        market.buyYes(belowMinimum);
    }
    
    function testSlippageProtection() public {
        uint256 usdcAmount = 10000 * 1e6;
        uint256 expectedTokens = market.getYesTokensOut(usdcAmount);
        uint256 minTokensOut = expectedTokens + 1; // Require more than possible
        
        vm.prank(user1);
        vm.expectRevert("Slippage too high");
        market.buyYesWithSlippage(usdcAmount, minTokensOut);
    }
    
    function testFreezeUnfreeze() public {
        // Test freezing market
        vm.prank(oracleOwner);
        oracle.freezeMarket(address(market));
        
        vm.prank(user1);
        vm.expectRevert("Market inactive");
        market.buyYes(1000 * 1e6);
        
        // Test unfreezing market
        vm.prank(oracleOwner);
        oracle.unfreezeMarket(address(market));
        
        vm.prank(user1);
        market.buyYes(1000 * 1e6); // Should work now
    }
    
    function testBuyNoTokens() public {
        uint256 usdcAmount = 1000 * 1e6;
        uint256 expectedTokens = market.getNoTokensOut(usdcAmount);
        
        vm.prank(user1);
        market.buyNo(usdcAmount);
        
        assertEq(noToken.balanceOf(user1), expectedTokens);
        assertEq(noToken.totalSupply(), expectedTokens);
        assertEq(market.totalUsdcDeposited(), usdcAmount);
        assertEq(usdc.balanceOf(user1), INITIAL_USDC - usdcAmount);
        assertEq(usdc.balanceOf(address(market)), usdcAmount);
    }
    
    function testAMMPricing() public {
        uint256 usdcAmount = 100000 * 1e6;
        
        uint256 initialYesPrice = market.getYesPrice();
        uint256 initialNoPrice = market.getNoPrice();
        
        vm.prank(user1);
        market.buyYes(usdcAmount);
        
        uint256 newYesPrice = market.getYesPrice();
        uint256 newNoPrice = market.getNoPrice();
        
        assertGt(newYesPrice, initialYesPrice);
        assertLt(newNoPrice, initialNoPrice);
    }
    
    function testMultipleUsers() public {
        uint256 amount1 = 50000 * 1e6;
        uint256 amount2 = 30000 * 1e6;
        
        vm.prank(user1);
        market.buyYes(amount1);
        
        vm.prank(user2);
        market.buyNo(amount2);
        
        assertGt(yesToken.balanceOf(user1), 0);
        assertGt(noToken.balanceOf(user2), 0);
        assertEq(market.totalUsdcDeposited(), amount1 + amount2);
    }
    
    function testAMMBehavior() public {
        uint256 initialYesTokens = market.yesTokens();
        uint256 initialNoTokens = market.noTokens();
        
        vm.prank(user1);
        market.buyYes(10000 * 1e6);
        
        assertLt(market.yesTokens(), initialYesTokens);
        assertGt(market.noTokens(), initialNoTokens);
        assertGt(yesToken.totalSupply(), 0);
        assertEq(noToken.totalSupply(), 0);
    }
    
    function testResolveMarketOnlyOracle() public {
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(user1);
        vm.expectRevert("Only oracle");
        market.resolveMarket(true);
        
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        assertTrue(market.resolved());
        assertTrue(market.yesWon());
    }
    
    function testResolveMarketBeforeEndTime() public {
        vm.prank(oracleOwner);
        vm.expectRevert("Market still active");
        oracle.resolveMarket(address(market), true);
    }
    
    function testCalculatePayoutYesWins() public {
        uint256 yesAmount = 10000 * 1e6;
        uint256 noAmount = 5000 * 1e6;
        
        vm.prank(user1);
        market.buyYes(yesAmount);
        
        vm.prank(user2);
        market.buyNo(noAmount);
        
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        uint256 payout = market.calculatePayout(user1);
        uint256 totalDeposited = yesAmount + noAmount;
        
        assertGt(payout, yesAmount);
        assertEq(payout, totalDeposited);
    }
    
    function testCalculatePayoutNoWins() public {
        uint256 yesAmount = 8000 * 1e6;
        uint256 noAmount = 12000 * 1e6;
        
        vm.prank(user1);
        market.buyYes(yesAmount);
        
        vm.prank(user2);
        market.buyNo(noAmount);
        
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), false);
        
        uint256 payout = market.calculatePayout(user2);
        uint256 totalDeposited = yesAmount + noAmount;
        
        assertGt(payout, noAmount);
        assertEq(payout, totalDeposited);
    }
    
    function testClaimWinnings() public {
        uint256 yesAmount = 10000 * 1e6;
        uint256 noAmount = 5000 * 1e6;
        
        vm.prank(user1);
        market.buyYes(yesAmount);
        
        vm.prank(user2);
        market.buyNo(noAmount);
        
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        uint256 initialBalance = usdc.balanceOf(user1);
        uint256 expectedPayout = market.calculatePayout(user1);
        
        vm.prank(user1);
        market.claimWinnings();
        
        assertEq(usdc.balanceOf(user1), initialBalance + expectedPayout);
        assertTrue(market.hasClaimed(user1));
        
        // Check that winning tokens were burned
        assertEq(yesToken.balanceOf(user1), 0);
    }
    
    function testCannotClaimTwice() public {
        uint256 yesAmount = 10000 * 1e6;
        
        vm.prank(user1);
        market.buyYes(yesAmount);
        
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        vm.prank(user1);
        market.claimWinnings();
        
        vm.prank(user1);
        vm.expectRevert("Already claimed");
        market.claimWinnings();
    }
    
    function testCannotTradeAfterExpiry() public {
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(user1);
        vm.expectRevert("Market inactive");
        market.buyYes(1000 * 1e6);
    }
    
    function testCannotTradeAfterResolution() public {
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        vm.prank(user1);
        vm.expectRevert("Market inactive");
        market.buyYes(1000 * 1e6);
    }
    
    function testCannotClaimBeforeResolution() public {
        vm.prank(user1);
        market.buyYes(1000 * 1e6);
        
        vm.prank(user1);
        vm.expectRevert("Market not resolved");
        market.claimWinnings();
    }
    
    function testGetUserPosition() public {
        uint256 yesAmount = 5000 * 1e6;
        uint256 noAmount = 3000 * 1e6;
        
        vm.prank(user1);
        market.buyYes(yesAmount);
        
        vm.prank(user1);
        market.buyNo(noAmount);
        
        (uint256 yesBalance, uint256 noBalance) = market.getUserPosition(user1);
        
        assertGt(yesBalance, 0);
        assertGt(noBalance, 0);
        assertEq(yesBalance, yesToken.balanceOf(user1));
        assertEq(noBalance, noToken.balanceOf(user1));
    }
    
    function testGetMarketState() public {
        vm.prank(user1);
        market.buyYes(1000 * 1e6);
        
        (
            uint256 yesTokens,
            uint256 noTokens,
            uint256 yesPrice,
            uint256 noPrice,
            uint256 totalUsdcDeposited,
            bool resolved,
            bool yesWon,
            bool frozen
        ) = market.getMarketState();
        
        assertLt(yesTokens, INITIAL_TOKENS);
        assertGt(noTokens, INITIAL_TOKENS);
        assertGt(yesPrice, 0);
        assertGt(noPrice, 0);
        assertEq(totalUsdcDeposited, 1000 * 1e6);
        assertFalse(resolved);
        assertFalse(yesWon);
        assertFalse(frozen);
    }
    
    function testFullMarketLifecycle() public {
        uint256 yesAmount = 20000 * 1e6;
        uint256 noAmount = 15000 * 1e6;
        
        vm.prank(user1);
        market.buyYes(yesAmount);
        
        vm.prank(user2);
        market.buyNo(noAmount);
        
        vm.warp(block.timestamp + 31 days);
        vm.prank(oracleOwner);
        oracle.resolveMarket(address(market), true);
        
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        
        vm.prank(user1);
        market.claimWinnings();
        
        uint256 user2Payout = market.calculatePayout(user2);
        if (user2Payout > 0) {
            vm.prank(user2);
            market.claimWinnings();
        }
        
        uint256 user1BalanceAfter = usdc.balanceOf(user1);
        uint256 user2BalanceAfter = usdc.balanceOf(user2);
        
        assertGt(user1BalanceAfter, user1BalanceBefore);
        assertEq(user2BalanceAfter, user2BalanceBefore);
        
        // Check that winning tokens were burned
        assertEq(yesToken.balanceOf(user1), 0);
    }
} 