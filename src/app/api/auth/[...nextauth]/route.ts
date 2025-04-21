import NextAuth from "next-auth";
import { FirestoreAdapter } from "@next-auth/firebase-adapter";
import { cert } from "firebase-admin/app";
import type { NextAuthOptions } from "next-auth";

// Validate required environment variables
const requiredEnvVars = {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
};

// Check if any required environment variables are missing
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('Missing environment variables:', missingEnvVars);
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

// Log the presence of environment variables (without sensitive data)
console.log('Firebase configuration check:');
console.log('Project ID:', requiredEnvVars.FIREBASE_PROJECT_ID ? 'PRESENT' : 'MISSING');
console.log('Client Email:', requiredEnvVars.FIREBASE_CLIENT_EMAIL ? 'PRESENT' : 'MISSING');
console.log('Private Key:', requiredEnvVars.FIREBASE_PRIVATE_KEY ? 'PRESENT' : 'MISSING');

let authOptions: NextAuthOptions;

try {
  const firebaseConfig = {
    projectId: requiredEnvVars.FIREBASE_PROJECT_ID,
    credential: cert({
      projectId: requiredEnvVars.FIREBASE_PROJECT_ID,
      clientEmail: requiredEnvVars.FIREBASE_CLIENT_EMAIL,
      privateKey: requiredEnvVars.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  };

  authOptions = {
    adapter: FirestoreAdapter(firebaseConfig),
    providers: [],
    callbacks: {
      async session({ session, user }) {
        if (session?.user) {
          session.user.id = user.id;
          session.user.uid = user.id;
        }
        return session;
      },
    },
  };
} catch (error) {
  console.error('Firebase configuration error:', error);
  throw error;
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 