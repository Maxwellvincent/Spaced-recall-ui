import NextAuth from "next-auth";
import { FirestoreAdapter } from "@next-auth/firebase-adapter";
import { cert } from "firebase-admin/app";
import type { NextAuthOptions } from "next-auth";

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

const handler = NextAuth({
  adapter: FirestoreAdapter(firebaseConfig),
  providers: [],
  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        session.user.uid = user.id;
      }
      return session;
    },
  },
} as NextAuthOptions);

export { handler as GET, handler as POST }; 