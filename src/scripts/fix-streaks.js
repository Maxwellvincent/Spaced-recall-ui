/**
 * Script to fix login streaks for users
 * 
 * Run with: node src/scripts/fix-streaks.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, getDoc } = require('firebase/firestore');

// Initialize Firebase (replace with your config)
const firebaseConfig = {
  // Your Firebase config goes here
  // This should match the config in your src/lib/firebase.ts file
};

async function fixStreaks() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Fetching users...');
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log(`Found ${snapshot.size} users`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const userDoc of snapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        console.log(`Processing user: ${userData.email || userId}`);
        
        // Check if streak values are missing, null, undefined, or zero
        const currentStreak = userData.currentStreak;
        const highestStreak = userData.highestStreak;
        const lastLogin = userData.lastLogin;
        
        const needsUpdate = 
          currentStreak === undefined || 
          currentStreak === null || 
          currentStreak === 0 ||
          highestStreak === undefined ||
          highestStreak === null ||
          highestStreak === 0 ||
          !lastLogin;
        
        if (needsUpdate) {
          console.log(`Fixing streaks for user: ${userData.email || userId}`);
          console.log(`  Current values: streak=${currentStreak}, highest=${highestStreak}, lastLogin=${lastLogin || 'none'}`);
          
          // Set default streak values
          const now = new Date();
          await updateDoc(doc(db, 'users', userId), {
            currentStreak: 1,
            highestStreak: 1,
            lastLogin: now.toISOString()
          });
          
          updatedCount++;
          console.log(`  ✓ Updated user: ${userData.email || userId}`);
        } else {
          // Check if highest streak is less than current streak (inconsistent)
          if (highestStreak < currentStreak) {
            console.log(`Fixing inconsistent streak for user: ${userData.email || userId}`);
            console.log(`  Current values: streak=${currentStreak}, highest=${highestStreak}`);
            
            await updateDoc(doc(db, 'users', userId), {
              highestStreak: currentStreak
            });
            
            updatedCount++;
            console.log(`  ✓ Fixed highest streak for user: ${userData.email || userId}`);
          } else {
            skippedCount++;
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${userDoc.id}:`, userError);
        errorCount++;
      }
    }
    
    console.log('\nSummary:');
    console.log(`- Fixed streaks for ${updatedCount} users`);
    console.log(`- Skipped ${skippedCount} users (no issues found)`);
    console.log(`- Errors encountered: ${errorCount}`);
    console.log('Done!');
    
  } catch (error) {
    console.error('Error fixing streaks:', error);
  }
}

// Run the fix function
fixStreaks(); 