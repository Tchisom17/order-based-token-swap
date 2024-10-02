import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MockERC20Module = buildModule("MockERC20Module", (m) => {
  const erc20 = m.contract("MockERC20", ["MyToken", "MYT", 1000]);

  return { erc20 };
});

export default MockERC20Module;
