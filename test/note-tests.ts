import hre from "hardhat";
import { expect } from "chai";
require("chai").use(require("chai-string"));
import { ethers } from "hardhat";
import { GroundfloorNoteToken } from "../typechain/GroundfloorNoteToken";
import { closeSync } from "fs";

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

      // assert that the value is correct
      expect(await contract.name()).to.equal(name);
      expect(await contract.symbol()).to.equal(symbol);
    });

    it("Should set the defaults correctly", async function () {
      expect(await contract.valueInContract()).to.equal(0);
      expect(await contract.paused()).to.equal(false);
    });
  });

  describe("Permissions", function () {
    it("Should reject minting with out the proper role", async function () {
      const minterRole = await contract.MINTER_ROLE();
      expect(await contract.hasRole(minterRole, minter.address)).to.equal(false);
    });

    it("Should grant the minter role properly", async function () {
      const minterRole = await contract.MINTER_ROLE();
      await contract.grantRole(minterRole, minter.address);
      expect(await contract.hasRole(minterRole, minter.address)).to.equal(true);
    });

    it("Should reject pausing with out the proper role", async function () {
      const pauserRole = await contract.PAUSER_ROLE();
      expect(await contract.hasRole(pauserRole, pauser.address)).to.equal(false);
    });

    it("Should grant the pauser role properly", async function () {
      const pauserRole = await contract.PAUSER_ROLE();
      await contract.grantRole(pauserRole, pauser.address);
      expect(await contract.hasRole(pauserRole, pauser.address)).to.equal(true);
    });

    it("Should allow for pausing correctly", async function () {
      expect(await contract.paused()).to.equal(false);
      await contract.pause()
      expect(await contract.paused()).to.equal(true);
    });

    it("Should allow for unpausing correctly", async function () {
      expect(await contract.paused()).to.equal(true);
      await contract.unpause()
      expect(await contract.paused()).to.equal(false);
    });

    it("Should reject payer with out the proper role", async function () {
      const payerRole = await contract.PAYER_ROLE();
      expect(await contract.hasRole(payerRole, payer.address)).to.equal(false);
    });

    it("Should grant the payer role properly", async function () {
      const payerRole = await contract.PAYER_ROLE();
      await contract.grantRole(payerRole, payer.address);
      expect(await contract.hasRole(payerRole, payer.address)).to.equal(true);
    });

  });

  describe("Minting", function () {
    it("Should reject minting with out the proper role", async function () {
      const contractConnectedToInvestor1 = await contract.connect(investor1);
      const minterRole = await contract.MINTER_ROLE();
      expect(await contractConnectedToInvestor1.hasRole(minterRole, investor1.address)).to.equal(false);
      try {
        await contractConnectedToInvestor1.safeMint(investor1.address, tokenUrl);
        throw new Error("unauthorized access test should have failed");
      } catch (error) {
        expect(error.message).to.match(/AccessControlUnauthorizedAccount/);
      }
    });

    it("Should mint properly", async function () {
      const minterRole = await contract.MINTER_ROLE();
      await contract.grantRole(minterRole, minter.address);
      const mintableContract = await contract.connect(minter);
      expect(await mintableContract.safeMint(investor1.address, tokenUrl)).to.be.ok;
      expect(await contract.ownerOf(0)).to.equal(investor1.address);
      try {
        await contract.ownerOf(1);
        throw new Error("token should not be found");
      } catch (error) {
        expect(error.message).to.match(/ERC721NonexistentToken/);
      }
    });

    it("Minted token should report the proper uri", async function () {
      expect(await contract.tokenURI(0)).to.equal(tokenUrl);
    });
  });

  describe("Approval", function () {
    it("Restrict transfer without approval", async function () {
      const investor1Contract = await contract.connect(investor1);
      expect(await contract.tokenURI(0)).to.equal(tokenUrl);

      try {
        await contract.safeTransferFrom(investor1.address, investor2.address, 0);
        throw new Error("token should not be found");
      } catch (error) {
        expect(error.message).to.match(/ERC721InsufficientApproval/);
      }
    });

    it("Confirm token approval works as expected", async function () {
      const investor1Contract = await contract.connect(investor1);
      expect(await contract.getApproved(0)).to.equal(ZERO_ADDRESS);
      try {
        // Try approving from the wrong address
        await contract.approve(investor1.address, 0)
        throw new Error("token approval should not be allowed from initial owner");
      } catch (error) {
        expect(error.message).to.match(/ERC721InvalidApprover/);
      }
      expect(await investor1Contract.approve(investor2.address, 0)).to.be.ok;
    });

    it("Confirm token transfer as expected", async function () {
      const investor1Contract = await contract.connect(investor1);
      expect(await investor1Contract.safeTransferFrom(investor1.address, investor2.address, 0)).to.be.ok;
      expect(await contract.ownerOf(0)).to.equal(investor2.address);
      expect(await contract.balanceOf(investor2.address)).to.equal(1);
    });
  });

  describe("Funding", function () {
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
      let transactionValue = ethers.parseEther("4.0");
      const payerContract = await contract.connect(payer);
      expect(await payerContract.valueInContract()).to.equal(0);
      await payerContract.repayContract({value: transactionValue});
      expect(await payerContract.valueInContract()).to.greaterThan(0);
    });
  });

  describe("Repayment", function () {
    it("Confirm investors can verify funds", async function () {
      const investor1Contract = await contract.connect(investor1);
      expect(await investor1Contract.valueInContract()).to.greaterThan(0);
    });

    it("Confirm only token owner can withdraw funds", async function () {
      const investor1Contract = await contract.connect(investor1);
      expect(await contract.ownerOf(0)).to.equal(investor2.address);
      try {
        await investor1Contract.withdrawFunds(0);
        throw new Error("contract funds should not have been withdrawable");
      } catch (error) {
        expect(error.message).to.match(/ERC721InsufficientApproval/);
      }
    });

    it("Confirm investor1 can withdraw funds", async function () {
      const investor2Contract = await contract.connect(investor2);
      expect(await contract.balanceOf(investor2.address)).to.equal(1);

      let startingContractBalance = await contract.valueInContract();
      expect(startingContractBalance).to.greaterThan(0);

      let startingBalance = await ethers.provider.getBalance(investor2.address);
      expect(startingBalance).to.greaterThan(0);

      let response = await investor2Contract.withdrawFunds(0);
      expect(await contract.balanceOf(investor2.address)).to.equal(0);

      let endingContractBalance = await contract.valueInContract();
      expect(endingContractBalance).to.equal(0);

      let endingBalance = await ethers.provider.getBalance(investor2.address);
      expect(endingBalance).to.greaterThan(startingBalance);
    });
  });


});