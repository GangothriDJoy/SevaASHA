import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator } from 'react-native';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import firebase from "firebase/compat/app";
import app = firebase.app;
import { terminate, clearIndexedDbPersistence } from "firebase/firestore";

export default function ForgotPassword() {
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSendReset = async () => {
        if (mobile.length < 10) {
            const msg = "Please enter a valid 10-digit mobile number.";
            Platform.OS === 'web' ? alert(msg) : Alert.alert("Invalid Input", msg);
            return;
        }

        setLoading(true);
        const db = getFirestore( "default");

        try {
            console.log("Attempting to reach Firestore project: sevaasha-af74c");
            const collections = ["users", "beneficiaries"];
            let userExists = false;
            for (const col of collections) {
                console.log(`Searching for ${mobile} in ${col}...`);
                const q = query(collection(db, col), where("mobile", "==", mobile));
                const querySnapshot = await getDocs(q);
                console.log(`Found ${querySnapshot.size} documents in ${col}`);
                if (!querySnapshot.empty) {
                    userExists = true;
                    break;
                }
            }
            if (!userExists) {
                const msg = "Phone number not registered. Please register as a new user or login with another mobile number.";
                Platform.OS === 'web' ? alert(msg) : Alert.alert("Not Found", msg);
                setLoading(false);
                return;
            }
            const auth = getAuth();
            const authEmail = `${mobile}@sevaasha.com`;
            await sendPasswordResetEmail(auth, authEmail);

            const successMsg = "A password reset link has been sent to your registered mobile number and work email.";
            if (Platform.OS === 'web') {
                alert(successMsg);
                router.back();
            } else {
                Alert.alert("Success", successMsg, [{ text: "OK", onPress: () => router.back() }]);
            }
        } catch (error: any) {
            console.log("Connection failed entirely:", error);
            console.error("Forgot Password Error:", error);
            const errorMsg = "Number not found or error sending email. Please try again.";
            Platform.OS === 'web' ? alert(errorMsg) : Alert.alert("Error", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your registered mobile to receive a reset link.</Text>

            <TextInput
                style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                placeholder="Mobile Number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={(val) => setMobile(val.replace(/[^0-9]/g, ''))}
                maxLength={10}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleSendReset}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                <Text style={styles.backLink}>Back to Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 30, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 30 },
    input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 15, fontSize: 16, marginBottom: 20 },
    button: { height: 50, backgroundColor: '#2E7D32', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    backLink: { color: '#007AFF', textAlign: 'center', fontWeight: '500' }
});
