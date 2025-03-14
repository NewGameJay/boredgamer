import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCn5CJHBqIG_EkuNKW8ctMonx_O4j9xLvo",
  authDomain: "boredgamer-ad280.firebaseapp.com",
  projectId: "boredgamer-ad280",
  storageBucket: "boredgamer-ad280.firebasestorage.app",
  messagingSenderId: "867192671855",
  appId: "1:867192671855:web:39152e848d742cafa5479a",
  measurementId: "G-34RVL0FQFV"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
