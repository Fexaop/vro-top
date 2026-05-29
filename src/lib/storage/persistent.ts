import AsyncStorage from '@react-native-async-storage/async-storage';

async function set<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function get<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

async function clear(): Promise<void> {
  await AsyncStorage.clear();
}

export const persistentStorage = { set, get, remove, clear };
