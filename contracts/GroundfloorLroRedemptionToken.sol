// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

/// @custom:security-contact crypto@groundfloor.us
contract GroundfloorLroRedemptionToken is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    uint256 private _totalSupply;
    uint256 private _nextTokenId;
    string private _seriesId;

    constructor(address intiialOwner, string memory seriesId_, uint256 totalSupply_)
        ERC721("GroundfloorLroRedemptionToken", "GLRT")
        Ownable(intiialOwner)
    {
        console.log("Contract deploying");

        _seriesId = seriesId_;
        console.log("Series ID set to %s",_seriesId);

        _totalSupply = totalSupply_;
        console.log("Total supply set to %s",_totalSupply);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/";
    }

    // ------------------------------------------------------------
    // Functions to return the total supply and total minted, but only to the owner
    function series() public view onlyOwner returns (string memory) {
        return _seriesId;
    }

    function totalSupply() public view onlyOwner returns (uint256) {
        return _totalSupply;
    }

    function totalMinted() public view onlyOwner returns (uint256) {
        return _nextTokenId;
    }

    function safeMint(address to_, string memory uri_) public onlyOwner {
        require(_nextTokenId < _totalSupply, "Invalid contract, more tokens issued then total supply");
        uint256 tokenId = _nextTokenId++;
        console.log("Minting token to: %s with uri: %s", to_, uri_);
        _safeMint(to_, tokenId);
        _setTokenURI(tokenId, uri_);
    }

    // The following functions are overrides required by Solidity.
    function tokenURI(uint256 tokenId_)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId_);
    }

    function supportsInterface(bytes4 interfaceId_)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId_);
    }
}