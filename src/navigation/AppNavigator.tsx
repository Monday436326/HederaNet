// src/navigation/AppNavigator.tsx
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {HomeScreen} from '../screens/HomeScreen';
import {WalletScreen} from '../screens/WalletScreen';
import {EnergyScreen} from '../screens/EnergyScreen';
import {GovernanceScreen} from '../screens/GovernanceScreen';
import {ServicesScreen} from '../screens/ServicesScreen';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';

const Tab = createBottomTabNavigator();

const getTabBarIcon = ({focused, color, size, routeName}: {focused: boolean; color: string; size: number; routeName: string}) => {
  let iconName = '';
  
  switch (routeName) {
    case 'Home':
      iconName = 'home';
      break;
    case 'Services':
      iconName = 'th-large';
      break;
    case 'Energy':
      iconName = 'bolt';
      break;
    case 'Wallet':
      iconName = 'wallet';
      break;
    case 'Governance':
      iconName = 'vote-yea';
      break;
  }

  return <Icon name={iconName} size={size} color={color} solid={focused} />;
};

export const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => getTabBarIcon({focused, color, size, routeName: route.name}),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: typography.sizes.xs,
          fontWeight: typography.weights.medium,
        },
        headerStyle: {
          backgroundColor: colors.surfaceLight,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: typography.weights.bold,
          fontSize: typography.sizes.xl,
        },
        headerTitle: 'HederaNet',
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Energy" component={EnergyScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Governance" component={GovernanceScreen} />
    </Tab.Navigator>
  );
};
