import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("OrderSwap", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployToken() {
    // string memory _name, string memory _symbol, uint256 _totalSupply
    const name1 = "GuzToken";
    const symbol1 = "GUZ";
    const totalSupply1 = ethers.parseUnits("1000", 18);

    const Token = await hre.ethers.getContractFactory("MockERC20");
    const tokenA = await Token.deploy(name1, symbol1, totalSupply1);

    const name2 = "Web3Bridge";
    const symbol2 = "W3B";
    const totalSupply2 = ethers.parseUnits("1000");

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

      const amountDeposited = ethers.parseUnits("0", 18);
      const amountDesired = ethers.parseUnits("10", 18);
      const trfAmount = ethers.parseUnits("100", 18);

      await tokenA.transfer(signer1, trfAmount);
      await tokenA.connect(signer1).approve(orderSwap, trfAmount);
      await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, 1)).to.be.revertedWithCustomError(orderSwap, "AmountMustBeGreaterThanZero");
    });

    it("Should fail if amount desired equals zero", async function () {
        const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
  
        const amountDeposited = ethers.parseUnits("10", 18);
        const amountDesired = ethers.parseUnits("0", 18);
        const trfAmount = ethers.parseUnits("100", 18);
  
        await tokenA.transfer(signer1, trfAmount);
        await tokenA.connect(signer1).approve(orderSwap, trfAmount);
        await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, 1)).to.be.revertedWithCustomError(orderSwap, "AmountMustBeGreaterThanZero");
      });

    it("Should fail if slippage is greater than 10000", async function () {
        const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
  
        const amountDeposited = ethers.parseUnits("10", 18);
        const amountDesired = ethers.parseUnits("10", 18);
        const trfAmount = ethers.parseUnits("10", 18);
  
        await tokenA.transfer(signer1, trfAmount);
        await tokenA.connect(signer1).approve(orderSwap, trfAmount);
        await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, 11000)).to.be.revertedWithCustomError(orderSwap, "InvalidSlippageTolerance");
    });

    it("Should fail if transfer to contract is not successful", async function () {
        const { orderSwap, signer1, tokenA, tokenB } = await loadFixture(deployOrderSwap);
  
        const amountDeposited = ethers.parseUnits("10", 18);
        const amountDesired = ethers.parseUnits("10", 18);
        const trfAmount = ethers.parseUnits("10", 18);
  
        await tokenA.transfer(signer1, trfAmount);
        await tokenA.connect(signer1).approve(orderSwap, trfAmount);
        await expect(orderSwap.connect(signer1).createOrder(tokenA, amountDeposited, tokenB, amountDesired, 11000)).to.be.revertedWithCustomError(orderSwap, "InvalidSlippageTolerance");
    });
  });

//   describe("Approve Transaction", function () {
//     it("Should check for invalid transaction id", async function () {
//       const { multisig, signer1, signer2 , token} = await loadFixture(deployMultisig);
      
//       const amount = ethers.parseUnits("10", 18);
//       const tokenAmount = ethers.parseUnits("30", 18);
  
//       await token.transfer(signer1.address, tokenAmount);
//       expect(await token.balanceOf(signer1.address)).to.equal(tokenAmount);
  
//       await token.connect(signer1).approve(multisig, amount);
//       await token.connect(signer1).transfer(multisig, tokenAmount);
//       expect(await token.balanceOf(multisig)).to.equal(tokenAmount);
  
//       await multisig.connect(signer1).transfer(amount, signer1.address, token);
      
//       const id = 3;  // An id greater than txCount (should be 1 after the transfer)
  
//       await expect(multisig.connect(signer1).approveTx(id)).to.be.revertedWith("invalid tx id");
//     });
//   });

//   describe("Update Quorum", function () {
//     it("Should fail to initiate quorum change if signer's address is not valid", async function () {
//       const quorum = 5;
//       const { multisig, signer1, signer2, signer3, token } = await loadFixture(deployMultisig);
//       // const amount = ethers.parseUnits("10", 18);

//       await expect(multisig.connect(signer3).updateQuorum(quorum)).to.be.revertedWith("invalid signer");
//     });

//     it("Should fail to initiate quorum change if the quorum is greater than valid signers", async function () {
//       const quorum = 5;
//       const { multisig, signer1, signer2, signer3, token } = await loadFixture(deployMultisig);
//       // const amount = ethers.parseUnits("10", 18);

//       await expect(multisig.connect(signer1).updateQuorum(quorum)).to.be.revertedWith("quorum greater than valid signers");
//     });

//     it("Should fail to initiate quorum change if the address has already requested change request", async function () {
//       const quorum = 3;
//       const { multisig, signer1, signer2, signer3, token } = await loadFixture(deployMultisig);
//       // const amount = ethers.parseUnits("10", 18);

//       // await expect(multisig.connect(signer1).updateQuorum(quorum)).to.be.revertedWith("quorum greater than valid signers");
//       await multisig.connect(signer1).updateQuorum(quorum);

//       await expect(multisig.connect(signer1).updateQuorum(quorum)).to.be.revertedWith("quorum change already requested");
//     });

//     it("Should set quorumChangeRequested value to true", async function () {
//       const quorum = 3;
//       const { multisig, signer1, signer2, signer3, token } = await loadFixture(deployMultisig);
//       // const amount = ethers.parseUnits("10", 18);

//       // await expect(multisig.connect(signer1).updateQuorum(quorum)).to.be.revertedWith("quorum greater than valid signers");
//       await multisig.connect(signer1).updateQuorum(quorum);

//       expect(await multisig.quorumChangeRequested()).to.be.true;
//     });

//     it("Should set quorum value to the new quorum value", async function () {
//       const quorum = 3;
//       const { multisig, signer1, signer2, signer3, token } = await loadFixture(deployMultisig);
//       // const amount = ethers.parseUnits("10", 18);

//       // await expect(multisig.connect(signer1).updateQuorum(quorum)).to.be.revertedWith("quorum greater than valid signers");
//       await multisig.connect(signer1).updateQuorum(quorum);

//       expect((await multisig.pendingQuorumChange()).newQuorum).to.be.equal(quorum);
//     });

//     it("Should set the number of approvals to one", async function () {
//       const quorum = 3;
//       const { multisig, signer1, signer2, signer3, token } = await loadFixture(deployMultisig);
//       // const amount = ethers.parseUnits("10", 18);
//       // await expect(multisig.connect(signer1).updateQuorum(quorum)).to.be.revertedWith("quorum greater than valid signers");
//       await multisig.connect(signer1).updateQuorum(quorum);

//       expect((await multisig.pendingQuorumChange()).approvals).to.be.equal(1);
//     });

    // it("Should set the value of approvers at the address to", async function () {
    //   const quorum = 3;
    //   const { multisig, signer1} = await loadFixture(deployMultisig);
    //   // const amount = ethers.parseUnits("10", 18);
    //   // await expect(multisig.connect(signer1).updateQuorum(quorum)).to.be.revertedWith("quorum greater than valid signers");
    //   await multisig.connect(signer1).updateQuorum(quorum);

    //   expect((await multisig.approvers()).to.be.true;
    // });
//   });
});
