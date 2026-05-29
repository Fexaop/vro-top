import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useScraper } from './use-scraper';
import type { VtopSession } from '@/types/auth';

export function useVtopSession() {
  const { vtopSession, vtopCreds, setVtopSession, clearVtopSession, isAuthenticated } = useAuthStore();
  const selectedSemester = useSettingsStore((s) => s.selectedSemester);
  const adapter = useScraper();

  function withSemester(session: VtopSession): VtopSession {
    return selectedSemester ? { ...session, semesterCode: selectedSemester } : session;
  }

  async function ensureFreshSession(): Promise<VtopSession> {
    if (!vtopCreds) throw new Error('Not authenticated');

    if (!vtopSession || vtopSession.expiresAt <= Date.now()) {
      const fresh = await adapter.refreshSession(vtopCreds, vtopSession ?? undefined as never);
      await setVtopSession(fresh);
      return withSemester(fresh);
    }
    return withSemester(vtopSession);
  }

  // Call this when a data fetch fails with a session error — clears the cached session
  // so the next ensureFreshSession() call triggers a fresh login automatically.
  function invalidateSession() {
    clearVtopSession();
  }

  return { vtopSession, isAuthenticated, ensureFreshSession, invalidateSession };
}
