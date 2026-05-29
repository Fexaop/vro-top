import { useEffect } from 'react';
import { Platform } from 'react-native';
import { registerBackgroundRefresh, unregisterBackgroundRefresh } from '@/lib/background/tasks';
import { useSettingsStore } from '@/store/settings-store';

export function useBackgroundTask() {
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (notificationsEnabled) {
      void registerBackgroundRefresh();
    } else {
      void unregisterBackgroundRefresh();
    }
    return () => { void unregisterBackgroundRefresh(); };
  }, [notificationsEnabled]);
}
