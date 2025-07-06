// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ILayerZeroEndpoint {
    // Envoie un message cross-chain
    function send(
        uint16 _dstChainId,
        address _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    // Reçoit un message cross-chain
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;

    // Estime les frais pour l'envoi d'un message
    function estimateFees(
        uint16 _dstChainId,
        address _destination,
        bytes calldata _payload,
        bool _useZro,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee);
} 