/**
 * Script to fix theme inconsistencies for users
 * 
 * Run with: node src/scripts/fix-themes.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, getDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Firebase with config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "spacedrecallapp-e142c", // Fallback to project ID from .firebaserc
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Check if we have the minimum required config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Missing required Firebase configuration. Please check your .env.local file.');
  console.log('Current config:', firebaseConfig);
  process.exit(1);
}

async function fixThemes() {
  try {
    console.log('Initializing Firebase with config:', firebaseConfig);
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Fetching users...');
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log(`Found ${snapshot.size} users`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Valid theme values
    const validThemes = ['classic', 'dbz', 'naruto', 'hogwarts'];
    
    for (const userDoc of snapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        console.log(`Processing user: ${userData.email || userId}`);
        
        // Check if theme is missing or invalid
        const currentTheme = userData.theme;
        
        const needsUpdate = 
          currentTheme === undefined || 
          currentTheme === null || 
          currentTheme === "" || 
          !validThemes.includes(currentTheme?.toLowerCase());
        
        if (needsUpdate) {
          console.log(`Fixing theme for user: ${userData.email || userId}`);
          console.log(`  Current theme: ${currentTheme || 'none'}`);
          
          // Set default theme to classic
          await updateDoc(doc(db, 'users', userId), {
            theme: 'classic',
            lastUpdated: new Date().toISOString()
          });
          
          updatedCount++;
          console.log(`  ✓ Updated user theme to 'classic'`);
        } else {
          // Check if theme is not lowercase (for consistency)
          if (currentTheme !== currentTheme.toLowerCase()) {
            console.log(`Normalizing theme case for user: ${userData.email || userId}`);
            console.log(`  Current theme: ${currentTheme}`);
            
            await updateDoc(doc(db, 'users', userId), {
              theme: currentTheme.toLowerCase(),
              lastUpdated: new Date().toISOString()
            });
            
            updatedCount++;
            console.log(`  ✓ Normalized theme to '${currentTheme.toLowerCase()}'`);
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
    console.log(`- Fixed themes for ${updatedCount} users`);
    console.log(`- Skipped ${skippedCount} users (no issues found)`);
    console.log(`- Errors encountered: ${errorCount}`);
    console.log('Done!');
    
  } catch (error) {
    console.error('Error fixing themes:', error);
  }
}

// Run the fix function
fixThemes(); 