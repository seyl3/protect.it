// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/FlowHackWatcher.sol";
import "../src/PredictionMarketFactory.sol";

contract DeployFlowHackWatcher is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address lzEndpoint = vm.envAddress("LZ_ENDPOINT");
        address marketFactory = vm.envAddress("MARKET_FACTORY");
        address umaReceiver = vm.envAddress("UMA_RECEIVER");
        
        vm.startBroadcast(deployerPrivateKey);
        
        FlowHackWatcher watcher = new FlowHackWatcher(
            lzEndpoint,
            marketFactory,
            umaReceiver
        );
        
        vm.stopBroadcast();
    }
} 