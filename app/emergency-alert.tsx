import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function EmergencyAlert() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const workerMobile = String(params.mobile || "Unknown").trim();

    // Laptop & Mobile compatible alert helper
    const showAlert = (title: string, message: string, onOk?: () => void) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}: ${message}`);
            if (onOk) onOk();
        } else {
            Alert.alert(title, message, onOk ? [{ text: "OK", onPress: onOk }] : []);
        }
    };

    const triggerSOS = async () => {
        setLoading(true);
        let location: Location.LocationObject | null = null;

        try {
            // 1. Request Permissions
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission Denied', 'Location access is required for SOS.');
                setLoading(false);
                return;
            }

            // 2. Check if GPS is enabled (use hasServicesEnabledAsync)
            const enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                showAlert('Location Disabled', 'Please turn on your Phone GPS/Location services to send an SOS.');
                setLoading(false);
                return;
            }

            // 3. Get Location
            try {
                location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
            } catch (error) {
                // Fallback for laptops/indoor use
                location = await Location.getLastKnownPositionAsync();
                if (!location) {
                    showAlert("Error", "Could not determine your location. Try moving near a window or check internet.");
                    setLoading(false);
                    return;
                }
            }

            // 4. Save to Firestore
            await addDoc(collection(db, "emergency"), {
                workerId: workerMobile,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                timestamp: serverTimestamp(),
                status: "UNRESOLVED",
                type: "Medical Emergency"
            });

            // 5. Success Message (Now using showAlert for laptop compatibility)
            showAlert("SOS SENT", "Supervisor and nearby centers have been alerted.", () => router.back());

        } catch (error) {
            console.error(error);
            showAlert("SOS Failed", "Check your internet connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
                <Ionicons name="close" size={32} color="black" />
            </TouchableOpacity>

            <View style={styles.center}>
                <Ionicons name="alert-circle" size={100} color="#D32F2F" />
                <Text style={styles.title}>Emergency SOS</Text>
                <Text style={styles.desc}>This will send your current location to the supervisor and request immediate aid.</Text>

                <TouchableOpacity
                    style={[styles.sosButton, loading && { backgroundColor: '#ccc' }]}
                    onPress={triggerSOS}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.sosText}>SEND SOS NOW</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white', padding: 20 },
    back: { marginTop: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#D32F2F', marginTop: 20 },
    desc: { textAlign: 'center', color: '#666', marginTop: 15, marginBottom: 40, fontSize: 16 },
    sosButton: { backgroundColor: '#D32F2F', width: '100%', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 5 },
    sosText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});