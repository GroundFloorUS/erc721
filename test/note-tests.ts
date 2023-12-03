import hre from "hardhat";
import { expect } from "chai";
import { ethers } from "hardhat";
import { GroundfloorNoteToken } from "../typechain/GroundfloorNoteToken";


describe("GroundfloorNoteToken", function () {
  let contract: GroundfloorNoteToken;

  this.beforeEach(async function () {
    const [owner, minter, payer, investor1, investor2] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("GroundfloorNoteToken");
    contract = await Contract.deploy(owner.address, 2);
  });

  it("Should reflect the right name and symbol", async function () {
    const name = 'GroundfloorNoteToken';
    const symbol = 'GFNT';

    // assert that the value is correct
    expect(await contract.name()).to.equal(name);
    expect(await contract.symbol()).to.equal(symbol);
  });
});