// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IOracle.sol";

interface IPredictionMarket {
    function resolveMarket(bool _yesWon) external;
    function freezeMarket() external;
    function unfreezeMarket() external;
    function resolved() external view returns (bool);
    function yesWon() external view returns (bool);
    function oracle() external view returns (address);
}

contract MockOracle is IOracle {
    address public immutable owner;
    
    // Track resolution status for each market
    mapping(address => bool) public marketResolved;
    mapping(address => bool) public marketResult;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /**
     * @dev Checks if the oracle can resolve a specific market
     * Only markets that have this oracle set can be resolved
     */
    function canResolve(address market) external view override returns (bool) {
        try IPredictionMarket(market).oracle() returns (address marketOracle) {
            return marketOracle == address(this);
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Resolves a market with the given result
     * Only the owner can resolve markets
     */
    function resolveMarket(address market, bool result) external override onlyOwner {
        require(this.canResolve(market), "Cannot resolve this market");
        require(!marketResolved[market], "Market already resolved");
        
        // Call the market's resolve function
        IPredictionMarket(market).resolveMarket(result);
        
        // Track resolution in oracle
        marketResolved[market] = true;
        marketResult[market] = result;
        
        emit MarketResolved(market, result);
    }
    
    /**
     * @dev Gets the resolution status and result for a market
     */
    function getResolution(address market) external view override returns (bool resolved, bool result) {
        return (marketResolved[market], marketResult[market]);
    }
    
    /**
     * @dev Checks if the oracle can freeze/unfreeze a market
     */
    function canFreeze(address market) external view override returns (bool) {
        try IPredictionMarket(market).oracle() returns (address marketOracle) {
            return marketOracle == address(this);
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Freezes a market to prevent trading
     */
    function freezeMarket(address market) external override onlyOwner {
        require(this.canFreeze(market), "Cannot freeze this market");
        
        IPredictionMarket(market).freezeMarket();
        
        emit MarketFrozen(market);
    }
    
    /**
     * @dev Unfreezes a market to allow trading
     */
    function unfreezeMarket(address market) external override onlyOwner {
        require(this.canFreeze(market), "Cannot unfreeze this market");
        
        IPredictionMarket(market).unfreezeMarket();
        
        emit MarketUnfrozen(market);
    }
    
    /**
     * @dev Get the owner of this oracle
     */
    function getOwner() external view returns (address) {
        return owner;
    }
} 