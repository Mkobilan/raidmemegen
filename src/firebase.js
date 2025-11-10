// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // For user auth
import { getFirestore } from 'firebase/firestore'; // For saving raids (structured docs)
import { getDatabase } from 'firebase/database'; // For group chats (real-time sync)
import { getStorage } from 'firebase/storage'; // For file uploads (e.g., shared PDFs)

// Your exact config
const firebaseConfig = {
  apiKey: "AIzaSyAWdyGy09DufFPFMGCQG1sjuUmFI3YPxtY",
  authDomain: "raidmemegen.firebaseapp.com",
  databaseURL: "https://raidmemegen-default-rtdb.firebaseio.com",
  projectId: "raidmemegen",
  storageBucket: "raidmemegen.firebasestorage.app",
  messagingSenderId: "4640669683",
  appId: "1:4640669683:web:5cc4196e2fd6816ec7dc86",
  measurementId: "G-BYT5BK604S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);

// Optional: Analytics (uncomment if you want usage tracking)
// import { getAnalytics } from 'firebase/analytics';
// const analytics = getAnalytics(app);

export default app;