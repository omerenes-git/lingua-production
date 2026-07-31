export interface User {
  uid: string;
}

interface AuthLike {
  currentUser: User | null;
}

const localUser: User = { uid: 'supabase-local-compat' };
const auth: AuthLike = { currentUser: localUser };

export class GoogleAuthProvider {}

export function getAuth(): AuthLike {
  return auth;
}

export async function signInWithPopup(): Promise<{ user: User }> {
  return { user: localUser };
}

export async function signInAnonymously(): Promise<{ user: User }> {
  auth.currentUser = localUser;
  return { user: localUser };
}

export async function signOut(): Promise<void> {
  auth.currentUser = null;
}

export function onAuthStateChanged(
  target: AuthLike,
  callback: (user: User | null) => void,
): () => void {
  callback(target.currentUser);
  return () => undefined;
}
