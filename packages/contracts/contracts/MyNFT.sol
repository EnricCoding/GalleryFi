// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _tokenIds;
    string  public  baseTokenURI;

    constructor(
        string  memory _name,
        string  memory _symbol,
        address        _royaltyReceiver,
        uint96         _royaltyFee
    )
        ERC721(_name, _symbol)   // ctor de ERC721
        Ownable(msg.sender)      // ctor de Ownable 5.x (requerido)
    {
        _setDefaultRoyalty(_royaltyReceiver, _royaltyFee);
    }

    function mint(address to, string calldata uri)
        external
        onlyOwner
        returns (uint256)
    {
        uint256 id = ++_tokenIds;
        _mint(to, id);
        _setTokenURI(
            id,
            bytes(baseTokenURI).length == 0
                ? uri
                : string.concat(baseTokenURI, uri)
        );
        return id;
    }

    function setDefaultRoyalty(address receiver, uint96 feeBps) external onlyOwner {
        _setDefaultRoyalty(receiver, feeBps);
    }
    function deleteDefaultRoyalty() external onlyOwner { _deleteDefaultRoyalty(); }

    function setBaseTokenURI(string calldata uri) external onlyOwner {
        baseTokenURI = uri;
    }

    function supportsInterface(bytes4 id)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    { return super.supportsInterface(id); }

    uint256[44] private __gap;
}
