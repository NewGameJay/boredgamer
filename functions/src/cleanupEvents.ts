import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Run daily at midnight
export const cleanupOldEvents = functions.pubsub.schedule('0 0 * * *')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Get all studios
    const studios = await db.collection('studios').get();
    
    for (const studio of studios.docs) {
      const tier = studio.data().tier;
      
      // Set retention period based on tier
      let retentionDays;
      switch (tier) {
        case 'enterprise':
          retentionDays = 365; // 1 year
          break;
        case 'professional':
          retentionDays = 90;  // 3 months
          break;
        case 'independent':
          retentionDays = 30;  // 1 month
          break;
        default:
          retentionDays = 7;   // 1 week for free tier
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

      // Delete old events in batches
      const eventsQuery = db.collection('events')
        .where('studioId', '==', studio.id)
        .where('timestamp', '<', cutoffTimestamp)
        .limit(500); // Process in batches of 500

      while ((await eventsQuery.get()).size > 0) {
        const batch = db.batch();
        const snapshot = await eventsQuery.get();
        
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
      }
    }
  });
