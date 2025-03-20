import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCn5CJHBqIG_EkuNKW8ctMonx_O4j9xLvo",
  authDomain: "boredgamer-ad280.firebaseapp.com",
  projectId: "boredgamer-ad280",
  storageBucket: "boredgamer-ad280.firebasestorage.app",
  messagingSenderId: "867192671855",
  appId: "1:867192671855:web:39152e848d742cafa5479a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Simulate SDK
class BoredGamerSDK {
  private apiKey: string;
  private gameId: string;
  private db: any;

  constructor({ apiKey, gameId }: { apiKey: string; gameId: string }) {
    this.apiKey = apiKey;
    this.gameId = gameId;
    this.db = getFirestore(app);
  }

  async trackEvent(type: string, data: any) {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const event = {
        gameId: this.gameId,
        studioId: auth.currentUser.uid,
        type,
        data,
        timestamp: serverTimestamp(),
        metadata: {
          sdkVersion: '1.0.0',
          platform: 'test-simulator'
        }
      };

      console.log('Sending event:', event);

      const docRef = await addDoc(collection(this.db, 'events'), event);
      console.log('Event sent successfully:', { type, id: docRef.id });
      return docRef;
    } catch (error) {
      console.error('Error sending event:', error);
      throw error;
    }
  }
}

async function runSimulation() {
  try {
    // Sign in first
    const userCredential = await signInWithEmailAndPassword(auth, 'jflo7006@gmail.com', 'Copper7006!');
    console.log('Successfully authenticated with UID:', userCredential.user.uid);

    // Initialize SDK with test credentials
    const sdk = new BoredGamerSDK({
      apiKey: 'bg_i_0tmigbtx8lcn',
      gameId: 'JaysGame'
    });

    // Simulate game events
    await sdk.trackEvent('game_started', {
      difficulty: 'normal',
      playerLevel: 1,
      timestamp: new Date().toISOString()
    });

    // Simulate combat event
    await sdk.trackEvent('combat_encounter', {
      enemyType: 'guard',
      playerHealth: 85,
      weaponUsed: 'hidden_blade',
      location: 'damascus_market'
    });

    // Simulate mission completion
    await sdk.trackEvent('mission_completed', {
      missionId: 'assassination_1',
      timeSpent: 345, // seconds
      stealthKills: 3,
      detected: false,
      rewards: {
        xp: 500,
        gold: 1000,
        items: ['smoke_bomb', 'throwing_knife']
      }
    });

    // Simulate player stats
    await sdk.trackEvent('player_stats', {
      level: 2,
      xp: 1500,
      health: 100,
      stamina: 85,
      inventory: {
        weapons: ['hidden_blade', 'sword'],
        consumables: ['health_potion', 'smoke_bomb'],
        gold: 2500
      }
    });

    console.log('All test events sent successfully!');
  } catch (error) {
    console.error('Error in simulation:', error);
  }
}

// Run the simulation
runSimulation();
