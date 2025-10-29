// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./helpers/HederaTokenService.sol";
import "./helpers/HederaResponseCodes.sol";

contract ServicePaymentContract is HederaTokenService {
    address public treasuryAccount;
    address public platformAccount;
    
    // Service provider registry
    mapping(address => ServiceProvider) public providers;
    
    // Payment distribution percentages (basis points)
    uint256 constant PROVIDER_SHARE = 7000; // 70%
    uint256 constant MODEL_DEVELOPER_SHARE = 1500; // 15%
    uint256 constant PLATFORM_SHARE = 1000; // 10%
    uint256 constant COMMUNITY_SHARE = 500; // 5%
    
    struct ServiceProvider {
        bool isActive;
        uint256 reputationScore;
        uint256 totalEarnings;
        uint256 serviceCount;
        ServiceType serviceType;
    }
    
    enum ServiceType {
        Internet,
        Energy,
        Compute
    }
    
    event ServicePaymentProcessed(
        address indexed provider,
        address indexed consumer,
        uint256 amount,
        ServiceType serviceType
    );
    
    constructor(address _treasury, address _platform) {
        treasuryAccount = _treasury;
        platformAccount = _platform;
    }
    
    function processServicePayment(
        address provider,
        address consumer,
        address tokenAddress,
        uint256 amount,
        ServiceType serviceType
    ) external returns (int responseCode) {
        require(providers[provider].isActive, "Provider not active");
        
        // Calculate distribution
        uint256 providerAmount = (amount * PROVIDER_SHARE) / 10000;
        uint256 platformAmount = (amount * PLATFORM_SHARE) / 10000;
        uint256 communityAmount = (amount * COMMUNITY_SHARE) / 10000;
        
        // Execute transfers
        responseCode = HederaTokenService.transferToken(
            tokenAddress, consumer, provider, int64(uint64(providerAmount))
        );
        require(responseCode == HederaResponseCodes.SUCCESS, "Provider transfer failed");
        
        responseCode = HederaTokenService.transferToken(
            tokenAddress, consumer, platformAccount, int64(uint64(platformAmount))
        );
        require(responseCode == HederaResponseCodes.SUCCESS, "Platform transfer failed");
        
        responseCode = HederaTokenService.transferToken(
            tokenAddress, consumer, treasuryAccount, int64(uint64(communityAmount))
        );
        require(responseCode == HederaResponseCodes.SUCCESS, "Community transfer failed");
        
        // Update provider stats
        providers[provider].totalEarnings += providerAmount;
        providers[provider].serviceCount += 1;
        
        emit ServicePaymentProcessed(provider, consumer, amount, serviceType);
        
        return HederaResponseCodes.SUCCESS;
    }
    
    function registerProvider(
        address provider,
        ServiceType serviceType
    ) external {
        require(!providers[provider].isActive, "Provider already registered");
        
        providers[provider] = ServiceProvider({
            isActive: true,
            reputationScore: 50, // Starting reputation
            totalEarnings: 0,
            serviceCount: 0,
            serviceType: serviceType
        });
    }
    
    function updateProviderReputation(
        address provider,
        uint256 newScore
    ) external {
        require(msg.sender == platformAccount, "Only platform can update reputation");
        providers[provider].reputationScore = newScore;
    }
}