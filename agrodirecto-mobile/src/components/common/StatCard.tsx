import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../theme/colors';

export interface StatCardProps {
  icon?: string;
  number?: string | number;
  value?: string | number;
  label?: string;
  title?: string;
  variant?: 'green' | 'blue' | 'amber' | 'brown' | 'default' | 'warning' | 'info' | 'success';
}

export default function StatCard({
  icon = '📊',
  number,
  value,
  label,
  title,
  variant = 'green',
}: StatCardProps) {
  const displayVal = value !== undefined ? value : number !== undefined ? number : '0';
  const displayLabel = title || label || '';

  const getColors = () => {
    switch (variant) {
      case 'blue':
      case 'info':
        return { bg: colors.blueSoft, text: colors.blue };
      case 'amber':
      case 'warning':
        return { bg: colors.secondarySoft, text: colors.secondary };
      case 'brown':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'default':
      case 'success':
      case 'green':
      default:
        return { bg: colors.primarySoft, text: colors.primary };
    }
  };

  const c = getColors();

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: c.bg }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.number, { color: c.text }]}>{displayVal}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    margin: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
  },
  number: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
