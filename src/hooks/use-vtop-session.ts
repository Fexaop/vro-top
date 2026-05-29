import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useScraper } from './use-scraper';
import type { VtopSession } from '@/types/auth';

export function useVtopSession() {
  const { vtopSession, vtopCreds, setVtopSession, isAuthenticated } = useAuthStore();
  const selectedSemester = useSettingsStore((s) => s.selectedSemester);
  const adapter = useScraper();

  function withSemester(session: VtopSession): VtopSession {
    return selectedSemester ? { ...session, semesterCode: selectedSemester } : session;
  }

  async function ensureFreshSession(): Promise<VtopSession> {
    if (!vtopCreds) throw new Error('Not authenticated');

    if (!vtopSession || vtopSession.expiresAt <= Date.now()) {
      const fresh = await adapter.refreshSession(vtopCreds, vtopSession!);
      await setVtopSession(fresh);
      return withSemester(fresh);
    }
    return withSemester(vtopSession);
  }

  return { vtopSession, isAuthenticated, ensureFreshSession };
}
