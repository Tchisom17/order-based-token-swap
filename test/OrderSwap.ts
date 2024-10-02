import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("OrderSwap", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  const amountDeposited = ethers.parseUnits("100", 18);
  const amountDesired = ethers.parseUnits("10", 18);
  const trfAmount = ethers.parseUnits("100", 18);
  const slippageTolerance = 5;

  async function deployToken() {
    // string memory _name, string memory _symbol, uint256 _totalSupply
    const name1 = "GuzToken";
    const symbol1 = "GUZ";
    const totalSupply1 = ethers.parseUnits("1000", 18);

    const Token = await hre.ethers.getContractFactory("MockERC20");
    const tokenA = await Token.deploy(name1, symbol1, totalSupply1);

    const name2 = "Web3Bridge";
    const symbol2 = "W3B";
    const totalSupply2 = ethers.parseUnits("1000", 18);

    // const Token = await hre.ethers.getContractFactory("MockERC20");
    const tokenB = await Token.deploy(name2, symbol2, totalSupply2);

    return { tokenA, tokenB };
  }

  async function deployOrderSwap() {
    const [owner, signer1, signer2, signer3, recipient] = await hre.ethers.getSigners();
    const { tokenA, tokenB } = await loadFixture(deployToken);

    const feePercentage = 1000;
    const OrderSwap = await hre.ethers.getContractFactory("OrderSwap");
    const orderSwap = await OrderSwap.deploy(feePercentage);

    return { orderSwap, feePercentage, owner, signer1, signer2, signer3, tokenA, tokenB, recipient };
  }

  describe("Deployment", function () {
    it("Should fail to deploy if fee percentage is greater than 10000", async function () {
      const feePercentage = 12000;
      const OrderSwap = await hre.ethers.getContractFactory("OrderSwap");

      await expect(OrderSwap.deploy(feePercentage)).to.be.reverted;
    });    

    it("Should check if owner is properly set", async function () {
      const { orderSwap, owner } = await loadFixture(deployOrderSwap);

      expect(await orderSwap.owner()).to.equals(owner);
    });
    
    it("Should set the correct fee percentage", async function () {
      const { orderSwap, feePercentage } = await loadFixture(deployOrderSwap);

      expect(await orderSwap.feePercentage()).to.equals(feePercentage);
    });
  });

  describe("Create Order", function () {
    it("Should fail if amount deposited equals zero", async function () {
      const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);

      const amountDeposit = ethers.parseUnits("0", 18);

      await tokenA.transfer(signer1, trfAmount);
      await tokenA.connect(signer1).approve(orderSwap, trfAmount);
      await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposit, tokenB, amountDesired, slippageTolerance)).to.be.revertedWithCustomError(orderSwap, "AmountMustBeGreaterThanZero");
    });

    it("Should fail if amount desired equals zero", async function () {
        const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
  
        const amountDesire = ethers.parseUnits("0", 18);
  
        await tokenA.transfer(signer1, trfAmount);
        await tokenA.connect(signer1).approve(orderSwap, trfAmount);
        await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesire, slippageTolerance)).to.be.revertedWithCustomError(orderSwap, "AmountMustBeGreaterThanZero");
      });

    it("Should fail if slippage is greater than 10000", async function () {
        const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
        const slippage = 11000;

        await tokenA.transfer(signer1, trfAmount);
        await tokenA.connect(signer1).approve(orderSwap, trfAmount);
        await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippage)).to.be.revertedWithCustomError(orderSwap, "InvalidSlippageTolerance");
    });

    // it("Should fail if transfer to contract is not successful", async function () {
    //     const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);

    //     await tokenA.transfer(signer1, trfAmount);
    //     await tokenA.connect(signer1).approve(orderSwap, amountDeposited);
    //     await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance)).to.be.revertedWithCustomError(orderSwap, "TransferFailed");
    // });

    it("Should create order successfully", async function () {
        const { orderSwap, owner, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
    
        await tokenA.transfer(signer1, trfAmount);
        expect(await tokenA.balanceOf(signer1)).to.equal(trfAmount);

        await tokenA.connect(signer1).approve(orderSwap, trfAmount);

        const initialDepositorBalance = await tokenA.balanceOf(signer1);
        
        expect(await tokenA.balanceOf(signer1)).to.equal(trfAmount);

        await orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance);

        const finalDepositorBalance = await tokenA.balanceOf(signer1);
        const finalContractBalance = await tokenA.balanceOf(orderSwap);

        expect(finalDepositorBalance).to.equal(0);
        expect(finalContractBalance).to.equal(amountDeposited);
    });

    it("Should emit event upon successful order creation", async function () {
        const { orderSwap, owner, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
    
        await tokenA.transfer(signer1, trfAmount);
        expect(await tokenA.balanceOf(signer1)).to.equal(trfAmount);

        await tokenA.connect(signer1).approve(orderSwap, trfAmount);

        // await orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance);

        expect( await orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance))
        .to.emit(orderSwap, "OrderCreated")
        .withArgs(orderSwap.orderCount(), signer1.address, tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance);
    });
  });

  describe("Confirm Order", function () {
    it("Should fail to confirm if order is not active ", async function () {
      const { orderSwap, owner, signer1, signer2, tokenA, tokenB } = await loadFixture(deployOrderSwap);
      // const depAmount = ethers.parseUnits("10", 18)
    //   const amountDeposit = ethers.parseUnits("0", 18);
    const orderSwapBalance = await tokenB.balanceOf(orderSwap);

      await tokenA.transfer(signer1, trfAmount);
      await tokenA.connect(signer1).approve(orderSwap, trfAmount);
      await orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance);

      await tokenB.transfer(signer2, trfAmount);
      await tokenB.connect(signer2).approve(orderSwap, trfAmount);

      const id = 1;

      await orderSwap.connect(signer2).confirmOrder(id);
      // await expect(orderSwap.connect(signer2).confirmOrder(id))
      //       .to.emit(orderSwap, "OrderFulfilled")
      //       .withArgs(id, await signer2.getAddress());
      //       const order = await orderSwap.orders(id);
      //   expect(order.isActive).to.be.false;
    });

    // it("Should fail if amount desired equals zero", async function () {
    //     const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
  
    //     const amountDesire = ethers.parseUnits("0", 18);
  
    //     await tokenA.transfer(signer1, trfAmount);
    //     await tokenA.connect(signer1).approve(orderSwap, trfAmount);
    //     await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesire, slippageTolerance)).to.be.revertedWithCustomError(orderSwap, "AmountMustBeGreaterThanZero");
    //   });

    // it("Should fail if slippage is greater than 10000", async function () {
    //     const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
    //     const slippage = 11000;

    //     await tokenA.transfer(signer1, trfAmount);
    //     await tokenA.connect(signer1).approve(orderSwap, trfAmount);
    //     await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippage)).to.be.revertedWithCustomError(orderSwap, "InvalidSlippageTolerance");
    // });

    // // it("Should fail if transfer to contract is not successful", async function () {
    // //     const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);

    // //     await tokenA.transfer(signer1, trfAmount);
    // //     await tokenA.connect(signer1).approve(orderSwap, amountDeposited);
    // //     await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance)).to.be.revertedWithCustomError(orderSwap, "TransferFailed");
    // // });

    // it("Should create order successfully", async function () {
    //     const { orderSwap, owner, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
    
    //     await tokenA.transfer(signer1, trfAmount);
    //     expect(await tokenA.balanceOf(signer1)).to.equal(trfAmount);

    //     await tokenA.connect(signer1).approve(orderSwap, trfAmount);

    //     const initialDepositorBalance = await tokenA.balanceOf(signer1);
        
    //     expect(initialDepositorBalance).to.equal(amountDeposited);

    //     await orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance);

    //     const finalDepositorBalance = await tokenA.balanceOf(signer1);
    //     const finalContractBalance = await tokenA.balanceOf(orderSwap);

    //     expect(finalDepositorBalance).to.equal(0);
    //     expect(finalContractBalance).to.equal(amountDeposited);
    // });

    // it("Should emit event upon successful order creation", async function () {
    //     const { orderSwap, owner, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
    
    //     await tokenA.transfer(signer1, trfAmount);
    //     expect(await tokenA.balanceOf(signer1)).to.equal(trfAmount);

    //     await tokenA.connect(signer1).approve(orderSwap, trfAmount);

    //     // await orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance);

    //     await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance))
    //     .to.emit(orderSwap, "OrderCreated")
    //     .withArgs(1, signer1.address, tokenA, amountDeposited, tokenB, amountDesired, slippageTolerance);
    // });
  });

});
