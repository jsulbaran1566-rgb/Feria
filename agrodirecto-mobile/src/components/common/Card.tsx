import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import colors from '../../theme/colors';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'accent';
}

export default function Card({ children, style, variant = 'default' }: CardProps) {
  const variantStyle = variant === 'accent' ? styles.cardAccent : styles.cardDefault;
  return <View style={[styles.card, variantStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDefault: {
    borderColor: colors.border,
  },
  cardAccent: {
    borderColor: colors.primaryLight,
    backgroundColor: '#fafdfa',
  },
});
