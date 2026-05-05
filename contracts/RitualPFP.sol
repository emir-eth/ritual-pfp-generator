// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title RitualPFP
/// @notice On-chain metadata PFP mints for Ritual chain (forge output as data URI tokenURI).
contract RitualPFP is ERC721URIStorage {
    uint256 private _nextTokenId;

    event Minted(address user, uint256 tokenId, string tokenURI);

    constructor() ERC721("Ritual PFP", "RPFP") {
        _nextTokenId = 1;
    }

    /// @notice Mint to caller with the given metadata URI (typically data:application/json;base64,...).
    function mint(string calldata tokenURI) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        emit Minted(msg.sender, tokenId, tokenURI);
    }
}
