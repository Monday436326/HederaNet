// src/screens/WalletScreen.tsx - FINAL PRODUCTION VERSION
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Clipboard,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {RootState, AppDispatch} from '../store';
import {
  fetchBalances,
  fetchTransactions,
  sendTokens,
  sendHbar,
} from '../store/slices/walletSlice';
import {Modal} from '../components/common/Modal';
import {Input} from '../components/common/Input';
import {Button} from '../components/common/Button';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';
import {spacing, borderRadius} from '../theme/spacing';

export const WalletScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    connected,
    accountId,
    balance,
    usdBalance,
    tokens,
    transactions,
    loading,
  } = useSelector((state: RootState) => state.wallet);

  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [receiveModalVisible, setReceiveModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [selectedToken] = useState('HBAR');

  useEffect(() => {
    if (connected) {
      dispatch(fetchBalances());
      dispatch(fetchTransactions(100));
    }
  }, [connected, dispatch]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchBalances()),
      dispatch(fetchTransactions(100)),
    ]);
    setRefreshing(false);
  };

  const handleSend = async (): Promise<void> => {
    if (!sendAddress || !sendAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (selectedToken === 'HBAR') {
        await dispatch(
          sendHbar({
            recipientId: sendAddress,
            amount: parseFloat(sendAmount),
          }),
        ).unwrap();
      } else {
        const token = tokens.find(t => t.symbol === selectedToken);
        if (!token) return;

        await dispatch(
          sendTokens({
            recipientId: sendAddress,
            amount: parseFloat(sendAmount),
            tokenId: token.tokenId,
            decimals: token.decimals,
          }),
        ).unwrap();
      }

      setSendModalVisible(false);
      setSendAddress('');
      setSendAmount('');
      Alert.alert('Success', 'Transaction sent successfully!');
    } catch (error) {
      Alert.alert('Transaction Failed', String(error));
    }
  };

  const handleCopyAddress = (): void => {
    if (accountId) {
      Clipboard.setString(accountId);
      Alert.alert('Copied', 'Account ID copied to clipboard');
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = Date.now();
    const past = new Date(timestamp).getTime();
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="wallet" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Wallet Connected</Text>
          <Text style={styles.emptyDesc}>
            Please connect your wallet from the Home screen
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
        
        <LinearGradient colors={colors.gradient.surface} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{balance.toFixed(2)} HBAR</Text>
          <Text style={styles.balanceUsd}>${usdBalance.toFixed(2)} USD</Text>
          
          <View style={styles.buttonRow}>
            <Button
              title="Send"
              onPress={() => setSendModalVisible(true)}
              style={styles.button}
              icon={<Icon name="arrow-up" size={16} color={colors.background} />}
            />
            <Button
              title="Receive"
              onPress={() => setReceiveModalVisible(true)}
              style={styles.button}
              icon={<Icon name="arrow-down" size={16} color={colors.background} />}
            />
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token Balances</Text>
          
          <View style={styles.tokenItem}>
            <View style={styles.tokenLeft}>
              <View style={styles.tokenIcon}>
                <Icon name="h-square" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.tokenSymbol}>HBAR</Text>
                <Text style={styles.tokenName}>Hedera</Text>
              </View>
            </View>
            <View style={styles.tokenRight}>
              <Text style={styles.tokenBalance}>{balance.toFixed(2)}</Text>
              <Text style={styles.tokenValue}>${(balance * 0.05).toFixed(2)}</Text>
            </View>
          </View>

          {tokens.map((token, index) => (
            <View key={index} style={styles.tokenItem}>
              <View style={styles.tokenLeft}>
                <View style={styles.tokenIcon}>
                  <Icon name="coins" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                  <Text style={styles.tokenName}>{token.name}</Text>
                </View>
              </View>
              <View style={styles.tokenRight}>
                <Text style={styles.tokenBalance}>{token.balance.toFixed(2)}</Text>
                <Text style={styles.tokenValue}>${token.usdValue.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Transactions</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="receipt" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyCardText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map(tx => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    <Icon
                      name={
                        tx.type === 'send'
                          ? 'arrow-up'
                          : tx.type === 'receive'
                          ? 'arrow-down'
                          : tx.type === 'energy'
                          ? 'bolt'
                          : tx.type === 'compute'
                          ? 'microchip'
                          : 'exchange-alt'
                      }
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                      {tx.title}
                    </Text>
                    <Text style={styles.transactionDesc} numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text style={styles.transactionHash} numberOfLines={1}>
                      {tx.transactionHash || tx.id}
                    </Text>
                  </View>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      tx.type === 'receive' || tx.amount > 0
                        ? styles.positive
                        : styles.negative,
                    ]}>
                    {tx.type === 'receive' || tx.amount > 0 ? '+' : ''}
                    {tx.amount.toFixed(2)} {tx.token}
                  </Text>
                  <Text style={styles.transactionTime}>
                    {formatTimeAgo(tx.timestamp)}
                  </Text>
                  <View style={[styles.statusBadge, tx.status === 'completed' && styles.statusCompleted]}>
                    <Text style={styles.statusText}>{tx.status}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={sendModalVisible}
        onClose={() => setSendModalVisible(false)}
        title="Send Transaction">
        <Input
          label="Recipient Account ID"
          placeholder="0.0.12345"
          value={sendAddress}
          onChangeText={setSendAddress}
        />
        <Input
          label="Amount"
          placeholder="0.00"
          keyboardType="numeric"
          value={sendAmount}
          onChangeText={setSendAmount}
        />
        <Button title="Send" onPress={handleSend} loading={loading} />
      </Modal>

      <Modal
        visible={receiveModalVisible}
        onClose={() => setReceiveModalVisible(false)}
        title="Receive">
        <View style={styles.qrContainer}>
          <Icon name="qrcode" size={150} color={colors.background} />
        </View>
        <Text style={styles.address} selectable>
          {accountId || 'N/A'}
        </Text>
        <Button
          title="Copy Address"
          onPress={handleCopyAddress}
          icon={<Icon name="copy" size={16} color={colors.background} />}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl},
  emptyTitle: {fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.xl},
  emptyDesc: {fontSize: typography.sizes.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md},
  balanceCard: {borderRadius: borderRadius.xl, padding: spacing.xxl, margin: spacing.xl, borderWidth: 1, borderColor: colors.border, alignItems: 'center'},
  balanceLabel: {fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.sm},
  balanceAmount: {fontSize: 40, fontWeight: typography.weights.bold, color: colors.primary},
  balanceUsd: {fontSize: typography.sizes.lg, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl},
  buttonRow: {flexDirection: 'row', gap: spacing.md, width: '100%'},
  button: {flex: 1},
  section: {marginHorizontal: spacing.xl, marginBottom: spacing.xxl},
  sectionTitle: {fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.lg},
  tokenItem: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.opacity.input, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md},
  tokenLeft: {flexDirection: 'row', gap: spacing.lg, alignItems: 'center'},
  tokenIcon: {width: 40, height: 40, backgroundColor: colors.opacity.button, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center'},
  tokenSymbol: {fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text},
  tokenName: {fontSize: typography.sizes.sm, color: colors.textSecondary},
  tokenRight: {alignItems: 'flex-end'},
  tokenBalance: {fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text},
  tokenValue: {fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: spacing.xs},
  transactionItem: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.opacity.input, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md},
  transactionLeft: {flexDirection: 'row', gap: spacing.lg, alignItems: 'center', flex: 1, marginRight: spacing.md},
  transactionIcon: {width: 40, height: 40, backgroundColor: colors.opacity.button, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center'},
  transactionTitle: {fontSize: typography.sizes.md, color: colors.text, marginBottom: spacing.xs},
  transactionDesc: {fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs},
  transactionHash: {fontSize: typography.sizes.xs, color: colors.textTertiary, fontFamily: 'monospace'},
  transactionAmount: {fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, textAlign: 'right'},
  positive: {color: colors.primary},
  negative: {color: colors.error},
  transactionTime: {fontSize: typography.sizes.xs, color: colors.textSecondary, textAlign: 'right', marginTop: spacing.xs},
  statusBadge: {marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, backgroundColor: colors.opacity.button},
  statusCompleted: {backgroundColor: colors.opacity.buttonActive},
  statusText: {fontSize: typography.sizes.xs, color: colors.primary, textTransform: 'uppercase'},
  emptyCard: {backgroundColor: colors.opacity.card, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.xxxl, alignItems: 'center'},
  emptyCardText: {fontSize: typography.sizes.md, color: colors.textSecondary, marginTop: spacing.md},
  qrContainer: {width: 200, height: 200, backgroundColor: colors.text, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: spacing.xl},
  address: {backgroundColor: colors.opacity.input, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.lg, fontFamily: 'monospace', fontSize: typography.sizes.sm, color: colors.text, marginBottom: spacing.xl},
});