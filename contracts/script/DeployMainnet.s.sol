// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/PredictionMarketFactory.sol";
import "../src/MockOracle.sol";
import "../src/MockUSDC.sol";

contract DeployMainnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts to mainnet...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockUSDC first
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));
        
        // Deploy MockOracle
        MockOracle oracle = new MockOracle();
        console.log("MockOracle deployed at:", address(oracle));
        
        // Deploy PredictionMarketFactory with USDC and Oracle
        PredictionMarketFactory factory = new PredictionMarketFactory(address(usdc), oracle);
        console.log("PredictionMarketFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
        
        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Ethereum Mainnet");
        console.log("Deployer:", deployer);
        console.log("MockUSDC:", address(usdc));
        console.log("MockOracle:", address(oracle));
        console.log("Factory:", address(factory));
        console.log("\n=== UPDATE FRONTEND ===");
        console.log("NEXT_PUBLIC_FACTORY_ADDRESS=%s", address(factory));
        console.log("NEXT_PUBLIC_USDC_ADDRESS=%s", address(usdc));
        console.log("NEXT_PUBLIC_ORACLE_ADDRESS=%s", address(oracle));
    }
} 