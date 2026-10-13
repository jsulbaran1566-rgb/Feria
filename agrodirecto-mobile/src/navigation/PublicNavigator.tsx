import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/public/HomeScreen';
import AboutScreen from '../screens/public/AboutScreen';
import ContactScreen from '../screens/public/ContactScreen';
import LoginScreen from '../screens/public/LoginScreen';
import RegisterScreen from '../screens/public/RegisterScreen';
import RecoverPasswordScreen from '../screens/public/RecoverPasswordScreen';

export type PublicStackParamList = {
  Home: undefined;
  About: undefined;
  Contact: undefined;
  Login: undefined;
  Register: undefined;
  RecoverPassword: undefined;
};

const Stack = createNativeStackNavigator<PublicStackParamList>();

export default function PublicNavigator() {
  return (
    <Stack.Navigator id="PublicStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="RecoverPassword" component={RecoverPasswordScreen} />
    </Stack.Navigator>
  );
}
