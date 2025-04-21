// migrate_user.mjs
import admin from "firebase-admin";


// Load your service account credentials
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Initialize admin app (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function migrateUsers() {
  const usersRef = db.collection("users");
  const snapshot = await usersRef.get();

  for (const userDoc of snapshot.docs) {
    const username = userDoc.id;
    const data = userDoc.data();

    const uid = data.uid;
    if (!uid) {
      console.warn(`⚠️ Skipping ${username} — no UID found`);
      continue;
    }

    const newRef = db.collection("users").doc(uid);
    await newRef.set({ ...data, username }, { merge: true });
    await usersRef.doc(username).delete();

    console.log(`✅ Migrated ${username} → ${uid}`);
  }

  console.log("🎉 Migration complete");
}

migrateUsers().catch(console.error);
