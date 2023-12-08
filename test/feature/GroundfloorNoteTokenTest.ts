import { expect } from "chai";
require("chai").use(require("chai-string"));
import { ethers } from "hardhat";
import { GroundfloorNoteToken } from "../typechain/GroundfloorNoteToken";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("GroundfloorNoteToken", function () {
  let contract: GroundfloorNoteToken;
  let totalSupply = 5;
  let owner, minter, pauser, payer, investor1, investor2;
  let tokenUrl = "https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/QmXyK2D5RQqtvFnuo1bUdKnUrBikTvx6BA3QKH3P8FJTiY";

  this.beforeAll(async function () {
    [owner, minter, pauser, payer, investor1, investor2] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("GroundfloorNoteToken");
    contract = await Contract.deploy(owner.address, totalSupply);
  });

  describe("Deployment", function () {
    it("Should be deployed correctly", async function () {
      const name = 'GroundfloorNoteToken';
      const symbol = 'GFNT';

      expect(await contract.valueInContract()).to.equal(0);
      expect(await contract.paused()).to.equal(false);
    });

    it("Should grant the minter role properly", async function () {
      const minterRole = await contract.MINTER_ROLE();
      await contract.grantRole(minterRole, minter.address);
      expect(await contract.hasRole(minterRole, minter.address)).to.equal(true);
    });

    it("Should grant the pauser role properly", async function () {
      const pauserRole = await contract.PAUSER_ROLE();
      await contract.grantRole(pauserRole, pauser.address);
      expect(await contract.hasRole(pauserRole, pauser.address)).to.equal(true);
    });

    it("Should grant the payer role properly", async function () {
      const payerRole = await contract.PAYER_ROLE();
      await contract.grantRole(payerRole, payer.address);
      expect(await contract.hasRole(payerRole, payer.address)).to.equal(true);
    });
  });

  describe("Pausing Should Work As Expected", function () {
    it("Should allow for pausing correctly", async function () {
      expect(await contract.paused()).to.equal(false);
      await contract.pause()
      expect(await contract.paused()).to.equal(true);
    });

    it("Should reject minting while paused", async function () {
      const minterRole = await contract.MINTER_ROLE();
      await contract.grantRole(minterRole, minter.address);
      expect(await contract.hasRole(minterRole, minter.address)).to.equal(true);
      const mintableContract = await contract.connect(minter);
      try {
        await mintableContract.safeMint(investor1.address, tokenUrl);
        throw new Error("unauthorized access test should have failed");
      } catch (error) {
        expect(error.message).to.match(/EnforcedPause/);
      }
    });

    it("Should allow for unpausing correctly", async function () {
      expect(await contract.paused()).to.equal(true);
      await contract.unpause()
      expect(await contract.paused()).to.equal(false);
    });
  });

  describe("Mint a couple of tokens", function () {
    it("Should mint 3 tokens to investor 1", async function () {
      const minterRole = await contract.MINTER_ROLE();
      await contract.grantRole(minterRole, minter.address);
      expect(await contract.hasRole(minterRole, minter.address)).to.equal(true);
      const mintableContract = await contract.connect(minter);

      for(let i=0; i<=2; i++) {
        expect(await mintableContract.safeMint(investor1.address, tokenUrl)).to.be.ok;
        expect(await contract.ownerOf(i)).to.equal(investor1.address);
        expect(await contract.tokenURI(i)).to.equal(tokenUrl);
      }
    });

    it("Should mint 2 tokens to investor 2", async function () {
      const minterRole = await contract.MINTER_ROLE();
      await contract.grantRole(minterRole, minter.address);
      expect(await contract.hasRole(minterRole, minter.address)).to.equal(true);
      const mintableContract = await contract.connect(minter);

      for(let i=3; i<=4; i++) {
        expect(await mintableContract.safeMint(investor2.address, tokenUrl)).to.be.ok;
        expect(await contract.ownerOf(i)).to.equal(investor2.address);
        expect(await contract.tokenURI(i)).to.equal(tokenUrl);
      }
    });

    it("Should reject minting when total supply is reached", async function () {
      const mintableContract = await contract.connect(minter);
      try {
        await mintableContract.safeMint(investor2.address, tokenUrl);
      } catch(error) {
        expect(error.message).to.match(/Unable to mint tokens, tokens issued exceed total supply'/);
      }
    });
  });

  describe("Confirm the contract can accept money", function () {
    it("Confirm initial owner can not fund contract", async function () {
      try {
        // Try approving from the wrong address
        await contract.repayContract({value: 4});
        throw new Error("contract should not have been fundable");
      } catch (error) {
        expect(error.message).to.match(/AccessControlUnauthorizedAccount/);
      }
    });

    it("Confirm payer can fund contract", async function () {
      let transactionValue = ethers.parseEther("10.0");
      const payerContract = await contract.connect(payer);
      expect(await payerContract.valueInContract()).to.equal(0);
      await payerContract.repayContract({value: transactionValue});
      expect(await payerContract.valueInContract()).to.greaterThan(0);
    });
  });

  describe("Confirm the contract can be repaid in full and tokens are burned", function () {
    it("Confirm investors can verify funds", async function () {
      const investor1Contract = await contract.connect(investor1);
      expect(await investor1Contract.valueInContract()).to.greaterThan(0);
    });

    it("Confirm only token owner can withdraw funds", async function () {
      const investor2Contract = await contract.connect(investor2);
      expect(await contract.ownerOf(0)).to.equal(investor1.address);
      try {
        await investor2Contract.withdrawFunds(0);
        throw new Error("contract funds should not have been withdrawable");
      } catch (error) {
        expect(error.message).to.match(/ERC721InsufficientApproval/);
      }
    });

    it("Confirm investor1 can withdraw funds", async function () {
      const repaidNoteValue = ethers.parseEther("2");
      const investor1Contract = await contract.connect(investor1);
      const investor2Contract = await contract.connect(investor2);

      let investor1Balance = await ethers.provider.getBalance(investor1.address);
      let investor1TokenBalance = await contract.balanceOf(investor1.address);
      expect(await contract.balanceOf(investor1.address)).to.equal(3);

      let startingContractBalance = await contract.valueInContract();
      expect(startingContractBalance).to.greaterThan(0);

      let tokenId = 0;
      for(let i=0; i<investor1TokenBalance; i++) {
        expect(await investor1Contract.withdrawFunds(tokenId)).to.be.ok;

        let bal = await contract.valueInContract();
        let tokenAdj = ethers.parseEther("" + (tokenId+1)*2);
        expect (bal).to.equal(startingContractBalance - tokenAdj);
        tokenId++;
      }

      let ending1Balance = await ethers.provider.getBalance(investor1.address);
      expect(ending1Balance).to.greaterThan(investor1Balance);

      let endingContractBalance = await contract.valueInContract();
      let investor2Balance = await ethers.provider.getBalance(investor2.address);
      let investor2TokenBalance = await contract.balanceOf(investor2.address);
      expect(endingContractBalance).to.equal(repaidNoteValue * investor2TokenBalance);

      for(let i=0; i<investor2TokenBalance; i++) {

        expect(await investor2Contract.withdrawFunds(tokenId)).to.be.ok;

        let bal = await contract.valueInContract();
        let tokenAdj = ethers.parseEther("" + (tokenId+1)*2);

        expect (bal).to.equal(startingContractBalance - tokenAdj);
        tokenId++;
      }

      let ending2Balance = await ethers.provider.getBalance(investor2.address);
      expect(ending2Balance).to.greaterThan(investor2Balance);

      endingContractBalance = await contract.valueInContract();
      expect(endingContractBalance).to.equal(0);
    });
  });


});