import {initializeApp, getApps, getApp, FirebaseApp} from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { Auth, initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyBWKd84yPBDnS20JN6RLQhkmz70_BySI-k",
    authDomain: "sevaasha-af74c.firebaseapp.com",
    projectId: "sevaasha-af74c",
    storageBucket: "sevaasha-af74c.firebasestorage.app",
    messagingSenderId: "195242114413",
    appId: "1:195242114413:web:eafbcff75e152f66f9ee64",
    measurementId: "G-52RNQL95D6"
};

// 1. HOT RELOAD FIX: Check if Firebase is already running
let app: FirebaseApp;
let auth: Auth;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);

    // Use React Native persistence ONLY on mobile devices
    if (Platform.OS !== 'web') {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage)
        });
    } else {
        // Use standard browser persistence for Web
        auth = getAuth(app);
    }
} else {
    app = getApp();
    auth = getAuth(app);
}

// 2. Initialize Database
const db = getFirestore(app, "default");

export { auth, db };
