import hre from "hardhat";
import { expect } from "chai";
require("chai").use(require("chai-string"));
import { ethers } from "hardhat";
import { GroundfloorLroRedemptionToken } from "../typechain/GroundfloorLroRedemptionToken";
import { closeSync } from "fs";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  
describe("GroundfloorLroRedemptionToken", function () {
  let contract: GroundfloorLroRedemptionToken;
  let totalSupply = 5;
  let owner, minter, pauser, payer, investor1, investor2;
  let contractBaseUrl = "https://salmon-bizarre-mockingbird-50.mypinata.cloud/ipfs/";
  let tokenUrl = "bafybeifcfnt5qsdw3hezgie3dovf6wkcs73reuwqvvjffocfvvb2igcdwy/GLRT-000A-13994-00000.json";
  let tokenUri = contractBaseUrl + tokenUrl;
  
  this.beforeAll(async function () {
    [owner, investor1, investor2] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("GroundfloorLroRedemptionToken");
    contract = await Contract.deploy(owner.address, totalSupply);
  });

  describe("Deployment", function () {
    it("Should be deployed correctly", async function () {
      const name = 'GroundfloorLroRedemptionToken';
      const symbol = 'GLRT';

      // assert that the value is correct
      expect(await contract.name()).to.equal(name);
      expect(await contract.symbol()).to.equal(symbol);
    });
  });

  describe("Minting", function () {
    it("Should reject minting from non owner", async function () {
      const contractConnectedToInvestor1 = await contract.connect(investor1);
      try {
        await contractConnectedToInvestor1.safeMint(investor1.address, tokenUrl);
        throw new Error("unauthorized access test should have failed");
      } catch (error) {
        console.log(error.message);
        expect(error.message).to.match(/OwnableUnauthorizedAccount/);
      }
    });

    it("Should mint properly", async function () {
      const mintableContract = await contract.connect(owner);
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
      expect(await contract.tokenURI(0)).to.equal(tokenUri);
    });
  });

  describe("Approval", function () {
    it("Restrict transfer without approval", async function () {
      const investor1Contract = await contract.connect(investor1);
      expect(await contract.tokenURI(0)).to.equal(tokenUri);

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

});