// src/screens/HomeScreen.tsx - FINAL PRODUCTION VERSION
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Clipboard,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {RootState, AppDispatch} from '../store';
import {
  connectWallet,
  disconnectWallet,
  fetchBalances,
  fetchTransactions,
  restoreWalletSession,
  sendTokens,
  sendHbar,
} from '../store/slices/walletSlice';
import {WalletType} from '../services/hedera/WalletService';
import {Card} from '../components/common/Card';
import {Modal} from '../components/common/Modal';
import {Input} from '../components/common/Input';
import {Button} from '../components/common/Button';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';
import {spacing, borderRadius} from '../theme/spacing';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    connected,
    accountId,
    balance,
    usdBalance,
    transactions,
    tokens,
    loading,
  } = useSelector((state: RootState) => state.wallet);

  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [receiveModalVisible, setReceiveModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [selectedToken] = useState('HBAR');

  useEffect(() => {
    dispatch(restoreWalletSession());
  }, [dispatch]);

  useEffect(() => {
    if (connected && accountId) {
      dispatch(fetchBalances());
      dispatch(fetchTransactions(50));
      
      const interval = setInterval(() => {
        dispatch(fetchBalances());
        dispatch(fetchTransactions(50));
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [connected, accountId, dispatch]);

  const handleConnectWallet = async (walletType: WalletType): Promise<void> => {
    try {
      await dispatch(connectWallet(walletType)).unwrap();
      setWalletModalVisible(false);
      Alert.alert('Success', 'Wallet connected successfully!');
    } catch (error) {
      Alert.alert('Connection Failed', String(error));
    }
  };

  const handleDisconnect = (): void => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            dispatch(disconnectWallet());
          },
        },
      ],
    );
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
      setSendNote('');
      Alert.alert('Success', 'Transaction sent successfully!');
    } catch (error) {
      Alert.alert('Transaction Failed', String(error));
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchBalances()),
      dispatch(fetchTransactions(50)),
    ]);
    setRefreshing(false);
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
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectContainer}>
          <Icon name="wallet" size={80} color={colors.primary} />
          <Text style={styles.connectTitle}>Connect Your Wallet</Text>
          <Text style={styles.connectDesc}>
            Connect your Hedera wallet to access HederaNet services
          </Text>
          <Button
            title="Connect Wallet"
            onPress={() => setWalletModalVisible(true)}
            style={styles.connectButton}
          />
        </View>

        <Modal
          visible={walletModalVisible}
          onClose={() => setWalletModalVisible(false)}
          title="Select Wallet">
          <TouchableOpacity
            style={styles.walletOption}
            onPress={() => handleConnectWallet(WalletType.HASHPACK)}>
            <Icon name="shield-alt" size={32} color={colors.primary} />
            <View style={styles.walletOptionText}>
              <Text style={styles.walletOptionTitle}>HashPack</Text>
              <Text style={styles.walletOptionDesc}>
                Official Hedera wallet with full features
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.walletOption}
            onPress={() => handleConnectWallet(WalletType.BLADE)}>
            <Icon name="fire" size={32} color={colors.primary} />
            <View style={styles.walletOptionText}>
              <Text style={styles.walletOptionTitle}>Blade Wallet</Text>
              <Text style={styles.walletOptionDesc}>
                Fast and secure Hedera wallet
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.walletOption}
            onPress={() => handleConnectWallet(WalletType.METAMASK)}>
            <Icon name="ethereum" size={32} color={colors.primary} />
            <View style={styles.walletOptionText}>
              <Text style={styles.walletOptionTitle}>MetaMask</Text>
              <Text style={styles.walletOptionDesc}>
                Connect via Hedera EVM compatibility
              </Text>
            </View>
          </TouchableOpacity>
        </Modal>
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
        
        <View style={styles.accountHeader}>
          <View style={{flex: 1}}>
            <Text style={styles.accountLabel}>Connected Account</Text>
            <Text style={styles.accountId} numberOfLines={1}>{accountId || 'N/A'}</Text>
          </View>
          <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
            <Icon name="power-off" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={colors.gradient.surface} style={styles.walletCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>{balance.toFixed(2)} HBAR</Text>
              <Text style={styles.balanceUsd}>${usdBalance.toFixed(2)} USD</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => dispatch(fetchBalances())}>
              <Icon name="sync" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setSendModalVisible(true)}>
              <Icon name="arrow-up" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setReceiveModalVisible(true)}>
              <Icon name="arrow-down" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Icon name="exchange-alt" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Swap</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Services')}>
              <Icon name="shopping-cart" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Buy</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {tokens.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assets</Text>
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
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {transactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </Card>
          ) : (
            transactions.slice(0, 5).map(tx => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    <Icon
                      name={tx.type === 'send' ? 'arrow-up' : 'arrow-down'}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>{tx.title}</Text>
                    <Text style={styles.transactionDesc} numberOfLines={1}>{tx.description}</Text>
                  </View>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      tx.type === 'receive' || tx.amount > 0 ? styles.positive : styles.negative,
                    ]}>
                    {tx.type === 'receive' || tx.amount > 0 ? '+' : ''}
                    {tx.amount.toFixed(2)} {tx.token}
                  </Text>
                  <Text style={styles.transactionTime}>{formatTimeAgo(tx.timestamp)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
          </View>
          <View style={styles.servicesGrid}>
            <TouchableOpacity style={styles.serviceCard} onPress={() => navigation.navigate('Energy')}>
              <Icon name="bolt" size={32} color={colors.primary} />
              <Text style={styles.serviceName}>Energy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceCard} onPress={() => navigation.navigate('Governance')}>
              <Icon name="vote-yea" size={32} color={colors.primary} />
              <Text style={styles.serviceName}>Governance</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={sendModalVisible} onClose={() => setSendModalVisible(false)} title="Send">
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
        <Input
          label="Note (Optional)"
          placeholder="Payment for..."
          value={sendNote}
          onChangeText={setSendNote}
        />
        <Button title="Send Transaction" onPress={handleSend} loading={loading} />
      </Modal>

      <Modal visible={receiveModalVisible} onClose={() => setReceiveModalVisible(false)} title="Receive">
        <View style={styles.qrContainer}>
          <Icon name="qrcode" size={150} color={colors.background} />
        </View>
        <Text style={styles.address} selectable>{accountId || 'N/A'}</Text>
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
  connectContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl},
  connectTitle: {fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.xl},
  connectDesc: {fontSize: typography.sizes.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.xxxl},
  connectButton: {width: '100%'},
  walletOption: {flexDirection: 'row', padding: spacing.xl, backgroundColor: colors.opacity.card, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, marginBottom: spacing.md, alignItems: 'center'},
  walletOptionText: {marginLeft: spacing.lg, flex: 1},
  walletOptionTitle: {fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text},
  walletOptionDesc: {fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: spacing.xs},
  accountHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.surface},
  accountLabel: {fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing.xs},
  accountId: {fontSize: typography.sizes.sm, color: colors.primary, fontFamily: 'monospace'},
  disconnectBtn: {padding: spacing.md, backgroundColor: colors.opacity.button, borderRadius: borderRadius.full},
  walletCard: {borderRadius: borderRadius.xl, padding: spacing.xxl, margin: spacing.xl, borderWidth: 1, borderColor: colors.border},
  balanceRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl},
  balanceLabel: {fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs},
  balanceAmount: {fontSize: typography.sizes.xxxl, fontWeight: typography.weights.bold, color: colors.primary},
  balanceUsd: {fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: spacing.xs},
  iconBtn: {width: 35, height: 35, backgroundColor: colors.opacity.button, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center'},
  actionsRow: {flexDirection: 'row', justifyContent: 'space-between'},
  actionBtn: {flex: 1, backgroundColor: colors.opacity.button, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', marginHorizontal: spacing.xs},
  actionText: {fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: spacing.sm},
  section: {marginHorizontal: spacing.xl, marginBottom: spacing.xxl},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg},
  sectionTitle: {fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text},
  viewAll: {fontSize: typography.sizes.sm, color: colors.primary},
  tokenItem: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.opacity.input, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md},
  tokenLeft: {flexDirection: 'row', gap: spacing.lg, alignItems: 'center', flex: 1},
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
  transactionDesc: {fontSize: typography.sizes.sm, color: colors.textSecondary},
  transactionAmount: {fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, textAlign: 'right'},
  positive: {color: colors.primary},
  negative: {color: colors.error},
  transactionTime: {fontSize: typography.sizes.xs, color: colors.textSecondary, textAlign: 'right', marginTop: spacing.xs},
  emptyCard: {padding: spacing.xl, alignItems: 'center'},
  emptyText: {fontSize: typography.sizes.md, color: colors.textSecondary},
  qrContainer: {width: 200, height: 200, backgroundColor: colors.text, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: spacing.xl},
  address: {backgroundColor: colors.opacity.input, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.lg, fontFamily: 'monospace', fontSize: typography.sizes.sm, color: colors.text, marginBottom: spacing.xl},
  servicesGrid: {flexDirection: 'row', gap: spacing.lg},
  serviceCard: {flex: 1, backgroundColor: colors.opacity.card, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.xl, alignItems: 'center'},
  serviceName: {fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text, marginTop: spacing.md},
});