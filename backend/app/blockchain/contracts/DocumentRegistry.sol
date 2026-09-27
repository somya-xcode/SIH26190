// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DocumentRegistry
 * @dev Immutable on-chain registry for police digital document integrity.
 * Storing only SHA-256 hashes and timestamp metadata for tamper-proofing.
 */
contract DocumentRegistry {
    struct DocumentRecord {
        bytes32 documentHash;
        uint256 documentId;
        uint256 uploaderId;
        string documentType;
        uint256 timestamp;
        address registrant;
        bool isRegistered;
    }

    // Mapping from document SHA-256 hash to DocumentRecord
    mapping(bytes32 => DocumentRecord) public records;

    event DocumentRegistered(
        bytes32 indexed documentHash,
        uint256 indexed documentId,
        uint256 uploaderId,
        uint256 timestamp,
        address registrant
    );

    /**
     * @notice Register a document's cryptographic hash on the blockchain.
     */
    function registerDocument(
        bytes32 _documentHash,
        uint256 _documentId,
        uint256 _uploaderId,
        string calldata _documentType
    ) external returns (bool) {
        require(!records[_documentHash].isRegistered, "Document hash already registered on blockchain.");

        records[_documentHash] = DocumentRecord({
            documentHash: _documentHash,
            documentId: _documentId,
            uploaderId: _uploaderId,
            documentType: _documentType,
            timestamp: block.timestamp,
            registrant: msg.sender,
            isRegistered: true
        });

        emit DocumentRegistered(_documentHash, _documentId, _uploaderId, block.timestamp, msg.sender);
        return true;
    }

    /**
     * @notice Verify whether a document SHA-256 hash exists on the blockchain.
     */
    function verifyDocument(bytes32 _documentHash)
        external
        view
        returns (
            bool exists,
            uint256 documentId,
            uint256 timestamp,
            address registrant
        )
    {
        DocumentRecord memory record = records[_documentHash];
        return (record.isRegistered, record.documentId, record.timestamp, record.registrant);
    }
}
