import { create } from 'zustand';
import { persistentStorage } from '@/lib/storage/persistent';

const SETTINGS_KEY = 'app_settings';

export type ScraperMode = 'ondevice' | 'cfworker';
export type ThemePref = 'system' | 'light' | 'dark';

export interface SemesterOption {
  code: string;
  label: string;
}

// Hardcoded semester list — same approach as UniCC (no VTOP endpoint for semester list)
// VTOP semester type codes: 01 = Fall, 05 = Winter, 07 = Summer
export const SEMESTER_LIST: SemesterOption[] = [
  { code: 'CH20262701', label: 'Fall 2026-27' },
  { code: 'CH20252607', label: 'Summer 2025-26' },
  { code: 'CH20252605', label: 'Winter 2025-26' },
  { code: 'CH20252601', label: 'Fall 2025-26' },
  { code: 'CH20242507', label: 'Summer 2024-25' },
  { code: 'CH20242505', label: 'Winter 2024-25' },
  { code: 'CH20242501', label: 'Fall 2024-25' },
  { code: 'CH20232407', label: 'Summer 2023-24' },
  { code: 'CH20232405', label: 'Winter 2023-24' },
  { code: 'CH20232401', label: 'Fall 2023-24' },
  { code: 'CH20222307', label: 'Summer 2022-23' },
  { code: 'CH20222305', label: 'Winter 2022-23' },
  { code: 'CH20222301', label: 'Fall 2022-23' },
];

interface SettingsState {
  theme: ThemePref;
  scraperMode: ScraperMode;
  workerUrl: string;
  showCgpa: boolean;
  decimalPlaces: number;
  notificationsEnabled: boolean;
  selectedSemester: string;
  setTheme: (t: ThemePref) => Promise<void>;
  setScraperMode: (m: ScraperMode) => Promise<void>;
  setWorkerUrl: (url: string) => Promise<void>;
  setShowCgpa: (v: boolean) => Promise<void>;
  setDecimalPlaces: (n: number) => Promise<void>;
  setNotificationsEnabled: (v: boolean) => Promise<void>;
  setSelectedSemester: (code: string) => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

type PersistedSettings = Omit<
  SettingsState,
  'setTheme' | 'setScraperMode' | 'setWorkerUrl' | 'setShowCgpa' | 'setDecimalPlaces' | 'setNotificationsEnabled' | 'setSelectedSemester' | 'loadFromStorage'
>;

const DEFAULTS: PersistedSettings = {
  theme: 'system',
  scraperMode: 'cfworker',
  workerUrl: '',
  showCgpa: true,
  decimalPlaces: 2,
  notificationsEnabled: false,
  selectedSemester: SEMESTER_LIST[1]?.code ?? '',
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
        selectedSemester: next.selectedSemester,
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
  setSelectedSemester: async (code: string) => {
    set((s) => {
      const next = { ...s, selectedSemester: code };
      void persistentStorage.set(SETTINGS_KEY, {
        theme: next.theme, scraperMode: next.scraperMode, workerUrl: next.workerUrl,
        showCgpa: next.showCgpa, decimalPlaces: next.decimalPlaces,
        notificationsEnabled: next.notificationsEnabled, selectedSemester: code,
      } satisfies PersistedSettings);
      return { selectedSemester: code };
    });
    // Clear semester-dependent caches so screens re-fetch with the new semester
    const { useAttendanceStore } = await import('./attendance-store');
    const { useGradesStore } = await import('./grades-store');
    useAttendanceStore.getState().clear();
    useGradesStore.getState().clear();
  },

  loadFromStorage: async () => {
    const saved = await persistentStorage.get<PersistedSettings>(SETTINGS_KEY);
    if (saved) set({ ...DEFAULTS, ...saved });
  },
}));
