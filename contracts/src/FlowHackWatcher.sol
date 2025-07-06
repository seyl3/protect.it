// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILayerZeroEndpoint.sol";
import "./PredictionMarketFactory.sol";
import "./IOracle.sol";

/**
 * @title FlowHackWatcher
 * @notice Ce contrat gère les requêtes de vérification de hack vers UMA via LayerZero
 */
contract FlowHackWatcher is IOracle {
    ILayerZeroEndpoint public immutable lzEndpoint;
    PredictionMarketFactory public marketFactory;
    uint16 public constant UMA_CHAIN_ID = 1; // À ajuster selon le vrai chain ID d'UMA
    address public trustedUMAReceiver;
    address public owner;
    
    // Structure pour suivre les queries
    struct HackQuery {
        string protocol;
        uint256 startTime;
        uint256 endTime;
        bool isResolved;
        bool hackConfirmed;
        address requester;
        bytes32 marketId;
    }
    
    // Mapping pour suivre les queries
    mapping(bytes32 => HackQuery) public queries;
    
    // Events
    event QuerySent(
        bytes32 indexed queryId,
        string protocol,
        uint256 startTime,
        uint256 endTime
    );
    
    event QueryResolved(
        bytes32 indexed queryId,
        string protocol,
        bool wasHacked
    );
    
    event FactoryAddressUpdated(address newFactory);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _lzEndpoint,
        address _marketFactory,
        address _trustedUMAReceiver
    ) {
        require(_lzEndpoint != address(0), "Invalid LZ endpoint");
        require(_trustedUMAReceiver != address(0), "Invalid UMA receiver");
        
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        if (_marketFactory != address(0)) {
            marketFactory = PredictionMarketFactory(_marketFactory);
        }
        trustedUMAReceiver = _trustedUMAReceiver;
        owner = msg.sender;
    }

    /**
     * @notice Updates the factory address
     * @param _marketFactory New factory address
     */
    function setFactoryAddress(address _marketFactory) external onlyOwner {
        require(_marketFactory != address(0), "Invalid factory address");
        assembly {
            sstore(marketFactory.slot, _marketFactory)
        }
        emit FactoryAddressUpdated(_marketFactory);
    }

    /**
     * @notice Demande une vérification de hack pour un protocole
     * @param protocol Nom du protocole à vérifier
     * @param duration Durée de la période de vérification en jours
     */
    function sendQuery(
        string memory protocol,
        uint256 duration
    ) external payable {
        require(msg.value >= 0.01 ether, "Insufficient LZ fees");
        require(bytes(protocol).length > 0, "Empty protocol name");
        require(duration > 0, "Invalid duration");
        
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (duration * 1 days);
        
        bytes32 queryId = keccak256(abi.encodePacked(
            protocol,
            startTime,
            endTime
        ));
        
        bytes memory payload = abi.encode(
            queryId,
            protocol,
            startTime,
            endTime
        );
        
        // Stocker la requête
        queries[queryId] = HackQuery({
            protocol: protocol,
            startTime: startTime,
            endTime: endTime,
            isResolved: false,
            hackConfirmed: false,
            requester: msg.sender,
            marketId: keccak256(abi.encodePacked(protocol, endTime))
        });
        
        // Envoyer à UMA via LayerZero
        lzEndpoint.send{value: msg.value}(
            UMA_CHAIN_ID,
            trustedUMAReceiver,
            payload,
            payable(msg.sender),
            address(0),
            bytes("")
        );
        
        emit QuerySent(
            queryId,
            protocol,
            startTime,
            endTime
        );
    }
    
    /**
     * @notice Reçoit la réponse d'UMA via LayerZero
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external {
        require(msg.sender == address(lzEndpoint), "Invalid endpoint");
        require(_srcChainId == UMA_CHAIN_ID, "Invalid source chain");
        require(
            keccak256(_srcAddress) == keccak256(abi.encodePacked(trustedUMAReceiver)),
            "Invalid source address"
        );
        
        // Décoder la réponse
        (bytes32 queryId, bool wasHacked) = abi.decode(_payload, (bytes32, bool));
        
        HackQuery storage query = queries[queryId];
        require(query.requester != address(0), "Query does not exist");
        require(!query.isResolved, "Query already resolved");
        
        // Mettre à jour le statut
        query.isResolved = true;
        query.hackConfirmed = wasHacked;
        
        // Émettre l'événement
        emit QueryResolved(
            queryId,
            query.protocol,
            wasHacked
        );
        
        // Notifier le PredictionMarket dans tous les cas
        notifyPredictionMarket(query);
    }
    
    /**
     * @notice Notifie le PredictionMarket d'un hack confirmé
     */
    function notifyPredictionMarket(HackQuery memory query) internal {
        // Récupérer les informations du marché
        PredictionMarketFactory.MarketInfo memory marketInfo = 
            marketFactory.getMarketInfo(query.protocol, query.endTime);
        
        if (marketInfo.exists && marketInfo.market != address(0)) {
            PredictionMarket market = PredictionMarket(marketInfo.market);
            if (!market.resolved()) {
                // Résoudre le marché avec le résultat du hack
                market.resolveMarket(query.hackConfirmed);
            }
        }
    }
    
    /**
     * @notice Vérifie le statut d'une query
     */
    function getQueryStatus(bytes32 queryId) external view returns (
        bool exists,
        bool isResolved,
        bool hackConfirmed,
        string memory protocol,
        uint256 startTime,
        uint256 endTime,
        bytes32 marketId
    ) {
        HackQuery memory query = queries[queryId];
        exists = query.requester != address(0);
        return (
            exists,
            query.isResolved,
            query.hackConfirmed,
            query.protocol,
            query.startTime,
            query.endTime,
            query.marketId
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
            block.timestamp + (duration * 1 days)
        );
        
        return lzEndpoint.estimateFees(
            UMA_CHAIN_ID,
            trustedUMAReceiver,
            payload,
            false,
            bytes("")
        );
    }
    
    /**
     * @notice Met à jour l'adresse UMA trusted
     */
    function setTrustedUMAReceiver(address _newReceiver) external onlyOwner {
        require(_newReceiver != address(0), "Invalid receiver address");
        trustedUMAReceiver = _newReceiver;
    }
    
    /**
     * @notice Récupère les fees LZ en excès
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner).transfer(balance);
    }

    /**
     * @dev Checks if this contract can resolve a specific market
     */
    function canResolve(address market) external view override returns (bool) {
        try PredictionMarket(market).oracle() returns (IOracle marketOracle) {
            return address(marketOracle) == address(this);
        } catch {
            return false;
        }
    }

    /**
     * @dev Gets the resolution status and result for a market
     */
    function getResolution(address market) external view override returns (bool resolved, bool result) {
        bytes32 queryId = keccak256(abi.encodePacked(
            PredictionMarket(market).protocolName(),
            block.timestamp,
            PredictionMarket(market).endTime()
        ));
        
        HackQuery memory query = queries[queryId];
        return (query.isResolved, query.hackConfirmed);
    }

    /**
     * @dev Checks if this contract can freeze/unfreeze a market
     */
    function canFreeze(address market) external view override returns (bool) {
        try PredictionMarket(market).oracle() returns (IOracle marketOracle) {
            return address(marketOracle) == address(this);
        } catch {
            return false;
        }
    }

    /**
     * @dev Freezes a market to prevent trading
     */
    function freezeMarket(address market) external override {
        require(this.canFreeze(market), "Cannot freeze this market");
        PredictionMarket(market).freezeMarket();
        emit MarketFrozen(market);
    }

    /**
     * @dev Unfreezes a market to allow trading
     */
    function unfreezeMarket(address market) external override {
        require(this.canFreeze(market), "Cannot unfreeze this market");
        PredictionMarket(market).unfreezeMarket();
        emit MarketUnfrozen(market);
    }

    /**
     * @dev Resolves a market with the given result
     */
    function resolveMarket(address market, bool result) external override {
        require(this.canResolve(market), "Cannot resolve this market");
        PredictionMarket(market).resolveMarket(result);
        emit MarketResolved(market, result);
    }
} 