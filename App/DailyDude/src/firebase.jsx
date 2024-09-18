// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // Add this import

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBi0Nucmk6Kw530UBVCd0uA9edAg-uuLHA",
  authDomain: "dailydude-30ca7.firebaseapp.com",
  projectId: "dailydude-30ca7",
  storageBucket: "dailydude-30ca7.appspot.com",
  messagingSenderId: "863507486470",
  appId: "1:863507486470:web:091b7d9263d33e1dda3087"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Add this line to initialize and export storage

// Add this line to check if Firebase is initialized correctly
console.log('Firebase initialized with project:', app.options.projectId);