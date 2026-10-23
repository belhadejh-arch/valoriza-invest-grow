type SessionResult<User> = {
  data: { session: { user: User } | null } | null;
  error: Error | null;
};

/** Short-lived UI state only: protected API requests still verify the session. */
export function createSessionReader<User>(
  load: () => Promise<SessionResult<User>>,
  identity: () => string | null,
  now = () => Date.now(),
) {
  let version = 0;
  let cached: { key: string | null; expires: number; result: SessionResult<User> } | null = null;
  let pending: { key: string | null; promise: Promise<SessionResult<User>> } | null = null;

  function clear() {
    version += 1;
    cached = null;
    pending = null;
  }

  function prime(user: User) {
    clear();
    cached = {
      key: identity(),
      expires: now() + 10_000,
      result: { data: { session: { user } }, error: null },
    };
  }

  function read(): Promise<SessionResult<User>> {
    const key = identity();
    if (cached?.key === key && cached.expires > now()) return Promise.resolve(cached.result);
    if (pending?.key === key) return pending.promise;
    const currentVersion = version;
    const promise = Promise.resolve().then(load).then((result) => {
      // A response started before logout/account switching cannot restore the old user.
      if (currentVersion !== version || key !== identity()) return read();
      if (!result.error && result.data?.session) {
        cached = { key, expires: now() + 10_000, result };
      } else {
        cached = null;
      }
      return result;
    }).finally(() => {
      if (pending?.promise === promise) pending = null;
    });
    pending = { key, promise };
    return promise;
  }

  return { read, clear, prime };
}
