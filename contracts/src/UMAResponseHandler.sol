// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILayerZeroEndpoint.sol";
import "./PredictionMarket.sol";

/**
 * @title UMAResponseHandler
 * @notice Gère les réponses d'UMA et les envoie à Flow via LayerZero
 */
contract UMAResponseHandler {
    ILayerZeroEndpoint public immutable lzEndpoint;
    address public immutable bridge;
    uint16 public constant FLOW_CHAIN_ID = 1; // À ajuster selon le vrai chain ID de Flow
    
    address public owner;
    
    event ResponseSent(
        bytes32 indexed queryId,
        bool isHacked,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(
        address _lzEndpoint,
        address _bridge
    ) {
        require(_lzEndpoint != address(0), "Invalid LZ endpoint");
        require(_bridge != address(0), "Invalid bridge address");
        
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        bridge = _bridge;
        owner = msg.sender;
    }
    
    /**
     * @notice Envoie une réponse à Flow via LayerZero
     */
    function sendResponse(
        bytes32 queryId,
        bool isHacked,
        uint256 timestamp
    ) external payable {
        require(msg.value >= 0.01 ether, "Insufficient LZ fees");
        require(timestamp > 0, "Invalid timestamp");
        
        bytes memory payload = abi.encode(
            queryId,
            isHacked,
            timestamp
        );
        
        // Envoyer au bridge via LayerZero
        lzEndpoint.send{value: msg.value}(
            FLOW_CHAIN_ID,
            bridge,
            payload,
            payable(msg.sender),
            address(0),
            bytes("")
        );
        
        emit ResponseSent(
            queryId,
            isHacked,
            timestamp
        );
    }
    
    /**
     * @notice Estime les frais LayerZero pour une réponse
     */
    function estimateResponseFees(
        bytes32 queryId,
        bool isHacked,
        uint256 timestamp
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        require(timestamp > 0, "Invalid timestamp");
        
        bytes memory payload = abi.encode(
            queryId,
            isHacked,
            timestamp
        );
        
        return lzEndpoint.estimateFees(
            FLOW_CHAIN_ID,
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