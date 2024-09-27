// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // Add this import

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCh5oZ-WBNqNHsQtfDC5m8ZP5XTImS7MMY",
  authDomain: "dailydude-40c21.firebaseapp.com",
  projectId: "dailydude-40c21",
  storageBucket: "dailydude-40c21.appspot.com",
  messagingSenderId: "691813705913",
  appId: "1:691813705913:web:65c54df1caa36837d01368",
  measurementId: "G-31RPJ5M9QC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Add this line to initialize and export storage

// Add this line to check if Firebase is initialized correctly
console.log('Firebase initialized with project:', app.options.projectId);
