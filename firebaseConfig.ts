import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
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

// Declare variables that will be assigned during initialization
let app: FirebaseApp;
let auth: Auth;

if (getApps().length === 0) {
    // 1. Initialize the app for the first time
    app = initializeApp(firebaseConfig);

    // 2. Setup Auth Persistence
    if (Platform.OS !== 'web') {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage)
        });
    } else {
        auth = getAuth(app);
    }
} else {
    // 3. If already running (Hot Reload), use existing instances
    app = getApp();
    auth = getAuth(app);
}

// 4. Initialize Database once using the 'app' instance from above
const db = getFirestore(app, "default");

export { auth, db };
