'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { AuthState, SignUpData, SignInData, Studio } from './types';
import { app } from '@/lib/firebase';
import Cookies from 'js-cookie';

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

interface AuthContextType extends AuthState {
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get additional studio data from Firestore
          const studioDoc = await getDoc(doc(db, 'studios', firebaseUser.uid));
          const data = studioDoc.data();
          
          if (data) {
            // Set auth cookie when user is authenticated
            Cookies.set('auth', 'true', { 
              expires: 7, // 7 days
              sameSite: 'strict',
              secure: process.env.NODE_ENV === 'production'
            });

            setState({
              user: {
                id: firebaseUser.uid,
                name: data.name,
                email: data.email,
                tier: data.tier,
                features: data.features,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt)
              },
              loading: false,
              error: null
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setState({ user: null, loading: false, error: 'Error fetching user data' });
        }
      } else {
        // Remove auth cookie when user is not authenticated
        Cookies.remove('auth');
        setState({ user: null, loading: false, error: null });
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async ({ studioName, email, password }: SignUpData) => {
    try {
      // Create Firebase Auth user
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      await createStudioDocument(firebaseUser.uid, studioName, email);
    } catch (error) {
      console.error('Error during sign up:', error);
      setState(prev => ({ ...prev, error: 'Failed to create account' }));
      throw error;
    }
  };

  const createStudioDocument = async (userId: string, studioName: string, email: string) => {
    const now = Timestamp.now();
    const studioData: Omit<Studio, 'id'> = {
      name: studioName,
      email,
      tier: 'independent',
      features: {
        leaderboards: true,
        quests: false,
        tournaments: false,
        matchmaking: false,
        creatorProgram: false
      },
      createdAt: now.toDate(),
      updatedAt: now.toDate()
    };

    // Save to Firestore with proper Timestamp objects
    await setDoc(doc(db, 'studios', userId), {
      ...studioData,
      createdAt: now,
      updatedAt: now
    });

    // Update local state
    setState({
      user: {
        id: userId,
        ...studioData
      },
      loading: false,
      error: null
    });
  };

  const signInWithGoogle = async () => {
    try {
      const { user: firebaseUser } = await signInWithPopup(auth, googleProvider);
      
      // Check if studio document exists
      const studioDoc = await getDoc(doc(db, 'studios', firebaseUser.uid));
      
      if (!studioDoc.exists()) {
        // Create new studio document for Google sign-in
        const studioName = firebaseUser.displayName || 'My Studio';
        await createStudioDocument(firebaseUser.uid, studioName, firebaseUser.email!);
      }
      
      // User data will be fetched by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error during Google sign in:', error);
      setState(prev => ({ ...prev, error: 'Failed to sign in with Google' }));
      throw error;
    }
  };

  const signIn = async ({ email, password }: SignInData) => {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      
      // User data will be fetched by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error during sign in:', error);
      setState(prev => ({ ...prev, error: 'Invalid email or password' }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setState({ user: null, loading: false, error: null });
    } catch (error) {
      console.error('Error during sign out:', error);
      setState(prev => ({ ...prev, error: 'Failed to sign out' }));
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
