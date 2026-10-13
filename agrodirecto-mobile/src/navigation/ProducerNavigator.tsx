import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import colors from '../theme/colors';

// Screens
import ProducerDashboardScreen from '../screens/producer/ProducerDashboardScreen';
import MyCropsScreen from '../screens/producer/MyCropsScreen';
import SalesAndPaymentsScreen from '../screens/producer/SalesAndPaymentsScreen';
import TraceabilityScreen from '../screens/producer/TraceabilityScreen';
import ProducerReportsScreen from '../screens/producer/ProducerReportsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import DisputesScreen from '../screens/shared/DisputesScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProducerTabs() {
  return (
    <Tab.Navigator
      id="ProducerTabs"
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
        component={ProducerDashboardScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🌿</Text>,
        }}
      />
      <Tab.Screen
        name="CultivosTab"
        component={MyCropsScreen}
        options={{
          tabBarLabel: 'Cultivos',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🌱</Text>,
        }}
      />
      <Tab.Screen
        name="VentasTab"
        component={SalesAndPaymentsScreen}
        options={{
          tabBarLabel: 'Ventas',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>💰</Text>,
        }}
      />
      <Tab.Screen
        name="TrazabilidadTab"
        component={TraceabilityScreen}
        options={{
          tabBarLabel: 'Trazabilidad',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📍</Text>,
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Mi Perfil',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function ProducerNavigator() {
  return (
    <Stack.Navigator id="ProducerStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProducerMain" component={ProducerTabs} />
      <Stack.Screen name="Reportes" component={ProducerReportsScreen} />
      <Stack.Screen name="Disputas" component={DisputesScreen} />
      <Stack.Screen name="Notificaciones" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
