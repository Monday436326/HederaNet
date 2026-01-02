/* eslint-disable react-hooks/exhaustive-deps */
// src/screens/ServicesScreen.tsx - FIXED VERSION
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ViewStyle,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {RootState, AppDispatch} from '../store';
import {fetchBalances} from '../store/slices/walletSlice';
import {smartContractService} from '../services/hedera/SmartContractService';
import {Card} from '../components/common/Card';
import {Button} from '../components/common/Button';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';
import {spacing, borderRadius} from '../theme/spacing';

interface ServicePlan {
  id: string;
  name: string;
  data: string;
  speed: string;
  price: number;
  current?: boolean;
}

export const ServicesScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {connected} = useSelector((state: RootState) => state.wallet);
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<ServicePlan | null>(null);
  const [usageData] = useState({speed: 127, used: 245, total: 500});

  const plans: ServicePlan[] = [
    {
      id: 'basic',
      name: 'Basic Plan',
      data: '50 GB',
      speed: '10 Mbps',
      price: 5,
    },
    {
      id: 'standard',
      name: 'Standard Plan',
      data: '200 GB',
      speed: '50 Mbps',
      price: 10,
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      data: '500 GB',
      speed: '100 Mbps',
      price: 15,
      current: true,
    },
  ];

  useEffect(() => {
    const premium = plans.find(p => p.current);
    if (premium) {
      setCurrentPlan(premium);
    }
  }, []);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await dispatch(fetchBalances());
    setRefreshing(false);
  };

  const handlePurchasePlan = async (plan: ServicePlan): Promise<void> => {
    if (!connected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Subscribe to ${plan.name} for ${plan.price} HNET/month?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Subscribe',
          onPress: async () => {
            setLoading(true);
            try {
              const providerId = '0.0.123456';
              
              await smartContractService.processServicePayment(
                providerId,
                plan.price,
                'internet',
              );

              setCurrentPlan(plan);
              Alert.alert('Success', `Successfully subscribed to ${plan.name}!`);
              dispatch(fetchBalances());
            } catch (error) {
              Alert.alert('Error', String(error));
            } finally {
              setLoading(false);
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
          <Icon name="wifi" size={80} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Connect Wallet</Text>
          <Text style={styles.emptyDesc}>
            Please connect your wallet to access internet services
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
            <Text style={styles.statValue}>{usageData.speed}</Text>
            <Text style={styles.statLabel}>Mbps Speed</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{usageData.used}</Text>
            <Text style={styles.statLabel}>GB Used</Text>
          </Card>
        </View>

        {currentPlan && (
          <Card style={styles.currentPlanCard}>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planLabel}>Current Plan</Text>
                <Text style={styles.planName}>{currentPlan.name}</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPeriod}>Monthly</Text>
                <Text style={styles.planPrice}>{currentPlan.price} HNET</Text>
              </View>
            </View>
            
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {width: `${(usageData.used / usageData.total) * 100}%`},
                ]}
              />
            </View>
            
            <Text style={styles.usageText}>
              {usageData.used} GB / {usageData.total} GB used
            </Text>

            <View style={styles.planFeatures}>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={16} color={colors.primary} />
                <Text style={styles.featureText}>{currentPlan.speed} speed</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={16} color={colors.primary} />
                <Text style={styles.featureText}>{currentPlan.data} data</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={16} color={colors.primary} />
                <Text style={styles.featureText}>99.9% uptime</Text>
              </View>
            </View>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Available Plans</Text>

        {plans.map(plan => {
          // Fix: Create proper style object instead of array
          const cardStyle: ViewStyle = {
            ...styles.planCard,
            ...(plan.current ? styles.currentPlanBorder : {}),
          };

          return (
            <Card key={plan.id} style={cardStyle}>
              <View style={styles.planRow}>
                <View style={{flex: 1}}>
                  <View style={styles.planTitleRow}>
                    <Text style={styles.planTitle}>{plan.name}</Text>
                    {plan.current && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>CURRENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planSpecs}>
                    {plan.data} • {plan.speed}
                  </Text>
                </View>
                <View style={styles.planPricing}>
                  <Text style={styles.planPrice}>{plan.price} HNET</Text>
                  <Text style={styles.planPeriod}>per month</Text>
                </View>
              </View>

              {!plan.current && (
                <Button
                  title="Upgrade Plan"
                  onPress={() => handlePurchasePlan(plan)}
                  style={{marginTop: spacing.lg}}
                  loading={loading}
                />
              )}
            </Card>
          );
        })}

        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Icon name="info-circle" size={24} color={colors.primary} />
            <Text style={styles.infoTitle}>Service Information</Text>
          </View>
          <Text style={styles.infoText}>
            All internet services are provided through our decentralized network of verified nodes. 
            Payments are automatically distributed to service providers, protocol developers, 
            and the community treasury.
          </Text>
          <View style={styles.infoStats}>
            <View style={styles.infoStatItem}>
              <Text style={styles.infoStatValue}>70%</Text>
              <Text style={styles.infoStatLabel}>To Provider</Text>
            </View>
            <View style={styles.infoStatItem}>
              <Text style={styles.infoStatValue}>15%</Text>
              <Text style={styles.infoStatLabel}>To Developers</Text>
            </View>
            <View style={styles.infoStatItem}>
              <Text style={styles.infoStatValue}>10%</Text>
              <Text style={styles.infoStatLabel}>Platform Fee</Text>
            </View>
            <View style={styles.infoStatItem}>
              <Text style={styles.infoStatValue}>5%</Text>
              <Text style={styles.infoStatLabel}>Community</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
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
  currentPlanCard: {marginBottom: spacing.xxl, padding: spacing.xl},
  planHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg, alignItems: 'flex-start'},
  planLabel: {fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs},
  planName: {fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, color: colors.primary},
  planPricing: {alignItems: 'flex-end'},
  planPeriod: {fontSize: typography.sizes.sm, color: colors.textSecondary},
  planPrice: {fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, color: colors.primary},
  progressBar: {height: 6, backgroundColor: colors.opacity.button, borderRadius: borderRadius.sm, overflow: 'hidden', marginBottom: spacing.md},
  progressFill: {height: '100%', backgroundColor: colors.primary},
  usageText: {fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.lg},
  planFeatures: {flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: spacing.md},
  featureItem: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  featureText: {fontSize: typography.sizes.sm, color: colors.text},
  sectionTitle: {fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.lg},
  planCard: {marginBottom: spacing.lg, padding: spacing.lg},
  currentPlanBorder: {borderWidth: 2, borderColor: colors.primary},
  planRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  planTitleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs},
  planTitle: {fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text},
  currentBadge: {backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm},
  currentBadgeText: {fontSize: 10, fontWeight: typography.weights.bold, color: colors.background},
  planSpecs: {fontSize: typography.sizes.sm, color: colors.textSecondary},
  infoCard: {marginTop: spacing.lg, padding: spacing.xl},
  infoHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg},
  infoTitle: {fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text},
  infoText: {fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg},
  infoStats: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg},
  infoStatItem: {alignItems: 'center', minWidth: '20%'},
  infoStatValue: {fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.primary},
  infoStatLabel: {fontSize: typography.sizes.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs},
});