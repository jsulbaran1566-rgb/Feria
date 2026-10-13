import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import colors from '../../theme/colors';

export interface BadgeProps {
  children?: ReactNode;
  text?: string;
  status?: string;
  variant?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Badge({ children, text, status, variant, style, textStyle }: BadgeProps) {
  const contenido = text || (typeof children === 'string' ? children : status || '');

  const getBadgeColors = () => {
    const s = String(variant || status || contenido || '').toLowerCase();
    
    if (s === 'success' || s.includes('activ') || s.includes('pagad') || s.includes('entregad') || s.includes('resuelt') || s.includes('completad') || s.includes('cosech')) {
      return { bg: colors.successSoft, text: colors.success };
    }
    if (s === 'info' || s.includes('camino') || s.includes('tránsito') || s.includes('transito') || s.includes('proceso') || s.includes('crecimiento')) {
      return { bg: colors.blueSoft, text: colors.blue };
    }
    if (s === 'warning' || s.includes('pendient') || s.includes('revis') || s.includes('siembra')) {
      return { bg: colors.warningSoft, text: colors.warning };
    }
    if (s === 'danger' || s === 'error' || s.includes('cancel') || s.includes('fall') || s.includes('rechaz') || s.includes('disput') || s.includes('inactiv')) {
      return { bg: colors.errorSoft, text: colors.error };
    }
    if (s.includes('admin')) {
      return { bg: '#fef2f2', text: '#991b1b' };
    }
    if (s.includes('productor')) {
      return { bg: colors.primarySoft, text: colors.primaryDark };
    }
    if (s.includes('comprador')) {
      return { bg: colors.blueSoft, text: colors.blue };
    }
    return { bg: '#f1f5f9', text: '#475569' };
  };

  const { bg, text: textColor } = getBadgeColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {children && typeof children !== 'string' ? (
        children
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {contenido}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
