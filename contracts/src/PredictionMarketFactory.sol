// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./PredictionMarket.sol";
import "./PredictionToken.sol";
import "./MockUSDC.sol";
import "./IOracle.sol";

contract PredictionMarketFactory {
    struct MarketInfo {
        address market;
        address yesToken;
        address noToken;
        string protocol;
        string category;
        uint256 expiry;
        uint256 durationInDays;
        string question;
        bool exists;
    }
    
    IERC20 public immutable usdc;
    IOracle public immutable oracle;
    
    mapping(bytes32 => MarketInfo) public markets;
    address[] public allMarkets;
    mapping(string => address[]) public marketsByProtocol;
    mapping(uint256 => address[]) public marketsByExpiry;
    
    // Predefined protocols for dropdown menu
    string[] public supportedProtocols;
    
    // Fixed expiry periods (in days)
    uint256[] public supportedDurations = [30, 90, 180, 365]; // 1 month, 3 months, 6 months, 1 year
    
    event MarketCreated(
        address indexed market,
        address indexed yesToken,
        address indexed noToken,
        string protocol,
        uint256 expiry,
        string question
    );
    
    constructor(address _usdc, IOracle _oracle) {
        usdc = IERC20(_usdc);
        oracle = _oracle;
        
        supportedProtocols.push("KiffyPunch");
        supportedProtocols.push("Ankr");
        supportedProtocols.push("Increment Finance");
        supportedProtocols.push("MORE Markets");
        supportedProtocols.push("Sturdy");
        supportedProtocols.push("Trado Finance");
        supportedProtocols.push("Fixes World");
        supportedProtocols.push("Beezie");

    }
    
    function deployMarket(
        string memory protocol,
        uint256 durationInDays
    ) external returns (address market, address yesToken, address noToken) {
        require(isProtocolSupported(protocol), "Protocol not supported");
        require(isDurationSupported(durationInDays), "Duration not supported");
        
        uint256 expiry = block.timestamp + (durationInDays * 1 days);
        bytes32 marketId = keccak256(abi.encodePacked(protocol, expiry));
        require(!markets[marketId].exists, "Market already exists");
        
        // Deploy tokens and market
        (market, yesToken, noToken) = _deployMarketContracts(protocol, durationInDays);
        
        // Store market info
        markets[marketId] = MarketInfo({
            market: market,
            yesToken: yesToken,
            noToken: noToken,
            protocol: protocol,
            category: "hack-insurance",
            expiry: expiry,
            durationInDays: durationInDays,
            question: string(abi.encodePacked("Will ", protocol, " be hacked?")),
            exists: true
        });
        
        // Add to arrays for enumeration
        allMarkets.push(market);
        marketsByProtocol[protocol].push(market);
        marketsByExpiry[durationInDays].push(market);
        
        emit MarketCreated(market, yesToken, noToken, protocol, expiry, string(abi.encodePacked("Will ", protocol, " be hacked?")));
        
        return (market, yesToken, noToken);
    }
    
    function _deployMarketContracts(
        string memory protocol,
        uint256 durationInDays
    ) internal returns (address market, address yesToken, address noToken) {
        string memory durationStr = _toString(durationInDays);
        string memory yesName = string(abi.encodePacked("YEShack-", durationStr, "d-", protocol));
        string memory noName = string(abi.encodePacked("NOhack-", durationStr, "d-", protocol));
        string memory yesSymbol = string(abi.encodePacked("YES-", durationStr, "d-", protocol));
        string memory noSymbol = string(abi.encodePacked("NO-", durationStr, "d-", protocol));
        
        string memory question = string(abi.encodePacked("Will ", protocol, " be hacked?"));
        
        yesToken = address(new PredictionToken(yesName, yesSymbol, address(1)));
        noToken = address(new PredictionToken(noName, noSymbol, address(1)));
        
        // Deploy market with tokens
        market = address(new PredictionMarket(
            address(usdc),
            oracle,
            yesToken,
            noToken,
            question,
            protocol,
            "hack-insurance",
            durationInDays
        ));
        
        // Update token market addresses
        PredictionToken(yesToken).setMarket(market);
        PredictionToken(noToken).setMarket(market);
    }
    
    function getMarketInfo(string memory protocol, uint256 expiry) 
        external 
        view 
        returns (MarketInfo memory) 
    {
        bytes32 marketId = keccak256(abi.encodePacked(protocol, expiry));
        return markets[marketId];
    }
    
    function getMarketsByProtocol(string memory protocol) 
        external 
        view 
        returns (address[] memory) 
    {
        return marketsByProtocol[protocol];
    }
    
    function getMarketsByExpiry(uint256 durationInDays) 
        external 
        view 
        returns (address[] memory) 
    {
        return marketsByExpiry[durationInDays];
    }
    
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }
    
    function getAllActiveMarkets() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active markets
        for (uint256 i = 0; i < allMarkets.length; i++) {
            PredictionMarket market = PredictionMarket(allMarkets[i]);
            if (block.timestamp <= market.endTime() && !market.resolved()) {
                activeCount++;
            }
        }
        
        // Create array of active markets
        address[] memory activeMarkets = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allMarkets.length; i++) {
            PredictionMarket market = PredictionMarket(allMarkets[i]);
            if (block.timestamp <= market.endTime() && !market.resolved()) {
                activeMarkets[index] = allMarkets[i];
                index++;
            }
        }
        
        return activeMarkets;
    }
    
    function getSupportedProtocols() external view returns (string[] memory) {
        return supportedProtocols;
    }
    
    function getSupportedDurations() external view returns (uint256[] memory) {
        return supportedDurations;
    }
    
    function isProtocolSupported(string memory protocol) public view returns (bool) {
        for (uint256 i = 0; i < supportedProtocols.length; i++) {
            if (keccak256(bytes(supportedProtocols[i])) == keccak256(bytes(protocol))) {
                return true;
            }
        }
        return false;
    }
    
    function isDurationSupported(uint256 duration) public view returns (bool) {
        for (uint256 i = 0; i < supportedDurations.length; i++) {
            if (supportedDurations[i] == duration) {
                return true;
            }
        }
        return false;
    }
    
    // Helper function to convert timestamp to simple date string
    function _timestampToDateString(uint256 timestamp) internal pure returns (string memory) {
        // Simplified: just return timestamp as string for now
        // In production, you'd want proper date formatting
        return _toString(timestamp);
    }
    
    // Helper function to convert string to uppercase (simplified)
    function _toUpper(string memory str) internal pure returns (string memory) {
        // Simplified: just return as is for now
        // In production, you'd implement proper case conversion
        return str;
    }
    
    // Helper function to convert uint to string
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
} 