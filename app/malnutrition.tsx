import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function MalnutritionAlerts() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);

    const isLaptop = width > 768;

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
        else Alert.alert(title, message);
    };

    const fetchMalnutritionData = async () => {
        try {
            setLoading(true);
            // Querying vitals where status is flagged for malnutrition
            const q = query(
                collectionGroup(db, "high_risk"),
                where("malnutritionStatus", "==", "Flagged")
            );

            const querySnapshot = await getDocs(q);
            const list: any[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setAlerts(list);
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to load nutrition data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMalnutritionData(); }, []);

    const renderItem = ({ item }: any) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Ionicons name="nutrition" size={24} color="#8E44AD" />
                <Text style={styles.name}>{item.beneficiaryName || "Unknown Beneficiary"}</Text>
            </View>
            <View style={styles.details}>
                <Text style={styles.detailText}>Weight: {item.weight}kg {item.height ? `• Height: ${item.height}cm` : ''}</Text>
                <Text style={[styles.detailText, { fontWeight: 'bold', color: '#8E44AD' }]}>
                    Status: Malnutrition Alert {item.bmi ? `(BMI: ${item.bmi})` : ''}
                </Text>
                <Text style={styles.subText}>Recorded by: {item.recordedBy}</Text>
                <Text style={styles.subText}>Date: {item.recordedAt?.seconds ? new Date(item.recordedAt.seconds * 1000).toLocaleDateString() : "Recent"}</Text>
            </View>
            <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => showAlert("Action Taken", "ASHA worker has been notified to provide extra nutrition supplements.")}
            >
                <Text style={styles.actionBtnText}>Assign Follow-up</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.content, isLaptop && styles.laptopContent]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={28} color="#8E44AD" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Malnutrition Alerts</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#8E44AD" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={alerts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={<Text style={styles.empty}>No malnutrition cases reported.</Text>}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop:15, flex: 1, backgroundColor: '#F4F6F8', alignItems: 'center' },
    content: { flex: 1, width: '100%', padding: 15 },
    laptopContent: { maxWidth: 800 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: Platform.OS === 'ios' ? 40 : 10 },
    title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15, color: '#8E44AD' },
    card: { backgroundColor: 'white',  padding: 15, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    name: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, color: '#333' },
    details: { marginBottom: 15 },
    detailText: { fontSize: 14, color: '#555', marginBottom: 3 },
    subText: { fontSize: 12, color: '#999' },
    actionBtn: { backgroundColor: '#8E44AD', padding: 10, borderRadius: 8, alignItems: 'center' },
    actionBtnText: { color: 'white', fontWeight: 'bold' },
    empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});