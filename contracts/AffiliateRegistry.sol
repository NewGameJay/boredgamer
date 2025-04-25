// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AffiliateRegistry is Ownable, ReentrancyGuard {
    // Affiliate code hash => payout address
    mapping(bytes32 => address) public affiliatePayouts;
    
    // Affiliate code hash => royalty rate (in basis points, e.g., 500 = 5%)
    mapping(bytes32 => uint256) public royaltyRates;
    
    // Affiliate code hash => total earnings
    mapping(bytes32 => uint256) public totalEarnings;
    
    // Maximum royalty rate (10%)
    uint256 public constant MAX_ROYALTY_RATE = 1000;
    
    event AffiliateRegistered(
        bytes32 indexed codeHash,
        address indexed payoutAddress,
        uint256 royaltyRate
    );
    
    event RoyaltyPaid(
        bytes32 indexed codeHash,
        address indexed recipient,
        uint256 amount,
        address tokenAddress
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Register or update an affiliate code
     * @param code The affiliate code
     * @param payoutAddress Address to receive royalties
     * @param royaltyRate Royalty rate in basis points (e.g., 500 = 5%)
     */
    function registerAffiliate(
        string calldata code,
        address payoutAddress,
        uint256 royaltyRate
    ) external onlyOwner {
        require(payoutAddress != address(0), "Invalid payout address");
        require(royaltyRate <= MAX_ROYALTY_RATE, "Royalty rate too high");
        
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        affiliatePayouts[codeHash] = payoutAddress;
        royaltyRates[codeHash] = royaltyRate;
        
        emit AffiliateRegistered(codeHash, payoutAddress, royaltyRate);
    }
    
    /**
     * @dev Process a native token (ETH) royalty payment
     * @param code The affiliate code
     */
    function processNativeRoyalty(
        string calldata code
    ) external payable nonReentrant {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        address payoutAddress = affiliatePayouts[codeHash];
        require(payoutAddress != address(0), "Invalid affiliate code");
        
        uint256 royaltyAmount = (msg.value * royaltyRates[codeHash]) / 10000;
        totalEarnings[codeHash] += royaltyAmount;
        
        (bool success, ) = payoutAddress.call{value: royaltyAmount}("");
        require(success, "Royalty transfer failed");
        
        emit RoyaltyPaid(codeHash, payoutAddress, royaltyAmount, address(0));
    }
    
    /**
     * @dev Process an ERC20 token royalty payment
     * @param code The affiliate code
     * @param tokenAddress The ERC20 token address
     * @param amount The total amount of tokens
     */
    function processTokenRoyalty(
        string calldata code,
        address tokenAddress,
        uint256 amount
    ) external nonReentrant {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        address payoutAddress = affiliatePayouts[codeHash];
        require(payoutAddress != address(0), "Invalid affiliate code");
        
        uint256 royaltyAmount = (amount * royaltyRates[codeHash]) / 10000;
        totalEarnings[codeHash] += royaltyAmount;
        
        IERC20 token = IERC20(tokenAddress);
        require(
            token.transferFrom(msg.sender, payoutAddress, royaltyAmount),
            "Token transfer failed"
        );
        
        emit RoyaltyPaid(codeHash, payoutAddress, royaltyAmount, tokenAddress);
    }
    
    /**
     * @dev Get affiliate stats
     * @param code The affiliate code
     * @return payoutAddress The payout address
     * @return royaltyRate The royalty rate
     * @return earnings Total earnings
     */
    function getAffiliateStats(string calldata code)
        external
        view
        returns (
            address payoutAddress,
            uint256 royaltyRate,
            uint256 earnings
        )
    {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        return (
            affiliatePayouts[codeHash],
            royaltyRates[codeHash],
            totalEarnings[codeHash]
        );
    }
}
