// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CrazyRushHeroes is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public treasuryAddress;

    mapping(string => IERC20) public acceptedTokens;
    mapping(bytes32 => uint256) public itemPrices; // keccak(itemType, tokenName, amount) => price

    event TreasuryUpdated(address newTreasury);
    event TokenAdded(string tokenName, address tokenAddress);
    event ItemPriceUpdated(string itemType, string tokenName,uint256 amount, uint256 price);
    event ItemTierPricesBatchUpdated(string itemType, uint256[] amounts, uint256[] prices);
    event ItemBought(address indexed buyer, string itemType, uint256 amount, string paymentToken, uint256 totalPrice);

    constructor() Ownable(msg.sender) {
        treasuryAddress = msg.sender;
    }

    // ===================== Admin =====================

    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        require(_treasuryAddress != address(0), "Invalid address");
        treasuryAddress = _treasuryAddress;
        emit TreasuryUpdated(_treasuryAddress);
    }

    function addAcceptedToken(string calldata tokenName, address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        acceptedTokens[tokenName] = IERC20(tokenAddress);
        emit TokenAdded(tokenName, tokenAddress);
    }

    // ===================== Price Management =====================

    function setItemPrice(
        string calldata itemType,
        string calldata tokenName,
        uint256 amount,
        uint256 price
    ) external onlyOwner {
        require(bytes(itemType).length > 0, "Invalid item type");
        require(bytes(tokenName).length > 0, "Invalid token name");
        require(amount > 0, "Amount must be > 0");
        require(price > 0, "Price must be > 0");

        bytes32 key = keccak256(abi.encode(itemType, tokenName, amount));
        itemPrices[key] = price;

        emit ItemPriceUpdated(itemType, tokenName, amount, price);
    }

    function batchSetItemPrices(
        string calldata itemType,
        string calldata tokenName,
        uint256[] calldata amounts,
        uint256[] calldata prices
    ) external onlyOwner {
        require(amounts.length == prices.length, "Mismatched lengths");
        require(amounts.length > 0 , "Invalid tier count");

        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0 && prices[i] > 0, "Invalid tier entry");
            bytes32 key = keccak256(abi.encode(itemType, tokenName, amounts[i]));
            itemPrices[key] = prices[i];
        }

        emit ItemTierPricesBatchUpdated(itemType, amounts, prices);
    }

    // ===================== Purchase =====================

    function buyItem(
        string calldata itemType,
        uint256 amount,
        string calldata paymentToken
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than zero");

        IERC20 token = acceptedTokens[paymentToken];
        require(address(token) != address(0), "Invalid payment token");

        bytes32 key = keccak256(abi.encode(itemType, paymentToken, amount));
        uint256 priceToPay = itemPrices[key];

        // Fallback to unit price
        if (priceToPay == 0) {
            bytes32 unitKey = keccak256(abi.encode(itemType, paymentToken, 1));
            uint256 unitPrice = itemPrices[unitKey];
            require(unitPrice > 0, "Unit price not configured");
            priceToPay = unitPrice * amount;
        }

        token.safeTransferFrom(msg.sender, treasuryAddress, priceToPay);

        emit ItemBought(msg.sender, itemType, amount, paymentToken, priceToPay);
    }

}
