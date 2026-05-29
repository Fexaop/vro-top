import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

async function set(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(`btop_${key}`, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function get(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(`btop_${key}`);
  }
  return SecureStore.getItemAsync(key);
}

async function remove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(`btop_${key}`);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = { set, get, remove };
