// src/screens/GovernanceScreen.tsx - FINAL PRODUCTION VERSION
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {RootState, AppDispatch} from '../store';
import {
  fetchProposals,
  fetchUserGovernanceStats,
  castVote,
  createProposal,
  subscribeToGovernanceEvents,
} from '../store/slices/governanceSlice';
import {Modal} from '../components/common/Modal';
import {Input} from '../components/common/Input';
import {Button} from '../components/common/Button';
import {Card} from '../components/common/Card';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';
import {spacing, borderRadius} from '../theme/spacing';

export const GovernanceScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {connected} = useSelector((state: RootState) => state.wallet);
  const {proposals, votingPower, reputationScore, votesCast, loading} = useSelector(
    (state: RootState) => state.governance,
  );

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');
  const [votingDays, setVotingDays] = useState('7');

  useEffect(() => {
    if (connected) {
      dispatch(fetchProposals());
      dispatch(fetchUserGovernanceStats());
      dispatch(subscribeToGovernanceEvents());
    }
  }, [connected, dispatch]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchProposals()),
      dispatch(fetchUserGovernanceStats()),
    ]);
    setRefreshing(false);
  };

  const handleCreateProposal = async (): Promise<void> => {
    if (!proposalTitle || !proposalDesc || !votingDays) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await dispatch(
        createProposal({
          title: proposalTitle,
          description: proposalDesc,
          votingPeriodDays: parseInt(votingDays),
        }),
      ).unwrap();

      setCreateModalVisible(false);
      setProposalTitle('');
      setProposalDesc('');
      setVotingDays('7');
      Alert.alert('Success', 'Proposal created successfully!');
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  const handleVote = async (
    proposalId: string,
    choice: 'yes' | 'no' | 'abstain',
  ): Promise<void> => {
    Alert.alert(
      'Confirm Vote',
      `Cast your vote: ${choice.toUpperCase()}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Vote',
          onPress: async () => {
            try {
              await dispatch(castVote({proposalId, choice})).unwrap();
              Alert.alert('Success', 'Vote cast successfully!');
            } catch (error) {
              Alert.alert('Error', String(error));
            }
          },
        },
      ],
    );
  };

  const getTimeRemaining = (endTime: number): string => {
    const now = Date.now() / 1000;
    const diff = endTime - now;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Ending soon';
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="vote-yea" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Connect Wallet</Text>
          <Text style={styles.emptyDesc}>
            Please connect your wallet to participate in governance
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }>
        
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{proposals.filter(p => p.status === 'Active').length}</Text>
            <Text style={styles.statLabel}>Active Proposals</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{votingPower.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Voting Power</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{reputationScore}</Text>
            <Text style={styles.statLabel}>Reputation</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{votesCast}</Text>
            <Text style={styles.statLabel}>Votes Cast</Text>
          </Card>
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Active Proposals</Text>
          <Button
            title="Create"
            onPress={() => setCreateModalVisible(true)}
            style={styles.smallButton}
          />
        </View>

        {proposals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="clipboard-list" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyCardText}>No active proposals</Text>
          </Card>
        ) : (
          proposals.map(proposal => (
            <Card key={proposal.proposalId} style={styles.proposalCard}>
              <View style={styles.proposalHeader}>
                <View style={[styles.statusBadge, proposal.status === 'Active' && styles.statusActive]}>
                  <Text style={styles.statusText}>{proposal.status}</Text>
                </View>
                {proposal.status === 'Active' && (
                  <Text style={styles.endDate}>
                    Ends in {getTimeRemaining(proposal.votingEndTime)}
                  </Text>
                )}
              </View>

              <Text style={styles.proposalTitle}>{proposal.title}</Text>
              <Text style={styles.proposalDesc} numberOfLines={3}>
                {proposal.description}
              </Text>

              <View style={styles.voteRow}>
                <Text style={styles.voteLabel}>Votes</Text>
                <Text style={styles.voteCount}>
                  {proposal.yesVotes + proposal.noVotes} / {proposal.quorumRequired} required
                </Text>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        ((proposal.yesVotes + proposal.noVotes) / proposal.quorumRequired) * 100,
                        100,
                      )}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.voteBreakdown}>
                <View style={styles.voteBreakdownItem}>
                  <Text style={[styles.voteBreakdownLabel, {color: colors.primary}]}>
                    Yes: {proposal.yesVotes}
                  </Text>
                </View>
                <View style={styles.voteBreakdownItem}>
                  <Text style={[styles.voteBreakdownLabel, {color: colors.error}]}>
                    No: {proposal.noVotes}
                  </Text>
                </View>
              </View>

              {proposal.status === 'Active' && (
                <View style={styles.voteButtons}>
                  <Button
                    title="Vote Yes"
                    onPress={() => handleVote(proposal.proposalId, 'yes')}
                    style={styles.voteButton}
                    loading={loading}
                  />
                  <Button
                    title="Vote No"
                    onPress={() => handleVote(proposal.proposalId, 'no')}
                    variant="danger"
                    style={styles.voteButton}
                    loading={loading}
                  />
                </View>
              )}

              {proposal.status === 'Passed' && (
                <View style={styles.resultBadge}>
                  <Icon name="check-circle" size={16} color={colors.primary} />
                  <Text style={styles.resultText}>Approved ({Math.round((proposal.yesVotes / (proposal.yesVotes + proposal.noVotes)) * 100)}% Yes)</Text>
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      <Modal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Create Proposal">
        <Input
          label="Proposal Title"
          placeholder="Enter title"
          value={proposalTitle}
          onChangeText={setProposalTitle}
        />
        <Input
          label="Description"
          placeholder="Describe your proposal"
          value={proposalDesc}
          onChangeText={setProposalDesc}
          multiline
          numberOfLines={4}
        />
        <Input
          label="Voting Period (days)"
          placeholder="7"
          keyboardType="numeric"
          value={votingDays}
          onChangeText={setVotingDays}
        />
        <Button
          title="Create Proposal"
          onPress={handleCreateProposal}
          loading={loading}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, padding: spacing.xl},
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl},
  emptyTitle: {fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.xl},
  emptyDesc: {fontSize: typography.sizes.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md},
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: spacing.xl},
  statCard: {width: '47%', padding: spacing.lg, alignItems: 'center'},
  statValue: {fontSize: 28, fontWeight: typography.weights.bold, color: colors.primary, marginBottom: spacing.xs},
  statLabel: {fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center'},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg},
  sectionTitle: {fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text},
  smallButton: {paddingVertical: spacing.md, paddingHorizontal: spacing.lg},
  proposalCard: {marginBottom: spacing.lg, padding: spacing.lg},
  proposalHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, alignItems: 'center'},
  statusBadge: {paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, backgroundColor: colors.opacity.button},
  statusActive: {backgroundColor: colors.opacity.buttonActive},
  statusText: {fontSize: typography.sizes.xs, color: colors.primary, textTransform: 'uppercase', fontWeight: typography.weights.semibold},
  endDate: {fontSize: typography.sizes.sm, color: colors.textSecondary},
  proposalTitle: {fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.sm},
  proposalDesc: {fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg},
  voteRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md},
  voteLabel: {fontSize: typography.sizes.sm, color: colors.textSecondary},
  voteCount: {fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text},
  progressBar: {height: 6, backgroundColor: colors.opacity.button, borderRadius: borderRadius.sm, overflow: 'hidden', marginBottom: spacing.md},
  progressFill: {height: '100%', backgroundColor: colors.primary},
  voteBreakdown: {flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.lg},
  voteBreakdownItem: {alignItems: 'center'},
  voteBreakdownLabel: {fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold},
  voteButtons: {flexDirection: 'row', gap: spacing.md},
  voteButton: {flex: 1},
  resultBadge: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.opacity.buttonActive, borderRadius: borderRadius.sm},
  resultText: {fontSize: typography.sizes.sm, color: colors.primary, fontWeight: typography.weights.semibold},
  emptyCard: {padding: spacing.xxxl, alignItems: 'center'},
  emptyCardText: {fontSize: typography.sizes.md, color: colors.textSecondary, marginTop: spacing.md},
});