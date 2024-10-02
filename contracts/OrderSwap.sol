// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OrderSwap {

    address public owner;
    uint256 public feePercentage;
    uint256 public constant BASIS_POINTS = 10000;

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

    error AmountMustBeGreaterThanZero();
    error InvalidFeePercentage();
    error InvalidSlippageTolerance();
    error InsufficientBalanceOfDesiredToken();
    error TransferFailed();
    error OnlyDepositorCanCancel();
    error OnlyOwnerCanSetFee();
    error OrderNotActive();

    constructor(uint256 _feePercentage) {
        _validateFeePercentage(_feePercentage);
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
        _validateAmount(_amountDeposited);
        _validateAmount(_amountDesired);
        _validateSlippageTolerance(_slippageTolerance);
        _validateTransfer(IERC20(_tokenDeposited).transferFrom(msg.sender, address(this), _amountDeposited));

        orderCount += 1;
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

    function confirmOrder(uint256 _id) external {
        Order storage order = orders[_id];
        _validateOrderIsActive(order.isActive);

        uint256 fee = (order.amountDesired * feePercentage) / BASIS_POINTS;
        uint256 minAmountDesired = (order.amountDesired * (BASIS_POINTS - order.slippageTolerance)) / BASIS_POINTS;

        _validateSufficientBalance(IERC20(order.tokenDesired).balanceOf(msg.sender), minAmountDesired);

        order.isActive = false;
        
        _validateTransfer(IERC20(order.tokenDesired).transferFrom(msg.sender, order.depositor, order.amountDesired - fee));
        _validateTransfer(IERC20(order.tokenDeposited).transfer(msg.sender, order.amountDeposited));
        _validateTransfer(IERC20(order.tokenDesired).transfer(owner, fee));

        emit OrderFulfilled(_id, msg.sender);
    }

    function cancelOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        _validateOnlyDepositor(msg.sender, order.depositor);
        _validateOrderIsActive(order.isActive);

        order.isActive = false;
        _validateTransfer(IERC20(order.tokenDeposited).transfer(msg.sender, order.amountDeposited));

        emit OrderCancelled(_orderId);
    }

    function setFeePercentage(uint256 _feePercentage) external {
        _validateOnlyOwner(msg.sender);
        _validateFeePercentage(_feePercentage);
        feePercentage = _feePercentage;
    }

    function _validateTransfer(bool success) internal pure {
        if (!success) revert TransferFailed();
    }

    function _validateAmount(uint256 amount) internal pure {
        if (amount == 0) revert AmountMustBeGreaterThanZero();
    }

    function _validateFeePercentage(uint256 _feePercentage) internal pure {
        if (_feePercentage > 10000) revert InvalidFeePercentage();
    }

    function _validateSlippageTolerance(uint256 _slippageTolerance) internal pure {
        if (_slippageTolerance > 10000) revert InvalidSlippageTolerance();
    }

    function _validateSufficientBalance(uint256 balance, uint256 minAmountDesired) internal pure {
        if (balance < minAmountDesired) revert InsufficientBalanceOfDesiredToken();
    }

    function _validateOnlyDepositor(address sender, address depositor) internal pure {
        if (sender != depositor) revert OnlyDepositorCanCancel();
    }

    function _validateOrderIsActive(bool isActive) internal pure {
        if (!isActive) revert OrderNotActive();
    }

    function _validateOnlyOwner(address sender) internal view {
        if (sender != owner) revert OnlyOwnerCanSetFee();
    }
    
}
