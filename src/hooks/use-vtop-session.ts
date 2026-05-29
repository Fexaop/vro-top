import { useAuthStore } from '@/store/auth-store';
import { useScraper } from './use-scraper';

export function useVtopSession() {
  const { vtopSession, vtopCreds, setVtopSession, isAuthenticated } = useAuthStore();
  const adapter = useScraper();

  async function ensureFreshSession() {
    if (!vtopCreds) throw new Error('Not authenticated');

    if (!vtopSession || vtopSession.expiresAt <= Date.now()) {
      const fresh = await adapter.refreshSession(vtopCreds, vtopSession!);
      await setVtopSession(fresh);
      return fresh;
    }
    return vtopSession;
  }

  return { vtopSession, isAuthenticated, ensureFreshSession };
}
