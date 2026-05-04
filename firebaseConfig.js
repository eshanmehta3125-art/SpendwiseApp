import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
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
