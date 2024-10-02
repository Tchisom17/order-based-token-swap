import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OrderSwapModule = buildModule("OrderSwapModule", (m) => {
  const orderSwap = m.contract("OrderSwap", [1000]);

  return { orderSwap };
});

export default OrderSwapModule;

/*   0x7c7892499E4256f6A60283Fe82Cd1f8A885E1657
    0xeA2aa67Aa0F8AAF4220D23a3e8fC8Bbe9F3d82fA */
