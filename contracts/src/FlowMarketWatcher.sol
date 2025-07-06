// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILayerZeroEndpoint.sol";
import "./PredictionMarketFactory.sol";

/**
 * @title FlowMarketWatcher
 * @notice Surveille les nouveaux marchés sur Flow et envoie les requêtes à UMA via LayerZero
 */
contract FlowMarketWatcher {
    ILayerZeroEndpoint public immutable lzEndpoint;
    PredictionMarketFactory public immutable marketFactory;
    address public immutable bridge;
    uint16 public constant UMA_CHAIN_ID = 1; // À ajuster selon le vrai chain ID d'UMA
    address public owner;
    
    event MarketQuerySent(
        bytes32 indexed queryId,
        string protocol,
        uint256 startTime,
        uint256 endTime,
        address market
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyFactory() {
        require(msg.sender == address(marketFactory), "Only factory");
        _;
    }
    
    constructor(
        address _lzEndpoint,
        address _marketFactory,
        address _bridge
    ) {
        require(_lzEndpoint != address(0), "Invalid LZ endpoint");
        require(_marketFactory != address(0), "Invalid market factory");
        require(_bridge != address(0), "Invalid bridge address");
        
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        marketFactory = PredictionMarketFactory(_marketFactory);
        bridge = _bridge;
        owner = msg.sender;
    }
    
    /**
     * @notice Appelé par la factory lors du déploiement d'un nouveau marché
     */
    function onMarketCreated(
        string memory protocol,
        uint256 duration,
        address market
    ) external payable onlyFactory {
        require(msg.value >= 0.01 ether, "Insufficient LZ fees");
        require(bytes(protocol).length > 0, "Empty protocol name");
        require(market != address(0), "Invalid market address");
        require(duration > 0, "Invalid duration");
        
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (duration * 1 days);
        
        bytes32 queryId = keccak256(abi.encodePacked(
            protocol,
            startTime,
            endTime,
            market
        ));
        
        // Préparer le payload pour le bridge
        bytes memory payload = abi.encode(
            queryId,
            protocol,
            startTime,
            endTime,
            market
        );
        
        // Envoyer au bridge via LayerZero
        lzEndpoint.send{value: msg.value}(
            UMA_CHAIN_ID,
            bridge,
            payload,
            payable(msg.sender),
            address(0),
            bytes("")
        );
        
        emit MarketQuerySent(
            queryId,
            protocol,
            startTime,
            endTime,
            market
        );
    }
    
    /**
     * @notice Estime les frais LayerZero pour une requête
     */
    function estimateQueryFees(
        string memory protocol,
        uint256 duration
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        require(bytes(protocol).length > 0, "Empty protocol name");
        require(duration > 0, "Invalid duration");
        
        bytes memory payload = abi.encode(
            keccak256(abi.encodePacked(protocol, block.timestamp)),
            protocol,
            block.timestamp,
            block.timestamp + (duration * 1 days),
            address(0)
        );
        
        return lzEndpoint.estimateFees(
            UMA_CHAIN_ID,
            bridge,
            payload,
            false,
            bytes("")
        );
    }
    
    /**
     * @notice Change le propriétaire du contrat
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner address");
        owner = _newOwner;
    }
    
    receive() external payable {}
} 