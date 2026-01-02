import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../../theme/colors';
import {spacing, borderRadius} from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'gradient';
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={colors.gradient.surface}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.card, styles.gradientCard, style]}>
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, styles.defaultCard, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  defaultCard: {
    backgroundColor: colors.opacity.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gradientCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
});