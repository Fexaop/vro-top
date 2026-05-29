import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/store/settings-store';
import { OnDeviceAdapter } from '@/lib/scraper/on-device-adapter';
import { CfWorkerAdapter } from '@/lib/scraper/cf-worker-adapter';
import type { ScraperAdapter } from '@/lib/scraper/adapter';

export function useScraper(): ScraperAdapter {
  const scraperMode = useSettingsStore((s) => s.scraperMode);
  const workerUrl = useSettingsStore((s) => s.workerUrl);

  return useMemo(() => {
    if (scraperMode === 'cfworker' && workerUrl) {
      return new CfWorkerAdapter(workerUrl);
    }
    // Web cannot make direct cross-origin requests to VIT servers — CF Worker required
    if (Platform.OS === 'web' && workerUrl) {
      return new CfWorkerAdapter(workerUrl);
    }
    return new OnDeviceAdapter();
  }, [scraperMode, workerUrl]);
}

export function useScraperReady(): boolean {
  const scraperMode = useSettingsStore((s) => s.scraperMode);
  const workerUrl = useSettingsStore((s) => s.workerUrl);
  if (Platform.OS === 'web') return !!workerUrl;
  if (scraperMode === 'cfworker') return !!workerUrl;
  return true;
}
