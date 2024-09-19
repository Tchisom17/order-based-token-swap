// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OrderSwap {

    address public owner;
    uint256 public feePercentage;

    struct Order {
        address depositor;
        address tokenDeposited;
        uint256 amountDeposited;
        address tokenDesired;
        uint256 amountDesired;
        uint256 slippageTolerance;
        bool isActive;
    }

    uint256 public orderCount;
    mapping(uint256 => Order) public orders;

    event OrderCreated(
        uint256 orderId,
        address depositor,
        address tokenDeposited,
        uint256 amountDeposited,
        address tokenDesired,
        uint256 amountDesired,
        uint256 slippageTolerance
    );
    event OrderFulfilled(
        uint256 orderId,
        address fulfiller
    );
    event OrderCancelled(
        uint256 orderId
    );

    constructor(uint256 _feePercentage) {
        require(_feePercentage <= 10000, "Fee percentage too high");
        owner = msg.sender;
        feePercentage = _feePercentage;
    }

    function createOrder(
        address _tokenDeposited,
        uint256 _amountDeposited,
        address _tokenDesired,
        uint256 _amountDesired,
        uint256 _slippageTolerance
    ) external {
        require(_amountDeposited > 0, "Amount deposited must be greater than 0");
        require(_amountDesired > 0, "Amount desired must be greater than 0");
        require(_slippageTolerance <= 10000, "Slippage tolerance too high");
        require(IERC20(_tokenDeposited).transferFrom(msg.sender, address(this), _amountDeposited), "Transfer failed");

        orderCount++;
        orders[orderCount] = Order({
            depositor: msg.sender,
            tokenDeposited: _tokenDeposited,
            amountDeposited: _amountDeposited,
            tokenDesired: _tokenDesired,
            amountDesired: _amountDesired,
            slippageTolerance: _slippageTolerance,
            isActive: true
        });

        emit OrderCreated(orderCount, msg.sender, _tokenDeposited, _amountDeposited, _tokenDesired, _amountDesired, _slippageTolerance);
    }

    function fulfillOrder(uint256 _id) external {
        Order storage order = orders[_id];
        require(order.isActive, "Order is not active");

        uint256 fee = (order.amountDesired * feePercentage) / 10000;
        uint256 minAmountDesired = (order.amountDesired * (10000 - order.slippageTolerance)) / 10000;
        // require(order.amountDesired >= minAmountDesired, "Amount does not meet slippage tolerance");
        require(IERC20(order.tokenDesired).balanceOf(msg.sender) >= minAmountDesired, "Insufficient balance of desired token");

        order.isActive = false;
        require(IERC20(order.tokenDesired).transferFrom(msg.sender, order.depositor, order.amountDesired - fee), "Transfer failed");
        require(IERC20(order.tokenDeposited).transfer(msg.sender, order.amountDeposited), "Transfer failed");
        require(IERC20(order.tokenDesired).transfer(owner, fee), "Fee transfer failed");

        emit OrderFulfilled(_id, msg.sender);
    }

    function cancelOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(order.depositor == msg.sender, "Only depositor can cancel the order");
        require(order.isActive, "Order is not active");

        order.isActive = false;
        require(IERC20(order.tokenDeposited).transfer(msg.sender, order.amountDeposited), "Transfer failed");

        emit OrderCancelled(_orderId);
    }

    function setFeePercentage(uint256 _feePercentage) external {
        require(msg.sender == owner, "Only owner can set fee");
        require(_feePercentage <= 10000, "Fee percentage too high");
        feePercentage = _feePercentage;
    }
}
