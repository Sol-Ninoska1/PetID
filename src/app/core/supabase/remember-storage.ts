const REMEMBER_KEY = 'petid.remember';

/** "Recordarme" unchecked: the session lives in sessionStorage and ends when the browser closes. */
export function setRememberSession(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

function activeStorage(): Storage {
  return localStorage.getItem(REMEMBER_KEY) === '0' ? sessionStorage : localStorage;
}

export const rememberAwareStorage = {
  getItem: (key: string) => activeStorage().getItem(key),
  setItem: (key: string, value: string) => activeStorage().setItem(key, value),
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};
