import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_API_URL = '@agrodirecto_custom_api_url';

// URL por defecto según la plataforma
const getDefaultApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    // 10.0.2.2 apunta al host en el emulador Android
    return 'http://10.0.2.2:8000';
  }
  // iOS Simulator o Web
  return 'http://127.0.0.1:8000';
};

let currentApiUrl = getDefaultApiUrl();

// Carga inicial de URL personalizada guardada en el dispositivo
export const initApiUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (saved && saved.trim()) {
      currentApiUrl = saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // Si falla, usar la predeterminada
  }
  return currentApiUrl;
};

export const getApiUrl = (): string => currentApiUrl;

export const setCustomApiUrl = async (newUrl: string): Promise<string> => {
  if (!newUrl || !newUrl.trim()) {
    currentApiUrl = getDefaultApiUrl();
    await AsyncStorage.removeItem(STORAGE_KEY_API_URL);
  } else {
    currentApiUrl = newUrl.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEY_API_URL, currentApiUrl);
  }
  return currentApiUrl;
};

export default {
  getApiUrl,
  setCustomApiUrl,
  initApiUrl,
};
