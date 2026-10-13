import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../theme/colors';

interface AlertBannerProps {
  type?: 'ok' | 'error' | 'warning' | 'info' | string;
  message?: string | null;
  onClose?: () => void;
}

export default function AlertBanner({ type = 'info', message, onClose }: AlertBannerProps) {
  if (!message) return null;

  const getConfig = () => {
    switch (type) {
      case 'ok':
      case 'success':
        return {
          bg: colors.successSoft,
          border: colors.success,
          text: '#14532d',
          icon: '✅',
        };
      case 'error':
        return {
          bg: colors.errorSoft,
          border: colors.error,
          text: '#7f1d1d',
          icon: '⚠️',
        };
      case 'warning':
        return {
          bg: colors.warningSoft,
          border: colors.warning,
          text: '#7c2d12',
          icon: '⚠️',
        };
      case 'info':
      default:
        return {
          bg: colors.blueSoft,
          border: colors.blue,
          text: '#1e3a8a',
          icon: 'ℹ️',
        };
    }
  };

  const cfg = getConfig();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
      ]}
    >
      <Text style={styles.icon}>{cfg.icon}</Text>
      <Text style={[styles.message, { color: cfg.text }]}>{message}</Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: cfg.text }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
