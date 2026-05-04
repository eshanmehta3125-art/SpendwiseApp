import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcZXYKmYNxYeyDznEvqpDu34aYf44w4-U",
  authDomain: "spendwise-e8edc.firebaseapp.com",
  projectId: "spendwise-e8edc",
  storageBucket: "spendwise-e8edc.firebasestorage.app",
  messagingSenderId: "681356287684",
  appId: "1:681356287684:web:182e40b4604bef2be1b391"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
// We use AsyncStorage for React Native to ensure users stay logged in
const authOptions = {
  persistence: Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(AsyncStorage)
};

if (Platform.OS === 'web') {
  authOptions.popupRedirectResolver = browserPopupRedirectResolver;
}

const auth = initializeAuth(app, authOptions);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
