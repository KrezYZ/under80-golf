import { createContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, ADMIN_EMAILS, isFirebaseConfigured } from '../firebase/config';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// ---- Local auth (when Firebase not configured) ----

function useLocalAuth(): AuthContextType {
  const [localUser, setLocalUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('under80_user');
    return stored ? (JSON.parse(stored) as User) : null;
  });

  const isAdmin = !!(localUser?.email && ADMIN_EMAILS.includes(localUser.email));

  const localSignIn = async (email: string, password: string) => {
    // Simple PIN auth for admin, guest for anyone
    if (ADMIN_EMAILS.includes(email) && password === 'admin123') {
      const mockUser = { email, uid: email, emailVerified: true, displayName: email.split('@')[0], photoURL: null } as unknown as User;
      sessionStorage.setItem('under80_user', JSON.stringify(mockUser));
      setLocalUser(mockUser);
      return;
    }
    // Any email + password >= 3 chars = guest
    if (password.length >= 3) {
      const mockUser = { email, uid: email, emailVerified: true, displayName: email.split('@')[0], photoURL: null } as unknown as User;
      sessionStorage.setItem('under80_user', JSON.stringify(mockUser));
      setLocalUser(mockUser);
      return;
    }
    throw new Error('密码至少需要3个字符');
  };

  const localSignUp = async (email: string, password: string) => {
    if (password.length < 3) throw new Error('密码至少需要3个字符');
    const mockUser = { email, uid: email, emailVerified: true, displayName: email.split('@')[0], photoURL: null } as unknown as User;
    sessionStorage.setItem('under80_user', JSON.stringify(mockUser));
    setLocalUser(mockUser);
  };

  const localSignOut = async () => {
    sessionStorage.removeItem('under80_user');
    setLocalUser(null);
  };

  return {
    user: localUser,
    loading: false,
    isAdmin,
    signIn: localSignIn,
    signUp: localSignUp,
    signOut: localSignOut,
  };
}

// ---- Firebase auth (when configured) ----

function useFirebaseAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const isAdmin = !!(user?.email && ADMIN_EMAILS.includes(user.email));

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return { user, loading, isAdmin, signIn, signUp, signOut };
}

// ---- Provider ----

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseAuth = useFirebaseAuth();
  const localAuth = useLocalAuth();
  const value = isFirebaseConfigured() ? firebaseAuth : localAuth;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
