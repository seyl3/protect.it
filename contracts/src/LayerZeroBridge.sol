// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILayerZeroEndpoint.sol";

/**
 * @title LayerZeroBridge
 * @notice Bridge bidirectionnel entre Flow et UMA via LayerZero
 */
contract LayerZeroBridge {
    ILayerZeroEndpoint public immutable lzEndpoint;
    
    uint16 public constant FLOW_CHAIN_ID = 1; // À ajuster
    uint16 public constant UMA_CHAIN_ID = 2;  // À ajuster
    
    address public flowEndpoint;
    address public umaEndpoint;
    address public owner;
    
    mapping(uint16 => bytes) public trustedRemotes;
    
    event MessageReceived(
        uint16 indexed srcChainId,
        bytes srcAddress,
        bytes payload
    );
    
    event MessageSent(
        uint16 indexed dstChainId,
        bytes dstAddress,
        bytes payload
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(
        address _lzEndpoint,
        address _flowEndpoint,
        address _umaEndpoint
    ) {
        require(_lzEndpoint != address(0), "Invalid LZ endpoint");
        require(_flowEndpoint != address(0), "Invalid Flow endpoint");
        require(_umaEndpoint != address(0), "Invalid UMA endpoint");
        
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        flowEndpoint = _flowEndpoint;
        umaEndpoint = _umaEndpoint;
        owner = msg.sender;
    }
    
    /**
     * @notice Configure les adresses de confiance pour chaque chaîne
     */
    function setTrustedRemote(
        uint16 _chainId,
        bytes calldata _path
    ) external onlyOwner {
        require(_chainId == FLOW_CHAIN_ID || _chainId == UMA_CHAIN_ID, "Invalid chain ID");
        require(_path.length > 0, "Invalid path");
        trustedRemotes[_chainId] = _path;
    }
    
    /**
     * @notice Reçoit un message via LayerZero
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) external {
        require(msg.sender == address(lzEndpoint), "Invalid endpoint");
        require(_srcChainId == FLOW_CHAIN_ID || _srcChainId == UMA_CHAIN_ID, "Invalid source chain");
        require(
            keccak256(_srcAddress) == keccak256(trustedRemotes[_srcChainId]),
            "Invalid source address"
        );
        
        emit MessageReceived(_srcChainId, _srcAddress, _payload);
        
        // Transférer le message à la destination appropriée
        if (_srcChainId == FLOW_CHAIN_ID) {
            _sendToUMA(_payload);
        } else {
            _sendToFlow(_payload);
        }
    }
    
    /**
     * @notice Envoie un message à UMA
     */
    function _sendToUMA(bytes memory _payload) internal {
        require(address(this).balance >= 0.01 ether, "Insufficient balance");
        
        lzEndpoint.send{value: 0.01 ether}(
            UMA_CHAIN_ID,
            umaEndpoint,
            _payload,
            payable(msg.sender),
            address(0),
            bytes("")
        );
        
        emit MessageSent(UMA_CHAIN_ID, abi.encodePacked(umaEndpoint), _payload);
    }
    
    /**
     * @notice Envoie un message à Flow
     */
    function _sendToFlow(bytes memory _payload) internal {
        require(address(this).balance >= 0.01 ether, "Insufficient balance");
        
        lzEndpoint.send{value: 0.01 ether}(
            FLOW_CHAIN_ID,
            flowEndpoint,
            _payload,
            payable(msg.sender),
            address(0),
            bytes("")
        );
        
        emit MessageSent(FLOW_CHAIN_ID, abi.encodePacked(flowEndpoint), _payload);
    }
    
    /**
     * @notice Estime les frais LayerZero
     */
    function estimateFees(
        uint16 _dstChainId,
        bytes memory _payload
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        require(_dstChainId == FLOW_CHAIN_ID || _dstChainId == UMA_CHAIN_ID, "Invalid chain ID");
        
        address dstAddress = _dstChainId == FLOW_CHAIN_ID ?
            flowEndpoint :
            umaEndpoint;
            
        return lzEndpoint.estimateFees(
            _dstChainId,
            dstAddress,
            _payload,
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
    
    /**
     * @notice Met à jour l'endpoint Flow
     */
    function setFlowEndpoint(address _newEndpoint) external onlyOwner {
        require(_newEndpoint != address(0), "Invalid endpoint address");
        flowEndpoint = _newEndpoint;
    }
    
    /**
     * @notice Met à jour l'endpoint UMA
     */
    function setUMAEndpoint(address _newEndpoint) external onlyOwner {
        require(_newEndpoint != address(0), "Invalid endpoint address");
        umaEndpoint = _newEndpoint;
    }
    
    receive() external payable {}
} 