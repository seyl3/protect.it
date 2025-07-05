// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import "../src/PredictionMarketFactory.sol";
import "../src/PredictionMarket.sol";
import "../src/PredictionToken.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";

contract ERC20IntegrationTest is Test {
    PredictionMarketFactory public factory;
    MockUSDC public usdc;
    MockOracle public oracle;
    
    address public oracleOwner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);
    
    uint256 public constant INITIAL_USDC = 1000000 * 1e6;
    
    function setUp() public {
        usdc = new MockUSDC();
        
        vm.prank(oracleOwner);
        oracle = new MockOracle();
        
        factory = new PredictionMarketFactory(address(usdc), oracle);
        
        // Mint USDC to users
        usdc.mint(user1, INITIAL_USDC);
        usdc.mint(user2, INITIAL_USDC);
        usdc.mint(user3, INITIAL_USDC);
    }
    
    function testFactoryDeployment() public {
        assertEq(address(factory.usdc()), address(usdc));
        assertEq(address(factory.oracle()), address(oracle));
        
        string[] memory protocols = factory.getSupportedProtocols();
        assertGt(protocols.length, 0, "Should have supported protocols");
        
        uint256[] memory durations = factory.getSupportedDurations();
        assertEq(durations.length, 4, "Should have 4 supported durations");
        assertEq(durations[0], 30, "First duration should be 30 days");
        assertEq(durations[1], 90, "Second duration should be 90 days");
        assertEq(durations[2], 180, "Third duration should be 180 days");
        assertEq(durations[3], 365, "Fourth duration should be 365 days");
    }
    
    function testMarketDeploymentWithERC20Tokens() public {
        // Deploy a market for Ankr with 90 days duration
        (address market, address yesToken, address noToken) = factory.deployMarket("Ankr", 90);
        
        // Verify contracts were deployed
        assertTrue(market != address(0), "Market should be deployed");
        assertTrue(yesToken != address(0), "YES token should be deployed");
        assertTrue(noToken != address(0), "NO token should be deployed");
        
        // Check token properties
        PredictionToken yes = PredictionToken(yesToken);
        PredictionToken no = PredictionToken(noToken);
        
        assertEq(yes.market(), market, "YES token should reference market");
        assertEq(no.market(), market, "NO token should reference market");
        assertEq(yes.decimals(), 18, "YES token should have 18 decimals");
        assertEq(no.decimals(), 18, "NO token should have 18 decimals");
        
        // Check token names contain protocol and hack info
        string memory yesName = yes.name();
        string memory noName = no.name();
        
        // Names should contain "YEShack" and "NOhack" respectively
        assertTrue(bytes(yesName).length > 0, "YES token should have a name");
        assertTrue(bytes(noName).length > 0, "NO token should have a name");
        
        console.log("YES token name:", yesName);
        console.log("NO token name:", noName);
        console.log("YES token symbol:", yes.symbol());
        console.log("NO token symbol:", no.symbol());
    }
    
    function testBuyingTokensMintsERC20() public {
        // Deploy market
        (address marketAddr, address yesTokenAddr, address noTokenAddr) = factory.deployMarket("Uniswap", 90);
        
        PredictionMarket market = PredictionMarket(marketAddr);
        PredictionToken yesToken = PredictionToken(yesTokenAddr);
        PredictionToken noToken = PredictionToken(noTokenAddr);
        
        uint256 usdcAmount = 10000 * 1e6; // 10,000 USDC
        
        // Approve market to spend USDC
        vm.prank(user1);
        usdc.approve(marketAddr, usdcAmount);
        
        // Buy YES tokens
        vm.prank(user1);
        market.buyYes(usdcAmount);
        
        // Check that ERC20 tokens were minted
        uint256 userYesBalance = yesToken.balanceOf(user1);
        assertGt(userYesBalance, 0, "User should have YES tokens");
        assertEq(yesToken.totalSupply(), userYesBalance, "Total supply should equal user balance");
        
        // Check that user can query position
        (uint256 yesBalance, uint256 noBalance) = market.getUserPosition(user1);
        assertEq(yesBalance, userYesBalance, "getUserPosition should return token balance");
        assertEq(noBalance, 0, "User should have no NO tokens");
        
        console.log("User YES token balance:", userYesBalance / 1e18);
        console.log("YES token total supply:", yesToken.totalSupply() / 1e18);
    }
    
    function testTokenTransferability() public {
        // Deploy market
        (address marketAddr, address yesTokenAddr, address noTokenAddr) = factory.deployMarket("Aave", 90);
        
        PredictionMarket market = PredictionMarket(marketAddr);
        PredictionToken yesToken = PredictionToken(yesTokenAddr);
        
        uint256 usdcAmount = 5000 * 1e6;
        
        // User1 buys YES tokens
        vm.prank(user1);
        usdc.approve(marketAddr, usdcAmount);
        vm.prank(user1);
        market.buyYes(usdcAmount);
        
        uint256 user1Balance = yesToken.balanceOf(user1);
        uint256 transferAmount = user1Balance / 2;
        
        // User1 transfers half their tokens to User2
        vm.prank(user1);
        yesToken.transfer(user2, transferAmount);
        
        // Check balances after transfer
        assertEq(yesToken.balanceOf(user1), user1Balance - transferAmount, "User1 balance should decrease");
        assertEq(yesToken.balanceOf(user2), transferAmount, "User2 should receive tokens");
        
        // Check that market position tracking reflects new balances
        (uint256 user1Yes, ) = market.getUserPosition(user1);
        (uint256 user2Yes, ) = market.getUserPosition(user2);
        
        assertEq(user1Yes, user1Balance - transferAmount, "Market should track User1's new balance");
        assertEq(user2Yes, transferAmount, "Market should track User2's balance");
        
        console.log("Transfer successful - YES tokens are transferable!");
    }
    
    function testTokenApprovalAndTransferFrom() public {
        // Deploy market
        (address marketAddr, address yesTokenAddr, address noTokenAddr) = factory.deployMarket("Compound", 90);
        
        PredictionMarket market = PredictionMarket(marketAddr);
        PredictionToken yesToken = PredictionToken(yesTokenAddr);
        
        // User1 buys tokens
        vm.prank(user1);
        usdc.approve(marketAddr, 5000 * 1e6);
        vm.prank(user1);
        market.buyYes(5000 * 1e6);
        
        uint256 user1Balance = yesToken.balanceOf(user1);
        uint256 approvalAmount = user1Balance / 3;
        
        // User1 approves User3 to spend their tokens
        vm.prank(user1);
        yesToken.approve(user3, approvalAmount);
        
        // Check allowance
        assertEq(yesToken.allowance(user1, user3), approvalAmount, "Allowance should be set");
        
        // User3 transfers tokens from User1 to User2
        vm.prank(user3);
        yesToken.transferFrom(user1, user2, approvalAmount);
        
        // Check final balances and allowance
        assertEq(yesToken.balanceOf(user1), user1Balance - approvalAmount, "User1 balance should decrease");
        assertEq(yesToken.balanceOf(user2), approvalAmount, "User2 should receive tokens");
        assertEq(yesToken.allowance(user1, user3), 0, "Allowance should be consumed");
        
        console.log("Approval and transferFrom working correctly!");
    }
    
    function testClaimWinningsBurnsTokens() public {
        // Deploy market
        (address marketAddr, address yesTokenAddr, address noTokenAddr) = factory.deployMarket("MakerDAO", 90);
        
        PredictionMarket market = PredictionMarket(marketAddr);
        PredictionToken yesToken = PredictionToken(yesTokenAddr);
        PredictionToken noToken = PredictionToken(noTokenAddr);
        
        uint256 yesAmount = 10000 * 1e6;
        uint256 noAmount = 5000 * 1e6;
        
        // Users buy tokens
        vm.prank(user1);
        usdc.approve(marketAddr, yesAmount);
        vm.prank(user1);
        market.buyYes(yesAmount);
        
        vm.prank(user2);
        usdc.approve(marketAddr, noAmount);
        vm.prank(user2);
        market.buyNo(noAmount);
        
        uint256 user1YesBalance = yesToken.balanceOf(user1);
        uint256 user2NoBalance = noToken.balanceOf(user2);
        uint256 totalYesSupply = yesToken.totalSupply();
        uint256 totalNoSupply = noToken.totalSupply();
        
        assertGt(user1YesBalance, 0, "User1 should have YES tokens");
        assertGt(user2NoBalance, 0, "User2 should have NO tokens");
        
        // Fast forward and resolve market (YES wins)
        vm.warp(block.timestamp + 91 days);
        vm.prank(oracleOwner);
        oracle.resolveMarket(marketAddr, true);
        
        // User1 claims winnings (should burn their YES tokens)
        uint256 user1UsdcBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings();
        
        // Check that tokens were burned
        assertEq(yesToken.balanceOf(user1), 0, "User1's YES tokens should be burned");
        assertEq(yesToken.totalSupply(), totalYesSupply - user1YesBalance, "YES supply should decrease");
        
        // Check that user received USDC payout
        assertGt(usdc.balanceOf(user1), user1UsdcBefore, "User1 should receive USDC payout");
        
        // User2 (NO tokens) should not be able to claim
        vm.prank(user2);
        vm.expectRevert("No winnings");
        market.claimWinnings();
        
        // User2's NO tokens should still exist (they lost)
        assertEq(noToken.balanceOf(user2), user2NoBalance, "User2's NO tokens should remain");
        
        console.log("Token burning on winning claims works correctly!");
    }
    
    function testMultipleMarketsIndependentTokens() public {
        // Deploy two different markets
        (address market1Addr, address yesToken1Addr, address noToken1Addr) = factory.deployMarket("Chainlink", 90);
        (address market2Addr, address yesToken2Addr, address noToken2Addr) = factory.deployMarket("Lido", 180);
        
        PredictionToken yesToken1 = PredictionToken(yesToken1Addr);
        PredictionToken yesToken2 = PredictionToken(yesToken2Addr);
        
        // Verify tokens are different contracts
        assertTrue(yesToken1Addr != yesToken2Addr, "Tokens should be different contracts");
        assertTrue(yesToken1.market() != yesToken2.market(), "Tokens should reference different markets");
        
        // Verify token names are different
        string memory name1 = yesToken1.name();
        string memory name2 = yesToken2.name();
        assertFalse(keccak256(bytes(name1)) == keccak256(bytes(name2)), "Token names should be different");
        
        console.log("Market 1 YES token:", name1);
        console.log("Market 2 YES token:", name2);
        
        // User can buy tokens in both markets
        vm.prank(user1);
        usdc.approve(market1Addr, 5000 * 1e6);
        vm.prank(user1);
        PredictionMarket(market1Addr).buyYes(5000 * 1e6);
        
        vm.prank(user1);
        usdc.approve(market2Addr, 7000 * 1e6);
        vm.prank(user1);
        PredictionMarket(market2Addr).buyYes(7000 * 1e6);
        
        // Check that user has tokens in both markets
        assertGt(yesToken1.balanceOf(user1), 0, "User should have tokens in market 1");
        assertGt(yesToken2.balanceOf(user1), 0, "User should have tokens in market 2");
        
        console.log("Multiple independent markets working correctly!");
    }
    
    function testFactoryMarketLookup() public {
        // Deploy markets
        factory.deployMarket("Balancer", 90);
        factory.deployMarket("Synthetix", 180);
        factory.deployMarket("Balancer", 365); // Different duration for same protocol
        
        // Check market lookup by protocol
        address[] memory balancerMarkets = factory.getMarketsByProtocol("Balancer");
        assertEq(balancerMarkets.length, 2, "Should have 2 Balancer markets");
        
        address[] memory synthetixMarkets = factory.getMarketsByProtocol("Synthetix");
        assertEq(synthetixMarkets.length, 1, "Should have 1 Synthetix market");
        
        // Check all markets
        address[] memory allMarkets = factory.getAllMarkets();
        assertEq(allMarkets.length, 3, "Should have 3 total markets");
        
        console.log("Factory market lookup working correctly!");
    }
    
    function testUnsupportedProtocolsAndDurations() public {
        // Try to deploy with unsupported protocol
        vm.expectRevert("Protocol not supported");
        factory.deployMarket("UnsupportedProtocol", 90);
        
        // Try to deploy with unsupported duration
        vm.expectRevert("Duration not supported");
        factory.deployMarket("Ankr", 45); // 45 days not in supported list
        
        console.log("Protocol and duration validation working correctly!");
    }
    
    function testDuplicateMarketPrevention() public {
        // Deploy first market
        factory.deployMarket("Yearn", 90);
        
        // Try to deploy duplicate market (same protocol and duration)
        vm.expectRevert("Market already exists");
        factory.deployMarket("Yearn", 90);
        
        console.log("Duplicate market prevention working correctly!");
    }
    
    function testMarketProtocolAndCategoryFields() public {
        // Deploy market
        (address marketAddr, , ) = factory.deployMarket("Curve", 90);
        
        PredictionMarket market = PredictionMarket(marketAddr);
        
        // Check that market has protocol and category fields
        assertEq(market.protocolName(), "Curve", "Market should have correct protocol name");
        assertEq(market.category(), "hack-insurance", "Market should have hack-insurance category");
        
        console.log("Market protocol name:", market.protocolName());
        console.log("Market category:", market.category());
    }
    
    function testGetMarketsByExpiry() public {
        // Deploy markets with different expiry periods
        factory.deployMarket("Ankr", 30);
        factory.deployMarket("Uniswap", 30);
        factory.deployMarket("Aave", 90);
        factory.deployMarket("Compound", 180);
        factory.deployMarket("Lido", 180);
        
        // Check markets by expiry
        address[] memory markets30d = factory.getMarketsByExpiry(30);
        address[] memory markets90d = factory.getMarketsByExpiry(90);
        address[] memory markets180d = factory.getMarketsByExpiry(180);
        address[] memory markets365d = factory.getMarketsByExpiry(365);
        
        assertEq(markets30d.length, 2, "Should have 2 markets with 30 days expiry");
        assertEq(markets90d.length, 1, "Should have 1 market with 90 days expiry");
        assertEq(markets180d.length, 2, "Should have 2 markets with 180 days expiry");
        assertEq(markets365d.length, 0, "Should have 0 markets with 365 days expiry");
        
        console.log("Markets by expiry lookup working correctly!");
    }
    
    function testGetAllActiveMarkets() public {
        // Deploy some markets
        factory.deployMarket("Chainlink", 30);
        factory.deployMarket("Synthetix", 90);
        
        // Get all active markets
        address[] memory activeMarkets = factory.getAllActiveMarkets();
        assertEq(activeMarkets.length, 2, "Should have 2 active markets");
        
        // Fast forward past first market expiry
        vm.warp(block.timestamp + 31 days);
        
        activeMarkets = factory.getAllActiveMarkets();
        assertEq(activeMarkets.length, 1, "Should have 1 active market after first expires");
        
        // Fast forward past all markets
        vm.warp(block.timestamp + 91 days);
        
        activeMarkets = factory.getAllActiveMarkets();
        assertEq(activeMarkets.length, 0, "Should have 0 active markets after all expire");
        
        console.log("Active markets filtering working correctly!");
    }
    
    function testEnhancedMarketInfo() public {
        // Deploy market
        factory.deployMarket("Balancer", 180);
        
        uint256 expiry = block.timestamp + (180 * 1 days);
        
        // Get market info
        PredictionMarketFactory.MarketInfo memory marketInfo = factory.getMarketInfo("Balancer", expiry);
        
        assertTrue(marketInfo.exists, "Market should exist");
        assertEq(marketInfo.protocol, "Balancer", "Should have correct protocol");
        assertEq(marketInfo.category, "hack-insurance", "Should have correct category");
        assertEq(marketInfo.durationInDays, 180, "Should have correct duration");
        assertTrue(bytes(marketInfo.question).length > 0, "Should have a question");
        
        console.log("Enhanced market info working correctly!");
        console.log("Protocol:", marketInfo.protocol);
        console.log("Category:", marketInfo.category);
        console.log("Duration:", marketInfo.durationInDays);
        console.log("Question:", marketInfo.question);
    }
} 