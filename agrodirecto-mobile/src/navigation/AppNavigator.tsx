import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import colors from '../theme/colors';
import { useAuth } from '../context/AuthContext';

// Navigators
import PublicNavigator from './PublicNavigator';
import BuyerNavigator from './BuyerNavigator';
import ProducerNavigator from './ProducerNavigator';
import AdminNavigator from './AdminNavigator';

export default function AppNavigator() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>🌱</Text>
        <Text style={styles.loadingBrand}>AGRODIRECTO</Text>
        <Text style={styles.loadingSub}>Del campo a tu mesa sin intermediarios</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <PublicNavigator />;
  }

  // Enrutamiento según el rol del usuario
  switch (user.rol) {
    case 'Administrador':
      return <AdminNavigator />;
    case 'Productor':
      return <ProducerNavigator />;
    case 'Comprador':
    default:
      return <BuyerNavigator />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  loadingLogo: {
    fontSize: 54,
    marginBottom: 8,
  },
  loadingBrand: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 3,
  },
  loadingSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
