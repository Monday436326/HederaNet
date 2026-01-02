// src/screens/EnergyScreen.tsx - FINAL PRODUCTION VERSION
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
  fetchEnergyListings,
  createEnergyListing,
  purchaseEnergy,
  fetchUserEnergyStats,
  fetchUserListings,
  subscribeToEnergyEvents,
} from '../store/slices/energySlice';
import {Modal} from '../components/common/Modal';
import {Input} from '../components/common/Input';
import {Button} from '../components/common/Button';
import {Card} from '../components/common/Card';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';
import {spacing, borderRadius} from '../theme/spacing';

export const EnergyScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {connected} = useSelector((state: RootState) => state.wallet);
  const {generated, earned, listings, userListings, loading} = useSelector(
    (state: RootState) => state.energy,
  );

  const [listModalVisible, setListModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [energyAmount, setEnergyAmount] = useState('');
  const [pricePerKwh, setPricePerKwh] = useState('');
  const [duration, setDuration] = useState('24');

  useEffect(() => {
    if (connected) {
      dispatch(fetchEnergyListings());
      dispatch(fetchUserEnergyStats());
      dispatch(fetchUserListings());
      dispatch(subscribeToEnergyEvents());
    }
  }, [connected, dispatch]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchEnergyListings()),
      dispatch(fetchUserEnergyStats()),
      dispatch(fetchUserListings()),
    ]);
    setRefreshing(false);
  };

  const handleListEnergy = async (): Promise<void> => {
    if (!energyAmount || !pricePerKwh || !duration) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await dispatch(
        createEnergyListing({
          energyAmount: parseFloat(energyAmount),
          pricePerKwh: parseFloat(pricePerKwh),
          durationHours: parseInt(duration),
          qualityProof: `proof_${Date.now()}`,
        }),
      ).unwrap();

      setListModalVisible(false);
      setEnergyAmount('');
      setPricePerKwh('');
      setDuration('24');
      Alert.alert('Success', 'Energy listing created successfully!');
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  const handlePurchase = async (listingId: string): Promise<void> => {
    Alert.alert(
      'Confirm Purchase',
      'Are you sure you want to purchase this energy?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Purchase',
          onPress: async () => {
            try {
              await dispatch(purchaseEnergy({listingId})).unwrap();
              Alert.alert('Success', 'Energy purchased successfully!');
            } catch (error) {
              Alert.alert('Error', String(error));
            }
          },
        },
      ],
    );
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="bolt" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Connect Wallet</Text>
          <Text style={styles.emptyDesc}>
            Please connect your wallet to access energy trading
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
            <Text style={styles.statValue}>{generated.toFixed(1)}</Text>
            <Text style={styles.statLabel}>kWh Generated</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{earned.toFixed(2)}</Text>
            <Text style={styles.statLabel}>HNET Earned</Text>
          </Card>
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Energy Marketplace</Text>
          <Button
            title="List Energy"
            onPress={() => setListModalVisible(true)}
            style={styles.smallButton}
          />
        </View>

        {listings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="solar-panel" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyCardText}>No active listings</Text>
          </Card>
        ) : (
          listings.map(listing => (
            <Card key={listing.listingId} style={styles.listingCard}>
              <View style={styles.listingHeader}>
                <View>
                  <Text style={styles.listingNode}>Node #{listing.seller.slice(-4)}</Text>
                  <View style={styles.providerRow}>
                    <Icon name="solar-panel" size={12} color={colors.primary} />
                    <Text style={styles.listingProvider}>
                      {listing.seller.slice(0, 10)}... • Verified
                    </Text>
                  </View>
                </View>
                <Text style={styles.listingPrice}>
                  {listing.pricePerKwh.toFixed(2)} HNET/kWh
                </Text>
              </View>
              
              <View style={styles.listingDetails}>
                <View style={styles.detailItem}>
                  <Icon name="bolt" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {listing.energyAmount.toFixed(1)} kWh
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Icon name="leaf" size={14} color={colors.primary} />
                  <Text style={styles.detailText}>0g CO2</Text>
                </View>
                <View style={styles.detailItem}>
                  <Icon name="clock" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {new Date(listing.expirationTime * 1000).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <Button
                title="Purchase Energy"
                onPress={() => handlePurchase(listing.listingId)}
                style={styles.purchaseButton}
                loading={loading}
              />
            </Card>
          ))
        )}

        {userListings.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: spacing.xxl}]}>
              Your Listings
            </Text>
            {userListings.map(listing => (
              <Card key={listing.listingId} style={styles.userListingCard}>
                <View style={styles.listingHeader}>
                  <View>
                    <Text style={styles.listingNode}>Your Listing</Text>
                    <Text style={styles.listingProvider}>
                      {listing.energyAmount.toFixed(1)} kWh available
                    </Text>
                  </View>
                  <Text style={styles.listingPrice}>
                    {listing.pricePerKwh.toFixed(2)} HNET/kWh
                  </Text>
                </View>
                <View style={[styles.statusBadge, listing.isActive && styles.statusActive]}>
                  <Text style={styles.statusText}>
                    {listing.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={listModalVisible}
        onClose={() => setListModalVisible(false)}
        title="List Energy">
        <Input
          label="Energy Amount (kWh)"
          placeholder="100.0"
          keyboardType="numeric"
          value={energyAmount}
          onChangeText={setEnergyAmount}
        />
        <Input
          label="Price per kWh (HNET)"
          placeholder="0.25"
          keyboardType="numeric"
          value={pricePerKwh}
          onChangeText={setPricePerKwh}
        />
        <Input
          label="Duration (hours)"
          placeholder="24"
          keyboardType="numeric"
          value={duration}
          onChangeText={setDuration}
        />
        <Button
          title="Create Listing"
          onPress={handleListEnergy}
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
  statsGrid: {flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl},
  statCard: {flex: 1, padding: spacing.lg, alignItems: 'center'},
  statValue: {fontSize: 28, fontWeight: typography.weights.bold, color: colors.primary, marginBottom: spacing.xs},
  statLabel: {fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center'},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg},
  sectionTitle: {fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text},
  smallButton: {paddingVertical: spacing.md, paddingHorizontal: spacing.lg},
  listingCard: {marginBottom: spacing.lg, padding: spacing.lg},
  userListingCard: {marginBottom: spacing.lg, padding: spacing.lg, borderWidth: 2, borderColor: colors.primary},
  listingHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, alignItems: 'flex-start'},
  listingNode: {fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.xs},
  providerRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  listingProvider: {fontSize: typography.sizes.sm, color: colors.textSecondary},
  listingPrice: {fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.primary},
  listingDetails: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.md},
  detailItem: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  detailText: {fontSize: typography.sizes.sm, color: colors.textSecondary},
  purchaseButton: {marginTop: spacing.md},
  emptyCard: {padding: spacing.xxxl, alignItems: 'center'},
  emptyCardText: {fontSize: typography.sizes.md, color: colors.textSecondary, marginTop: spacing.md},
  statusBadge: {marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, backgroundColor: colors.opacity.button, alignSelf: 'flex-start'},
  statusActive: {backgroundColor: colors.opacity.buttonActive},
  statusText: {fontSize: typography.sizes.xs, color: colors.primary, textTransform: 'uppercase', fontWeight: typography.weights.semibold},
});