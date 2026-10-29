export const SESSION_PREFERENCE = 'hka-session-persistence';
type AuthStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createAuthStorage(persistent: AuthStorage, tab: AuthStorage): AuthStorage {
  const sessionOnly = () => persistent.getItem(SESSION_PREFERENCE) === 'session';
  return {
    getItem: key => sessionOnly() ? tab.getItem(key) : persistent.getItem(key),
    setItem(key, value) {
      const destination = sessionOnly() ? tab : persistent;
      const previous = sessionOnly() ? persistent : tab;
      destination.setItem(key, value);
      previous.removeItem(key);
    },
    removeItem(key) {
      persistent.removeItem(key);
      tab.removeItem(key);
    },
  };
}

export function setAuthPersistence(staySignedIn: boolean, key: string, persistent: AuthStorage, tab: AuthStorage) {
  const destination = staySignedIn ? persistent : tab;
  const previous = staySignedIn ? tab : persistent;
  const preference = persistent.getItem(SESSION_PREFERENCE);
  const active = preference === 'session' ? tab : persistent;
  const keys = [key, key + '-code-verifier', key + '-user'];
  // Copy first: a failed destination write must preserve the existing session.
  for (const entry of keys) {
    const value = active.getItem(entry) ?? (preference === null ? previous.getItem(entry) : null);
    if (value !== null) destination.setItem(entry, value);
  }
  persistent.setItem(SESSION_PREFERENCE, staySignedIn ? 'local' : 'session');
  for (const entry of keys) previous.removeItem(entry);
}
