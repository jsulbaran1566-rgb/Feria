import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import colors from '../theme/colors';

// Screens
import BuyerDashboardScreen from '../screens/buyer/BuyerDashboardScreen';
import ExploreLotsScreen from '../screens/buyer/ExploreLotsScreen';
import MyReservationsScreen from '../screens/buyer/MyReservationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import DeliveriesScreen from '../screens/buyer/DeliveriesScreen';
import PaymentsScreen from '../screens/buyer/PaymentsScreen';
import FavoriteProducersScreen from '../screens/buyer/FavoriteProducersScreen';
import PublicProfileScreen from '../screens/buyer/PublicProfileScreen';
import DisputesScreen from '../screens/shared/DisputesScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BuyerTabs() {
  return (
    <Tab.Navigator
      id="BuyerTabs"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={BuyerDashboardScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏪</Text>,
        }}
      />
      <Tab.Screen
        name="Explorar"
        component={ExploreLotsScreen}
        options={{
          tabBarLabel: 'Explorar',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="ReservasTab"
        component={MyReservationsScreen}
        options={{
          tabBarLabel: 'Reservas',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Mi Perfil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function BuyerNavigator() {
  return (
    <Stack.Navigator id="BuyerStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BuyerMain" component={BuyerTabs} />
      <Stack.Screen name="Entregas" component={DeliveriesScreen} />
      <Stack.Screen name="Pagos" component={PaymentsScreen} />
      <Stack.Screen name="Favoritos" component={FavoriteProducersScreen} />
      <Stack.Screen name="PerfilPublico" component={PublicProfileScreen} />
      <Stack.Screen name="Disputas" component={DisputesScreen} />
      <Stack.Screen name="Notificaciones" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
