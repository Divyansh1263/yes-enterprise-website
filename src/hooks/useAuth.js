/**
 * Auth hook — will be implemented at Milestone C.
 * Will provide: user, session, isAdmin, loading, signIn, signOut
 */
export function useAuth() {
  return {
    user: null,
    session: null,
    isAdmin: false,
    loading: false,
    signIn: async () => { console.warn('Auth not connected yet') },
    signOut: async () => { console.warn('Auth not connected yet') },
  }
}

