import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import colors from '../theme/colors';

// Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UsersAdminScreen from '../screens/admin/UsersAdminScreen';
import LotsAdminScreen from '../screens/admin/LotsAdminScreen';
import ReportsAdminScreen from '../screens/admin/ReportsAdminScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import RolesAdminScreen from '../screens/admin/RolesAdminScreen';
import CategoriesAdminScreen from '../screens/admin/CategoriesAdminScreen';
import ProvidersAdminScreen from '../screens/admin/ProvidersAdminScreen';
import HistoryAdminScreen from '../screens/admin/HistoryAdminScreen';
import SupportAdminScreen from '../screens/admin/SupportAdminScreen';
import DisputesScreen from '../screens/shared/DisputesScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AdminTabs() {
  return (
    <Tab.Navigator
      id="AdminTabs"
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
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Resumen',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="UsuariosTab"
        component={UsersAdminScreen}
        options={{
          tabBarLabel: 'Usuarios',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="LotesTab"
        component={LotsAdminScreen}
        options={{
          tabBarLabel: 'Lotes',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🌱</Text>,
        }}
      />
      <Tab.Screen
        name="ReportesTab"
        component={ReportsAdminScreen}
        options={{
          tabBarLabel: 'Finanzas',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📈</Text>,
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Mi Perfil',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛡️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator id="AdminStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminMain" component={AdminTabs} />
      <Stack.Screen name="Roles" component={RolesAdminScreen} />
      <Stack.Screen name="Categorias" component={CategoriesAdminScreen} />
      <Stack.Screen name="Proveedores" component={ProvidersAdminScreen} />
      <Stack.Screen name="Historial" component={HistoryAdminScreen} />
      <Stack.Screen name="Soporte" component={SupportAdminScreen} />
      <Stack.Screen name="Disputas" component={DisputesScreen} />
      <Stack.Screen name="Notificaciones" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
