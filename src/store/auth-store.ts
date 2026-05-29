import { create } from 'zustand';
import { secureStorage } from '@/lib/storage/secure';
import type { LmsCredentials, VtopCredentials, VtopSession } from '@/types/auth';

const CREDS_KEY = 'vtop_credentials';
const SESSION_KEY = 'vtop_session';
const LMS_KEY = 'lms_credentials';

interface AuthState {
  vtopCreds: VtopCredentials | null;
  vtopSession: VtopSession | null;
  lmsCreds: LmsCredentials | null;
  isAuthenticated: boolean;
  setVtopCreds: (creds: VtopCredentials) => Promise<void>;
  setVtopSession: (session: VtopSession) => Promise<void>;
  setLmsCreds: (creds: LmsCredentials) => Promise<void>;
  clearVtopSession: () => void;
  loadFromStorage: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  vtopCreds: null,
  vtopSession: null,
  lmsCreds: null,
  isAuthenticated: false,

  setVtopCreds: async (creds) => {
    await secureStorage.set(CREDS_KEY, JSON.stringify(creds));
    set({ vtopCreds: creds });
  },

  setVtopSession: async (session) => {
    await secureStorage.set(SESSION_KEY, JSON.stringify(session));
    set({ vtopSession: session, isAuthenticated: true });
  },

  setLmsCreds: async (creds) => {
    await secureStorage.set(LMS_KEY, JSON.stringify(creds));
    set({ lmsCreds: creds });
  },

  clearVtopSession: () => {
    void secureStorage.remove(SESSION_KEY);
    set({ vtopSession: null });
  },

  loadFromStorage: async () => {
    const [rawCreds, rawSession, rawLms] = await Promise.all([
      secureStorage.get(CREDS_KEY),
      secureStorage.get(SESSION_KEY),
      secureStorage.get(LMS_KEY),
    ]);

    const vtopCreds = rawCreds ? (JSON.parse(rawCreds) as VtopCredentials) : null;
    const vtopSession = rawSession ? (JSON.parse(rawSession) as VtopSession) : null;
    const lmsCreds = rawLms ? (JSON.parse(rawLms) as LmsCredentials) : null;

    const sessionValid = vtopSession ? vtopSession.expiresAt > Date.now() : false;

    set({
      vtopCreds,
      vtopSession: sessionValid ? vtopSession : null,
      lmsCreds,
      isAuthenticated: !!vtopCreds && sessionValid,
    });
  },

  logout: async () => {
    await Promise.all([
      secureStorage.remove(CREDS_KEY),
      secureStorage.remove(SESSION_KEY),
      secureStorage.remove(LMS_KEY),
    ]);
    const { useAttendanceStore } = await import('./attendance-store');
    const { useGradesStore } = await import('./grades-store');
    const { useLmsStore } = await import('./lms-store');
    useAttendanceStore.getState().clear();
    useGradesStore.getState().clear();
    useLmsStore.getState().clear();
    set({
      vtopCreds: null,
      vtopSession: null,
      lmsCreds: null,
      isAuthenticated: false,
    });
  },
}));
