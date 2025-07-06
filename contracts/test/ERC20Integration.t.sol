// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/PredictionMarket.sol";
import "../src/PredictionMarketFactory.sol";
import "../src/PredictionToken.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";
import "../src/IOracle.sol";

contract ERC20IntegrationTest is Test {
    PredictionMarketFactory public factory;
    PredictionMarket public market;
    PredictionToken public yesToken;
    PredictionToken public noToken;
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
    
    function testFactoryDeployment() public {
        assertEq(address(factory.usdc()), address(usdc));
        assertEq(address(factory.oracle()), address(oracle));
    }
    
    function testMarketDeploymentWithERC20Tokens() public {
        vm.startPrank(ALICE);
        (address marketAddress, address yesTokenAddress, address noTokenAddress) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        vm.stopPrank();
        
        market = PredictionMarket(marketAddress);
        yesToken = PredictionToken(yesTokenAddress);
        noToken = PredictionToken(noTokenAddress);
        
        assertEq(yesToken.name(), "YEShack-30d-KiffyPunch");
        assertEq(yesToken.symbol(), "YES-30d-KiffyPunch");
        assertEq(noToken.name(), "NOhack-30d-KiffyPunch");
        assertEq(noToken.symbol(), "NO-30d-KiffyPunch");
    }
    
    function testBuyingTokensMintsERC20() public {
        vm.startPrank(ALICE);
        (address marketAddress, address yesTokenAddress, address noTokenAddress) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        market = PredictionMarket(marketAddress);
        yesToken = PredictionToken(yesTokenAddress);
        noToken = PredictionToken(noTokenAddress);
        
        usdc.approve(marketAddress, type(uint256).max);
        market.buyYes(100e6);
        vm.stopPrank();
        
        assertEq(yesToken.balanceOf(ALICE), 100e6);
        assertEq(noToken.balanceOf(ALICE), 0);
    }
    
    function testTokenTransferability() public {
        vm.startPrank(ALICE);
        (address marketAddress, address yesTokenAddress, address noTokenAddress) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        market = PredictionMarket(marketAddress);
        yesToken = PredictionToken(yesTokenAddress);
        noToken = PredictionToken(noTokenAddress);
        
        usdc.approve(marketAddress, type(uint256).max);
        market.buyYes(100e6);
        
        yesToken.transfer(BOB, 50e6);
        vm.stopPrank();
        
        assertEq(yesToken.balanceOf(ALICE), 50e6);
        assertEq(yesToken.balanceOf(BOB), 50e6);
    }
    
    function testTokenApprovalAndTransferFrom() public {
        vm.startPrank(ALICE);
        (address marketAddress, address yesTokenAddress, address noTokenAddress) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        market = PredictionMarket(marketAddress);
        yesToken = PredictionToken(yesTokenAddress);
        noToken = PredictionToken(noTokenAddress);
        
        usdc.approve(marketAddress, type(uint256).max);
        market.buyYes(100e6);
        
        yesToken.approve(BOB, 50e6);
        vm.stopPrank();
        
        vm.prank(BOB);
        yesToken.transferFrom(ALICE, BOB, 50e6);
        
        assertEq(yesToken.balanceOf(ALICE), 50e6);
        assertEq(yesToken.balanceOf(BOB), 50e6);
    }
    
    function testClaimWinningsBurnsTokens() public {
        vm.startPrank(ALICE);
        (address marketAddress, address yesTokenAddress, address noTokenAddress) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        market = PredictionMarket(marketAddress);
        yesToken = PredictionToken(yesTokenAddress);
        noToken = PredictionToken(noTokenAddress);
        
        usdc.approve(marketAddress, type(uint256).max);
        market.buyYes(100e6);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(address(oracle));
        market.resolveMarket(true);
        
        vm.prank(ALICE);
        market.claimWinnings();
        
        assertEq(yesToken.balanceOf(ALICE), 0);
    }
    
    function testMultipleMarketsIndependentTokens() public {
        vm.startPrank(ALICE);
        (address market1Address, address yes1Address, address no1Address) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        (address market2Address, address yes2Address, address no2Address) = factory.deployMarket(
            "Ankr",
            30
        );
        
        PredictionToken yes1 = PredictionToken(yes1Address);
        PredictionToken yes2 = PredictionToken(yes2Address);
        
        usdc.approve(market1Address, type(uint256).max);
        usdc.approve(market2Address, type(uint256).max);
        
        PredictionMarket(market1Address).buyYes(100e6);
        PredictionMarket(market2Address).buyYes(100e6);
        vm.stopPrank();
        
        assertEq(yes1.balanceOf(ALICE), 100e6);
        assertEq(yes2.balanceOf(ALICE), 100e6);
        
        assertNotEq(yes1Address, yes2Address);
        assertNotEq(no1Address, no2Address);
    }
    
    function testDuplicateMarketPrevention() public {
        vm.startPrank(ALICE);
        factory.deployMarket("KiffyPunch", 30);
        
        vm.expectRevert("Market already exists");
        factory.deployMarket("KiffyPunch", 30);
        vm.stopPrank();
    }
    
    function testFactoryMarketLookup() public {
        vm.startPrank(ALICE);
        (address marketAddress, address yesTokenAddress, address noTokenAddress) = factory.deployMarket(
            "KiffyPunch",
            30
        );
        vm.stopPrank();
        
        PredictionMarketFactory.MarketInfo memory info = factory.getMarketInfo(
            "KiffyPunch",
            block.timestamp + (30 * 1 days)
        );
        
        assertTrue(info.exists);
        assertEq(info.market, marketAddress);
        assertEq(info.yesToken, yesTokenAddress);
        assertEq(info.noToken, noTokenAddress);
        assertEq(info.protocol, "KiffyPunch");
        assertEq(info.category, "hack-insurance");
        assertEq(info.expiry, block.timestamp + (30 * 1 days));
        assertEq(info.durationInDays, 30);
    }
    
    function testGetMarketsByExpiry() public {
        vm.startPrank(ALICE);
        (address market30d, , ) = factory.deployMarket("KiffyPunch", 30);
        (address market90d, , ) = factory.deployMarket("Ankr", 90);
        vm.stopPrank();
        
        address[] memory markets30d = factory.getMarketsByExpiry(30);
        address[] memory markets90d = factory.getMarketsByExpiry(90);
        
        assertEq(markets30d.length, 1);
        assertEq(markets90d.length, 1);
        assertEq(markets30d[0], market30d);
        assertEq(markets90d[0], market90d);
    }
    
    function testGetAllActiveMarkets() public {
        vm.startPrank(ALICE);
        (address market1, , ) = factory.deployMarket("KiffyPunch", 30);
        (address market2, , ) = factory.deployMarket("Ankr", 90);
        vm.stopPrank();
        
        address[] memory allMarkets = factory.getAllMarkets();
        assertEq(allMarkets.length, 2);
        assertEq(allMarkets[0], market1);
        assertEq(allMarkets[1], market2);
    }
    
    function testMarketProtocolAndCategoryFields() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        vm.stopPrank();
        
        market = PredictionMarket(marketAddress);
        assertEq(market.protocolName(), "KiffyPunch");
        assertEq(market.category(), "hack-insurance");
    }
    
    function testEnhancedMarketInfo() public {
        vm.startPrank(ALICE);
        (address marketAddress, , ) = factory.deployMarket("KiffyPunch", 30);
        vm.stopPrank();
        
        PredictionMarketFactory.MarketInfo memory info = factory.getMarketInfo(
            "KiffyPunch",
            block.timestamp + (30 * 1 days)
        );
        
        assertEq(info.question, "Will KiffyPunch be hacked?");
        assertTrue(info.exists);
        assertEq(info.market, marketAddress);
    }
    
    function testUnsupportedProtocolsAndDurations() public {
        vm.startPrank(ALICE);
        vm.expectRevert("Protocol not supported");
        factory.deployMarket("UnsupportedProtocol", 30);
        
        vm.expectRevert("Duration not supported");
        factory.deployMarket("KiffyPunch", 45);
        vm.stopPrank();
    }
} 