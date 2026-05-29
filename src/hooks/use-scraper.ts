import { useMemo } from 'react';
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
    return new OnDeviceAdapter();
  }, [scraperMode, workerUrl]);
}
