// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IOracle {
    /**
     * @dev Checks if the oracle can resolve a specific market
     * @param market The address of the market to check
     * @return bool True if the oracle can resolve this market
     */
    function canResolve(address market) external view returns (bool);
    
    /**
     * @dev Resolves a market with the given result
     * @param market The address of the market to resolve
     * @param result The resolution result (true for YES wins, false for NO wins)
     */
    function resolveMarket(address market, bool result) external;
    
    /**
     * @dev Gets the resolution status and result for a market
     * @param market The address of the market to check
     * @return resolved True if the market has been resolved
     * @return result The resolution result (only valid if resolved is true)
     */
    function getResolution(address market) external view returns (bool resolved, bool result);
    
    /**
     * @dev Checks if the oracle can freeze/unfreeze a market
     * @param market The address of the market to check
     * @return bool True if the oracle can freeze/unfreeze this market
     */
    function canFreeze(address market) external view returns (bool);
    
    /**
     * @dev Freezes a market to prevent trading
     * @param market The address of the market to freeze
     */
    function freezeMarket(address market) external;
    
    /**
     * @dev Unfreezes a market to allow trading
     * @param market The address of the market to unfreeze
     */
    function unfreezeMarket(address market) external;
    
    /**
     * @dev Emitted when a market is resolved by the oracle
     * @param market The address of the resolved market
     * @param result The resolution result
     */
    event MarketResolved(address indexed market, bool result);
    
    /**
     * @dev Emitted when a market is frozen by the oracle
     * @param market The address of the frozen market
     */
    event MarketFrozen(address indexed market);
    
    /**
     * @dev Emitted when a market is unfrozen by the oracle
     * @param market The address of the unfrozen market
     */
    event MarketUnfrozen(address indexed market);
} 