// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;
import "./helpers/HederaTokenService.sol";

contract GovernanceContract {
    struct Proposal {
        address proposer;
        string title;
        string description;
        uint256 votingStartTime;
        uint256 votingEndTime;
        uint256 quorumRequired;
        uint256 approvalThreshold;
        ProposalStatus status;
        mapping(address => Vote) votes;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 abstainVotes;
    }
    
    struct Vote {
        bool hasVoted;
        VoteChoice choice;
        uint256 votingPower;
    }
    
    enum ProposalStatus {
        Pending,
        Active,
        Passed,
        Rejected,
        Executed
    }
    
    enum VoteChoice {
        Yes,
        No,
        Abstain
    }
    
    mapping(bytes32 => Proposal) public proposals;
    address public governanceToken;
    address public reputationContract;
    
    event ProposalCreated(
        bytes32 indexed proposalId,
        address indexed proposer,
        string title
    );
    
    event VoteCast(
        bytes32 indexed proposalId,
        address indexed voter,
        VoteChoice choice,
        uint256 votingPower
    );
    
    event ProposalExecuted(
        bytes32 indexed proposalId,
        ProposalStatus finalStatus
    );
    
    constructor(address _governanceToken, address _reputationContract) {
        governanceToken = _governanceToken;
        reputationContract = _reputationContract;
    }
    
    function createProposal(
        string memory title,
        string memory description,
        uint256 votingPeriod,
        uint256 quorum,
        uint256 threshold
    ) external returns (bytes32 proposalId) {
        // Verify proposer eligibility
        require(checkProposerEligibility(msg.sender), "Proposer not eligible");
        
        proposalId = keccak256(abi.encodePacked(
            msg.sender,
            title,
            block.timestamp
        ));
        
        Proposal storage proposal = proposals[proposalId];
        proposal.proposer = msg.sender;
        proposal.title = title;
        proposal.description = description;
        proposal.votingStartTime = block.timestamp + 14 days; // Discussion period
        proposal.votingEndTime = proposal.votingStartTime + votingPeriod;
        proposal.quorumRequired = quorum;
        proposal.approvalThreshold = threshold;
        proposal.status = ProposalStatus.Pending;
        
        emit ProposalCreated(proposalId, msg.sender, title);
    }
    
    function castVote(
        bytes32 proposalId,
        VoteChoice choice
    ) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp >= proposal.votingStartTime, "Voting not started");
        require(block.timestamp <= proposal.votingEndTime, "Voting ended");
        require(!proposal.votes[msg.sender].hasVoted, "Already voted");
        
        // Calculate voting power
        uint256 votingPower = calculateVotingPower(msg.sender);
        
        // Record vote
        proposal.votes[msg.sender] = Vote({
            hasVoted: true,
            choice: choice,
            votingPower: votingPower
        });
        
        // Update tallies
        if (choice == VoteChoice.Yes) {
            proposal.yesVotes += votingPower;
        } else if (choice == VoteChoice.No) {
            proposal.noVotes += votingPower;
        } else {
            proposal.abstainVotes += votingPower;
        }
        
        emit VoteCast(proposalId, msg.sender, choice, votingPower);
    }
    
    function finalizeProposal(bytes32 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp > proposal.votingEndTime, "Voting not ended");
        require(proposal.status == ProposalStatus.Active, "Already finalized");
        
        uint256 totalVotes = proposal.yesVotes + proposal.noVotes + proposal.abstainVotes;
        uint256 totalSupply = getTotalVotingSupply();
        
        // Check quorum
        bool quorumReached = (totalVotes * 10000 / totalSupply) >= proposal.quorumRequired;
        
        // Check approval
        uint256 approvalRate = proposal.yesVotes * 10000 / (proposal.yesVotes + proposal.noVotes);
        bool approved = approvalRate >= proposal.approvalThreshold;
        
        if (quorumReached && approved) {
            proposal.status = ProposalStatus.Passed;
        } else {
            proposal.status = ProposalStatus.Rejected;
        }
        
        emit ProposalExecuted(proposalId, proposal.status);
    }
    
    function calculateVotingPower(
        address voter 
    ) internal view returns (uint256) {
       
        // Get reputation multiplier from reputation contract
        (bool success, bytes memory data) = reputationContract.staticcall(
            abi.encodeWithSignature("getReputationMultiplier(address)", voter)
        );
        
        uint256 reputationMultiplier = success ? abi.decode(data, (uint256)) : 100; // Default 1.0x
        
        // Calculate total voting power
        return  reputationMultiplier / 100;
    }
    
    function checkProposerEligibility(address proposer) internal view returns (bool) {
        
        // Minimum reputation requirement
        (bool success, bytes memory data) = reputationContract.staticcall(
            abi.encodeWithSignature("getReputationScore(address)", proposer)
        );
        
        if (success) {
            uint256 reputation = abi.decode(data, (uint256));
            return reputation >= 50; // Minimum reputation of 50
        }
        
        return false;
    }
    
    function getTotalVotingSupply() internal pure returns (uint256) {
       
        return 600000000 * 10**8; // 600M circulating supply example
    }
}