// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

/// @custom:security-contact crypto@groundfloor.us
contract GroundfloorNoteToken is ERC721, ERC721URIStorage, ERC721Pausable, ERC721Burnable, AccessControl {
    uint256 private _totalSupply;
    uint256 private _nextTokenId;
    uint256 private _noteRepaymentAmount;
    uint256 private _contactBalance = 0;

    // Roles
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAYER_ROLE = keccak256("PAYER_ROLE");

    //----------- Custom Events ------------//
    // Fired when the notes (tokens) have been funded and investors
    // will be sent their funds
    event NotesFunded(uint256 tokens, uint256 amount, uint tokenRepaymentAmount);

    // Fired when a note (token) is repaid and the investor is sent their funds
    event NoteRepaid(uint256 tokenId, uint256 amount);

    constructor(address defaultAdmin, uint256 totalSupply_) 
        ERC721("GroundfloorNoteToken", "GFNT")
    {
        console.log("Contract deploying");

        _totalSupply = totalSupply_;
        console.log("Total supply set to %s",_totalSupply);

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        console.log("Security roles assigned to initialOwner");
    }

    //----------- Custom payee logic ------------//
    // Sets the wallet address that will be used to pay off the note
    function repayContract() public payable onlyRole(PAYER_ROLE) {
        require(_nextTokenId <= _totalSupply, "Invalid contract, more tokens issued then total supply");
        require(msg.value > 0, "Invalid value");
        _contactBalance += msg.value;
        _noteRepaymentAmount = _contactBalance / _nextTokenId;
        emit NotesFunded(_nextTokenId, _contactBalance, _noteRepaymentAmount);
    }

    function withdrawFunds(uint256 tokenId) public payable
    {
        require(_contactBalance > 0, "Contract is not funded, token can not be repaid");
        require(_contactBalance >= _noteRepaymentAmount, "Contract is underfunded, token can not be repaid");
        payable(ownerOf(tokenId)).transfer(_noteRepaymentAmount);
        _contactBalance -= _noteRepaymentAmount;
        super.burn(tokenId);
        emit NoteRepaid(tokenId, _noteRepaymentAmount);
    }

    function balanceInContract() public view returns(uint256) {
        return _contactBalance;
    }

    function valueInContract() public view returns(uint256) {
        return _contactBalance;
    }

    //----------- Standard open zepellin overrides ------------//
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function safeMint(address to, string memory uri) public onlyRole(MINTER_ROLE) {
        require(_nextTokenId < _totalSupply, "Unable to mint tokens, tokens issued exceed total supply");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Pausable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721)
    {
        super._increaseBalance(account, value);
    }    

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }


}
