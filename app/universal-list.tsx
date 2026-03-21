import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, collectionGroup } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function UniversalList() {
    const { title } = useLocalSearchParams();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let q;
        // Logic to switch database source based on which button was clicked
        if (title === "High Risk Tracking" || title === "High Risk Cases") {
            q = query(collectionGroup(db, "high_risk"), where("healthIssues", "==", "High Risk"));
        } else if (title === "Malnutrition Alerts") {
            q = query(collectionGroup(db, "high_risk"), where("malnutritionStatus", "==", "Flagged"));
        } else if (title === "Missed Vaccinations") {
            q = query(collection(db, "beneficiaries"), where("vaccinationStatus", "==", "Missed"));
        } else if (title === "ASHA Personnel") {
            q = query(collection(db, "users"), where("role", "==", "ASHA Worker"));
        } else {
            q = query(collection(db, "beneficiaries")); // Default fallback
        }

        const unsub = onSnapshot(q, (snap) => {
            const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(items);
            setLoading(false);
        });
        return unsub;
    }, [title]);

    const filtered = data.filter(item =>
        (item.name || item.firstName || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput style={{ flex: 1, marginLeft: 10 }} placeholder="Search records..." value={search} onChangeText={setSearch} />
            </View>
            {loading ? <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 50 }} /> : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card}>
                            <View>
                                <Text style={styles.name}>{item.name || `${item.firstName} ${item.lastName}`}</Text>
                                <Text style={styles.sub}>{item.houseId || item.userMobile || "ID: " + item.id}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#1F7A6B" />
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7F7' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: 50 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    searchBox: { flexDirection: 'row', backgroundColor: 'white', margin: 15, padding: 12, borderRadius: 10, elevation: 2 },
    card: { backgroundColor: 'white', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    sub: { fontSize: 13, color: '#666', marginTop: 3 }
});