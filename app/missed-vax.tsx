import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function MissedVaccinations() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState<any[]>([]);

    const isLaptop = width > 768;

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
        else Alert.alert(title, message);
    };

    const fetchMissedVax = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, "beneficiaries"),
                where("vaccinationStatus", "==", "Missed")
            );
            const querySnapshot = await getDocs(q);
            const items: any[] = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setList(items);
        } catch (error) {
            console.error(error);
            showAlert("Error", "Could not load vaccination records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMissedVax(); }, []);

    const renderItem = ({ item }: any) => (
        <View style={styles.card}>
            <View style={styles.row}>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.subText}>Parent: {item.parentName} • Age: {item.age}</Text>
                    <View style={styles.vaxBadge}>
                        <Text style={styles.vaxText}>Pending: {item.pendingVaccine || "General Course"}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => showAlert("Calling", `Dialing ${item.mobile}...`)}
                >
                    <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.content, isLaptop && styles.laptopContent]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={28} color="#2980B9" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Missed Vaccinations</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#2980B9" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={list}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        ListEmptyComponent={<Text style={styles.empty}>Great! No missed vaccinations found.</Text>}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 15, flex: 1, backgroundColor: '#F4F6F8', alignItems: 'center' },
    content: { flex: 1, width: '100%', padding: 15 },
    laptopContent: { maxWidth: 800 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: Platform.OS === 'ios' ? 40 : 10 },
    title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15, color: '#2980B9' },
    card: { backgroundColor: 'white',  padding: 15, marginBottom: 10, elevation: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    info: { flex: 1 },
    name: { fontSize: 17, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 13, color: '#666', marginTop: 3 },
    vaxBadge: { backgroundColor: '#E1F5FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 },
    vaxText: { color: '#0288D1', fontSize: 11, fontWeight: 'bold' },
    callBtn: { backgroundColor: '#27ae60', padding: 12, borderRadius: 25 },
    empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});