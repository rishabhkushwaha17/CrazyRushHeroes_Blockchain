import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("WreckLeagueCore", function () {
  let core:any, owner:any, user:any, treasury:any, token:any;
  const TOKEN_NAME = "TEST";
  const PRICES = [ethers.parseEther("10"), ethers.parseEther("19"), ethers.parseEther("27")];
  const ITEM_AMOUNT = 1n; // 1 fuel

  beforeEach(async () => {
     [owner, user, treasury] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("USDC", "USDC", ethers.parseEther("100000"));
    await token.waitForDeployment();

    const Core = await ethers.getContractFactory("CrazyRushHeroes");
    core = await Core.deploy();
    await core.waitForDeployment();

    await core.setTreasuryAddress(await treasury.getAddress());
    await core.addAcceptedToken(TOKEN_NAME, await token.getAddress());

    const priceToPay = PRICES[Number(ITEM_AMOUNT) - 1]*4n;
    await token.transfer(user.address, priceToPay);
    await token.connect(user).approve(core.target, priceToPay);
  });

  function getKey(itemType:any, TOKEN_NAME:any, amount:any) {
    const AbiCoder = new ethers.AbiCoder()
    return ethers.keccak256(
      AbiCoder.encode(["string", "string", "uint256"], [itemType, TOKEN_NAME, amount])
    );
  }

  it("should allow the owner to set and retrieve item price", async () => {
    const itemType = "Sword";
    const price = ethers.parseEther("10");

    await core.connect(owner).setItemPrice(itemType, TOKEN_NAME, 1, price);
    const key = getKey(itemType, TOKEN_NAME, 1);
    expect(await core.connect(owner).itemPrices(key)).to.equal(price);
  });

  it("should fallback to unit price if specific tier is not set", async () => {
    const itemType = "Shield";
    const unitPrice = ethers.parseEther("5");
    const quantity = 3n;
    const totalExpected = unitPrice*quantity;

    await core.connect(owner).setItemPrice(itemType, TOKEN_NAME, 1, unitPrice);

    await token.connect(user).approve(core.target, totalExpected);
    await expect(core.connect(user).buyItem(itemType, quantity, TOKEN_NAME))
      .to.emit(core, "ItemBought")
      .withArgs(user.address, itemType, quantity, TOKEN_NAME, totalExpected);
  });

  it("should batch set item prices", async () => {
    const itemType = "Potion";
    const amounts = [1, 5, 10];
    const prices = [100, 400, 750].map(p => ethers.parseEther(p.toString()));

    await core.batchSetItemPrices(itemType, TOKEN_NAME, amounts, prices);

    for (let i = 0; i < amounts.length; i++) {
      const key = getKey(itemType, TOKEN_NAME, amounts[i]);
      expect(await core.itemPrices(key)).to.equal(prices[i]);
    }
  });

  it("should revert if unit price not set and tier not found", async () => {
    await expect(core.connect(user).buyItem("Helmet", 2, TOKEN_NAME)).to.be.revertedWith("Unit price not configured");
  });

  it("should reject buying with invalid token", async () => {
    await expect(core.connect(user).buyItem("Boots", 1, "FAKE")).to.be.revertedWith("Invalid payment token");
  });

  it("should set initial owner correctly", async () => {
    expect(await core.owner()).to.equal(owner.address);
  });

  it("should allow owner to transfer ownership", async () => {
    await core.transferOwnership(user.address);
    expect(await core.owner()).to.equal(user.address);
  });

  it("should prevent non-owner from transferring ownership", async () => {
    await expect(core.connect(user).transferOwnership(user.address))
      .to.be.revert(ethers);
  });

  it("should allow only owner to set treasury address", async () => {
    await core.setTreasuryAddress(treasury.address);
    expect(await core.treasuryAddress()).to.equal(treasury.address);
  });

  it("should revert treasury update from non-owner", async () => {
    await expect(core.connect(user).setTreasuryAddress(user.address))
      .to.be.revert(ethers);
  });

  it("should revert treasury update if zero address", async () => {
    await expect(core.setTreasuryAddress(ethers.ZeroAddress))
      .to.be.revertedWith("Invalid address");
  });

  it("should allow only owner to add accepted tokens", async () => {
    await core.addAcceptedToken(TOKEN_NAME, token.target);
    expect(await core.acceptedTokens(TOKEN_NAME)).to.equal(token.target);
  });

  it("should revert token addition from non-owner", async () => {
    await expect(core.connect(user).addAcceptedToken(TOKEN_NAME, token.target))
      .to.be.revert(ethers);
  });

  it("should revert adding token with zero address", async () => {
    await expect(core.addAcceptedToken("ZERO", ethers.ZeroAddress))
      .to.be.revertedWith("Invalid token address");
  });
});
