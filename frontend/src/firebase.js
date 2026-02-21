import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD0JrFSno-D0mqGlmzij964hltHwioSpiM",
  authDomain: "learnpulse-2c85d.firebaseapp.com",
  projectId: "learnpulse-2c85d",
  storageBucket: "learnpulse-2c85d.firebasestorage.app",
  messagingSenderId: "158614885761",
  appId: "1:158614885761:web:dd3f1c15227f36a1fdc480",
  measurementId: "G-0081S3J77W"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);