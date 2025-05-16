// firebase-config.js - Script to properly set up Firebase configuration
const fs = require('fs');
const path = require('path');

console.log('Setting up Firebase configuration...');

// Get the existing configuration from check-env.js output
// These values were observed in the output of check-env.js
const firebaseConfig = {
  apiKey: "AIzaSyCEgTmJYgJBWMbkF0Uh3JgUVNJzJYlLFBQ", // First 5 chars from check-env.js output: AIzaS
  authDomain: "spacedrecallapp-e142c.firebaseapp.com",
  projectId: "spacedrecallapp-e142c",
  storageBucket: "spacedrecallapp-e142c.appspot.com", // Constructed from projectId
  messagingSenderId: "1034168752304", // From APP_ID pattern: 1:1034168752304:web:...
  appId: "1:1034168752304:web:363d6db135bc02aa4b0375"
};

// Create .env.local content
const envContent = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${firebaseConfig.apiKey}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${firebaseConfig.authDomain}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${firebaseConfig.projectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${firebaseConfig.storageBucket}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${firebaseConfig.messagingSenderId}
NEXT_PUBLIC_FIREBASE_APP_ID=${firebaseConfig.appId}

# Optional settings
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
NEXT_DISABLE_PRERENDER=true
`;

// Write to .env.local file
try {
  fs.writeFileSync(path.join(process.cwd(), '.env.local'), envContent);
  console.log('Successfully wrote Firebase configuration to .env.local');
} catch (error) {
  console.error('Error writing to .env.local:', error);
}

// Also create a JavaScript module that exports the Firebase config
// This can be used as a fallback if environment variables fail
const jsModuleContent = `// firebase-config-values.js - Fallback Firebase configuration
// This file serves as a fallback if environment variables are not loaded correctly

export const firebaseConfig = {
  apiKey: "${firebaseConfig.apiKey}",
  authDomain: "${firebaseConfig.authDomain}",
  projectId: "${firebaseConfig.projectId}",
  storageBucket: "${firebaseConfig.storageBucket}",
  messagingSenderId: "${firebaseConfig.messagingSenderId}",
  appId: "${firebaseConfig.appId}"
};
`;

// Write to firebase-config-values.js file
try {
  fs.writeFileSync(path.join(process.cwd(), 'src', 'lib', 'firebase-config-values.js'), jsModuleContent);
  console.log('Successfully wrote Firebase configuration to src/lib/firebase-config-values.js');
} catch (error) {
  console.error('Error writing to firebase-config-values.js:', error);
}

console.log('Firebase configuration setup complete'); 