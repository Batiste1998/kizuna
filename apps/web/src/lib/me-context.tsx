import { createContext, useContext } from 'react';
import type { Me } from './api';

const MeContext = createContext<Me | null>(null);

export const MeProvider = MeContext.Provider;

/** Current user, guaranteed present inside the /app shell. */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMe must be used within the app shell');
  return me;
}

/** Current user if available (null outside the shell). */
export function useMaybeMe(): Me | null {
  return useContext(MeContext);
}
