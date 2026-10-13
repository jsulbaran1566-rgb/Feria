import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';

export interface HeaderAction {
  label: string;
  onPress: () => void;
}

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode | HeaderAction;
}

export default function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  const renderRight = () => {
    if (!rightAction) return null;
    if (typeof rightAction === 'object' && 'label' in rightAction && 'onPress' in rightAction) {
      const action = rightAction as HeaderAction;
      return (
        <TouchableOpacity
          onPress={action.onPress}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>{action.label}</Text>
        </TouchableOpacity>
      );
    }
    return rightAction as ReactNode;
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <View style={styles.contentRow}>
        <View style={styles.leftArea}>
          {showBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.titleArea}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {rightAction ? <View style={styles.rightArea}>{renderRight()}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.primary,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    paddingRight: 12,
    paddingVertical: 6,
  },
  backIcon: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#e2f7e4',
    marginTop: 2,
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
