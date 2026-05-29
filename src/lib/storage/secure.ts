import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memStore = new Map<string, string>();

async function set(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    memStore.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function get(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return memStore.get(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function remove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    memStore.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = { set, get, remove };
