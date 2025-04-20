// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDFP1NNsSENaAT8e8OUoFHbP96FfsigwPk",
    authDomain: "spaced-repetition-study-logger.firebaseapp.com",
    projectId: "spaced-repetition-study-logger",
    storageBucket: "spaced-repetition-study-logger.firebasestorage.app",
    messagingSenderId: "756320605158",
    appId: "1:756320605158:web:d9ae12fbc507ace1bdfc27"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
