// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import "../src/PredictionMarketFactory.sol";
import "../src/PredictionMarket.sol";
import "../src/MockUSDC.sol";
import "../src/MockOracle.sol";

contract DeployPredictionMarket is Script {
    function run() external {
        vm.startBroadcast();
        
        // Deploy base contracts
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));
        
        MockOracle oracle = new MockOracle();
        console.log("MockOracle deployed at:", address(oracle));
        
        // Deploy factory
        PredictionMarketFactory factory = new PredictionMarketFactory(
            address(usdc),
            oracle
        );
        console.log("PredictionMarketFactory deployed at:", address(factory));
        
        // Deploy a sample market using the factory
        (address market, address yesToken, address noToken) = factory.deployMarket(
            "Ankr",
            90 // 90 days
        );
        
        console.log("Sample Market deployed:");
        console.log("  Market address:", market);
        console.log("  YES token address:", yesToken);
        console.log("  NO token address:", noToken);
        
        // Get market info
        PredictionMarketFactory.MarketInfo memory marketInfo = factory.getMarketInfo(
            "Ankr", 
            block.timestamp + (90 * 1 days)
        );
        console.log("  Market question:", marketInfo.question);
        
        // Mint USDC to oracle owner for testing
        usdc.mint(oracle.getOwner(), 1000000 * 1e6);
        console.log("Minted 1M USDC to oracle owner for testing");
        
        // Show supported protocols and durations
        string[] memory protocols = factory.getSupportedProtocols();
        console.log("Supported protocols count:", protocols.length);
        
        uint256[] memory durations = factory.getSupportedDurations();
        console.log("Supported durations count:", durations.length);
        
        vm.stopBroadcast();
    }
} 