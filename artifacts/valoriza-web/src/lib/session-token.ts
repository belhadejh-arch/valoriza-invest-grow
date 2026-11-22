type TokenStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const STORAGE_KEY = "valoriza_session_token";

/** Keep the server-issued token usable when a browser denies persistent storage. */
export function createTokenStore(storage: () => TokenStorage) {
  let memory: string | null = null;
  let persistenceFailed = false;
  return {
    get(): string | null {
      try {
        const stored = storage().getItem(STORAGE_KEY);
        if (!persistenceFailed) memory = stored;
      } catch {
        persistenceFailed = true;
      }
      return memory;
    },
    set(token: string | null) {
      memory = token;
      try {
        if (token) storage().setItem(STORAGE_KEY, token);
        else storage().removeItem(STORAGE_KEY);
        persistenceFailed = false;
      } catch {
        persistenceFailed = true;
      }
    },
  };
}

const tokens = createTokenStore(() => localStorage);
const invalidationListeners = new Set<() => void>();
let invalidationReported = false;

export function getStoredToken(): string | null {
  return typeof window === "undefined" ? null : tokens.get();
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  tokens.set(token);
  invalidationReported = false;
}

export function onSessionInvalidated(listener: () => void) {
  invalidationListeners.add(listener);
  return () => { invalidationListeners.delete(listener); };
}

/** An old request must never log out an account selected more recently. */
export function invalidateSession(requestToken: string | null) {
  if (requestToken !== getStoredToken() || invalidationReported) return;
  setStoredToken(null);
  invalidationReported = true;
  invalidationListeners.forEach((listener) => listener());
}
