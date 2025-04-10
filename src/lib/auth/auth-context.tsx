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
    console.log('Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', { firebaseUser });
      if (firebaseUser) {
        // Set auth cookie when user is authenticated
        Cookies.set('auth', 'true', { expires: 7 });
        try {
          const userDoc = await getDoc(doc(db, 'studios', firebaseUser.uid));
          console.log('Fetched user doc:', { exists: userDoc.exists(), data: userDoc.data() });
          if (userDoc.exists()) {
            const userData = userDoc.data() as Studio;
            console.log('Setting user state with:', userData);
            setState({
              user: {
                ...userData,
                id: firebaseUser.uid,
                studioId: firebaseUser.uid
              },
              loading: false,
              error: null
            });
          } else {
            console.log('No studio document found for user');
            setState({ user: null, loading: false, error: 'No studio document found' });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setState({ user: null, loading: false, error: 'Failed to fetch user data' });
        }
      } else {
        // Remove auth cookie when user is not authenticated
        Cookies.remove('auth');
        setState({ user: null, loading: false, error: null });
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async ({ studioName, email, password }: SignUpData): Promise<void> => {
    try {
      setState({ user: null, loading: true, error: null });
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      const userId = firebaseUser.uid;
      
      const studioData = {
        name: studioName,
        email: email,
        studioId: userId,  
        tier: 'independent' as const,
        features: {
          leaderboards: true,
          quests: false,
          tournaments: false,
          matchmaking: false,
          creatorProgram: false,
          communities: false,
          affiliates: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'studios', userId), studioData);

      setState({
        user: {
          id: userId,
          ...studioData
        },
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error signing up:', error);
      setState({ user: null, loading: false, error: 'Failed to sign up' });
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { user: firebaseUser } = await signInWithPopup(auth, googleProvider);
      
      // Check if studio document exists
      const studioDoc = await getDoc(doc(db, 'studios', firebaseUser.uid));
      
      if (!studioDoc.exists()) {
        // Create new studio document for Google sign-in
        const studioName = firebaseUser.displayName || 'My Studio';
        const studioData = {
          name: studioName,
          email: firebaseUser.email || '',
          studioId: firebaseUser.uid,
          tier: 'independent' as const,
          features: {
            leaderboards: true,
            quests: false,
            tournaments: false,
            matchmaking: false,
            creatorProgram: false,
            communities: false,
            affiliates: false
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await setDoc(doc(db, 'studios', firebaseUser.uid), studioData);
        
        // Set the user state immediately after creating the document
        setState({
          user: {
            id: firebaseUser.uid,
            ...studioData
          },
          loading: false,
          error: null
        });
      } else {
        // If document exists, fetch and set the user state
        const userData = studioDoc.data() as Studio;
        setState({
          user: {
            ...userData,
            id: firebaseUser.uid,
            studioId: firebaseUser.uid
          },
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Error during Google sign in:', error);
      setState(prev => ({ ...prev, error: 'Failed to sign in with Google' }));
      throw error;
    }
  };

  const signIn = async ({ email, password }: SignInData) => {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch and set user data immediately
      const userDoc = await getDoc(doc(db, 'studios', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as Studio;
        setState({
          user: {
            ...userData,
            id: firebaseUser.uid,
            studioId: firebaseUser.uid
          },
          loading: false,
          error: null
        });
      } else {
        setState({ user: null, loading: false, error: 'No studio document found' });
      }
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
