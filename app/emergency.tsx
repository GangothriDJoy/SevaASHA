import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Linking, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';

export default function SupervisorEmergencies() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);

    const isLaptop = width > 768;

    const fetchEmergencies = async () => {
        try {
            setLoading(true);
            // Fetch unresolved emergencies sorted by newest first
            const q = query(
                collection(db, "emergency"),
                where("status", "==", "UNRESOLVED")
            );
            const querySnapshot = await getDocs(q);
            const list: any[] = [];
            querySnapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Sort manually if index isn't ready yet
            list.sort((a, b) => (b.recordedAt?.seconds || 0) - (a.recordedAt?.seconds || 0));
            setAlerts(list);
        } catch (error) {
            console.error("Error fetching emergencies:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEmergencies(); }, []);

    const openMap = (lat: number, lng: number) => {
        const url = Platform.select({
            ios: `maps:0,0?q=${lat},${lng}`,
            android: `geo:0,0?q=${lat},${lng}`,
            web: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        });
        if (url) Linking.openURL(url);
    };

    const resolveEmergency = async (id: string) => {
        try {
            const docRef = doc(db, "emergency", id);
            await updateDoc(docRef, { status: "RESOLVED" });
            setAlerts(prev => prev.filter(item => item.id !== id));
            if (Platform.OS === 'web') window.alert("Emergency marked as resolved.");
        } catch (error) {
            console.error(error);
        }
    };

    const renderItem = ({ item }: any) => (
        <View style={styles.emergencyCard}>
            <View style={styles.cardHeader}>
                <View style={styles.pulseContainer}>
                    <View style={styles.pulse} />
                </View>
                <Text style={styles.workerName}>Worker ID: {item.workerId}</Text>
                <Text style={styles.timeText}>
                    {item.recordedAt?.toDate().toLocaleTimeString() || "Just now"}
                </Text>
            </View>

            <Text style={styles.typeText}>{item.type || "Medical Emergency"}</Text>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.btn, styles.mapBtn]}
                    onPress={() => openMap(item.latitude, item.longitude)}
                >
                    <Ionicons name="map" size={18} color="white" />
                    <Text style={styles.btnText}>View Location</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.btn, styles.resolveBtn]}
                    onPress={() => resolveEmergency(item.id)}
                >
                    <Ionicons name="checkmark-circle" size={18} color="white" />
                    <Text style={styles.btnText}>Mark Resolved</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.content, isLaptop && styles.laptopContent]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={28} color="#D32F2F" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Emergency Control Center</Text>
                    <TouchableOpacity onPress={fetchEmergencies}>
                        <Ionicons name="refresh" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#D32F2F" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={alerts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="shield-checkmark" size={60} color="#27ae60" />
                                <Text style={styles.emptyText}>All Clear. No active emergencies.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FEF2F2', alignItems: 'center' , marginTop: 15},
    content: { flex: 1, width: '100%', padding: 15 },
    laptopContent: { maxWidth: 1000 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingTop: 10 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#D32F2F' },
    emergencyCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 15, borderLeftWidth: 8, borderLeftColor: '#D32F2F', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    workerName: { fontWeight: 'bold', fontSize: 16, flex: 1, marginLeft: 10 },
    timeText: { color: '#666', fontSize: 12 },
    typeText: { fontSize: 18, color: '#333', marginBottom: 20, fontWeight: '500' },

    pulseContainer: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
    pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D32F2F' },

    actionRow: { flexDirection: 'row', gap: 10 },
    btn: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    mapBtn: { backgroundColor: '#1F7A6B' },
    resolveBtn: { backgroundColor: '#27ae60' },
    btnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },

    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, fontSize: 18, color: '#27ae60', fontWeight: '600' }
});