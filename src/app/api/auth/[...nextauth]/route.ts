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
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const firebaseConfig = {
  projectId: requiredEnvVars.FIREBASE_PROJECT_ID,
  credential: cert({
    projectId: requiredEnvVars.FIREBASE_PROJECT_ID,
    clientEmail: requiredEnvVars.FIREBASE_CLIENT_EMAIL,
    privateKey: requiredEnvVars.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
};

const authOptions: NextAuthOptions = {
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 