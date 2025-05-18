import { NextAuthOptions } from "next-auth"
import { FirestoreAdapter } from "@next-auth/firebase-adapter"
import { cert } from "firebase-admin/app"
import { firestore } from "@/lib/firebase-admin"

export const authOptions: NextAuthOptions = {
  adapter: FirestoreAdapter(firestore),
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub!
      }
      return session
    },
  },
}

export default authOptions 