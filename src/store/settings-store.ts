import { create } from 'zustand';
import { persistentStorage } from '@/lib/storage/persistent';

const SETTINGS_KEY = 'app_settings';

export type ScraperMode = 'ondevice' | 'cfworker';
export type ThemePref = 'system' | 'light' | 'dark';

interface SettingsState {
  theme: ThemePref;
  scraperMode: ScraperMode;
  workerUrl: string;
  showCgpa: boolean;
  decimalPlaces: number;
  notificationsEnabled: boolean;
  setTheme: (t: ThemePref) => Promise<void>;
  setScraperMode: (m: ScraperMode) => Promise<void>;
  setWorkerUrl: (url: string) => Promise<void>;
  setShowCgpa: (v: boolean) => Promise<void>;
  setDecimalPlaces: (n: number) => Promise<void>;
  setNotificationsEnabled: (v: boolean) => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

type PersistedSettings = Omit<
  SettingsState,
  'setTheme' | 'setScraperMode' | 'setWorkerUrl' | 'setShowCgpa' | 'setDecimalPlaces' | 'setNotificationsEnabled' | 'loadFromStorage'
>;

const DEFAULTS: PersistedSettings = {
  theme: 'system',
  scraperMode: 'ondevice',
  workerUrl: '',
  showCgpa: true,
  decimalPlaces: 2,
  notificationsEnabled: false,
};

function makeSetter<K extends keyof PersistedSettings>(
  key: K,
  set: (fn: (s: SettingsState) => Partial<SettingsState>) => void,
) {
  return async (value: PersistedSettings[K]) => {
    set((s) => {
      const next = { ...s, [key]: value };
      persistentStorage.set(SETTINGS_KEY, {
        theme: next.theme,
        scraperMode: next.scraperMode,
        workerUrl: next.workerUrl,
        showCgpa: next.showCgpa,
        decimalPlaces: next.decimalPlaces,
        notificationsEnabled: next.notificationsEnabled,
      } satisfies PersistedSettings);
      return { [key]: value };
    });
  };
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULTS,

  setTheme: makeSetter('theme', set),
  setScraperMode: makeSetter('scraperMode', set),
  setWorkerUrl: makeSetter('workerUrl', set),
  setShowCgpa: makeSetter('showCgpa', set),
  setDecimalPlaces: makeSetter('decimalPlaces', set),
  setNotificationsEnabled: makeSetter('notificationsEnabled', set),

  loadFromStorage: async () => {
    const saved = await persistentStorage.get<PersistedSettings>(SETTINGS_KEY);
    if (saved) set({ ...DEFAULTS, ...saved });
  },
}));
