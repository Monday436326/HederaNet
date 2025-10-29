// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./helpers/HederaTokenService.sol";
import "./helpers/HederaResponseCodes.sol";

contract EnergyTradingContract is HederaTokenService {
    struct EnergyListing {
        address seller;
        uint256 energyAmount; // in kWh * 100 (2 decimals)
        uint256 pricePerKwh; // in HNET smallest unit
        uint256 expirationTime;
        bool isActive;
        bytes32 qualityHash;
    }
    
    mapping(bytes32 => EnergyListing) public listings;
    mapping(address => uint256) public energyBalances;
    
    address public energyCreditToken; // HEC token address
    address public paymentToken; // HNET token address
    
    event EnergyListed(
        bytes32 indexed listingId,
        address indexed seller,
        uint256 amount,
        uint256 price
    );
    
    event EnergyPurchased(
        bytes32 indexed listingId,
        address indexed buyer,
        uint256 amount,
        uint256 totalCost
    );
    
    constructor(address _energyToken, address _paymentToken) {
        energyCreditToken = _energyToken;
        paymentToken = _paymentToken;
    }
    
    function createListing(
        uint256 amount,
        uint256 pricePerKwh,
        uint256 duration,
        bytes32 qualityProof
    ) external returns (bytes32 listingId) {
        require(amount > 0, "Amount must be positive");
        require(pricePerKwh > 0, "Price must be positive");
        require(duration > 0, "Duration must be positive");
        
        // Generate listing ID
        listingId = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            amount
        ));
        
        require(!listings[listingId].isActive, "Listing already exists");
        
        // Create listing
        listings[listingId] = EnergyListing({
            seller: msg.sender,
            energyAmount: amount,
            pricePerKwh: pricePerKwh,
            expirationTime: block.timestamp + duration,
            isActive: true,
            qualityHash: qualityProof
        });
        
        // Associate tokens if needed (caller must have already associated)
        // The actual token transfer will happen during purchase
        
        emit EnergyListed(listingId, msg.sender, amount, pricePerKwh);
    }
    
    function purchaseEnergy(
        bytes32 listingId
    ) external returns (int responseCode) {
        EnergyListing storage listing = listings[listingId];
        
        require(listing.isActive, "Listing not active");
        require(block.timestamp < listing.expirationTime, "Listing expired");
        require(msg.sender != listing.seller, "Cannot buy own listing");
        
        uint256 totalCost = (listing.energyAmount * listing.pricePerKwh) / 100;
        
        // Transfer payment from buyer to seller
        responseCode = transferToken(
            paymentToken,
            msg.sender,
            listing.seller,
            int64(uint64(totalCost))
        );
        require(responseCode == HederaResponseCodes.SUCCESS, "Payment failed");
        
        // Transfer energy credits from seller to buyer
        responseCode = transferToken(
            energyCreditToken,
            listing.seller,
            msg.sender,
            int64(uint64(listing.energyAmount))
        );
        require(responseCode == HederaResponseCodes.SUCCESS, "Energy transfer failed");
        
        // Mark listing as inactive
        listing.isActive = false;
        
        emit EnergyPurchased(listingId, msg.sender, listing.energyAmount, totalCost);
        
        return HederaResponseCodes.SUCCESS;
    }
    
    function cancelListing(bytes32 listingId) external returns (bool) {
        EnergyListing storage listing = listings[listingId];
        
        require(listing.isActive, "Listing not active");
        require(msg.sender == listing.seller, "Only seller can cancel");
        
        listing.isActive = false;
        
        return true;
    }
    
    function getListing(bytes32 listingId) external view returns (
        address seller,
        uint256 energyAmount,
        uint256 pricePerKwh,
        uint256 expirationTime,
        bool isActive,
        bytes32 qualityHash
    ) {
        EnergyListing memory listing = listings[listingId];
        return (
            listing.seller,
            listing.energyAmount,
            listing.pricePerKwh,
            listing.expirationTime,
            listing.isActive,
            listing.qualityHash
        );
    }
    
    function getMarketPrice() external pure returns(uint256) {
        uint256 totalVolume = 0;
        uint256 weightedSum = 0;
        
        
        if (totalVolume == 0) {
            return 0;
        }
        
        return weightedSum / totalVolume;
    }
}