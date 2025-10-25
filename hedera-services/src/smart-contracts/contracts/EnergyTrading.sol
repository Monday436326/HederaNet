// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

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
        // Verify seller has energy credits
        int64 balance = HederaTokenService.balanceOf(
            energyCreditToken,
            msg.sender
        );
        require(uint256(uint64(balance)) >= amount, "Insufficient energy credits");
        
        // Generate listing ID
        listingId = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            amount
        ));
        
        // Create listing
        listings[listingId] = EnergyListing({
            seller: msg.sender,
            energyAmount: amount,
            pricePerKwh: pricePerKwh,
            expirationTime: block.timestamp + duration,
            isActive: true,
            qualityHash: qualityProof
        });
        
        emit EnergyListed(listingId, msg.sender, amount, pricePerKwh);
    }
    
    function purchaseEnergy(
        bytes32 listingId
    ) external returns (int responseCode) {
        EnergyListing storage listing = listings[listingId];
        
        require(listing.isActive, "Listing not active");
        require(block.timestamp < listing.expirationTime, "Listing expired");
        
        uint256 totalCost = listing.energyAmount * listing.pricePerKwh / 100;
        
        // Transfer payment from buyer to seller
        responseCode = HederaTokenService.transferToken(
            paymentToken,
            msg.sender,
            listing.seller,
            int64(uint64(totalCost))
        );
        require(responseCode == HederaResponseCodes.SUCCESS, "Payment failed");
        
        // Transfer energy credits from seller to buyer
        responseCode = HederaTokenService.transferToken(
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
    
    function getMarketPrice() external view returns (uint256) {
        // Calculate weighted average of active listings
        uint256 totalVolume = 0;
        uint256 weightedSum = 0;
        
        // Implementation would iterate through active listings
        // This is simplified for demonstration
        
        return weightedSum / totalVolume;
    }
}