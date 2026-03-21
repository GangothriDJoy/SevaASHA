import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Linking } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MaternalRegistry() {
    const [mothers, setMothers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        // Querying beneficiaries marked as 'Pregnant'
        const q = query(collection(db, "beneficiaries"), where("category", "==", "Pregnant"));
        const unsub = onSnapshot(q, (snap) => {
            setMothers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsub;
    }, []);

    const filtered = mothers.filter(m =>
        (m.firstName + " " + m.lastName).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Maternal Registry</Text>
            </View>

            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput placeholder="Search by name..." style={styles.input} value={search} onChangeText={setSearch} />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: "/userDetail", params: { userId: item.id } })}>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                            <Text style={styles.subText}>LMP: {item.lmpDate || 'Not Set'} • Age: {item.age || 'N/A'}</Text>
                            <View style={[styles.badge, { backgroundColor: item.riskStatus === 'High' ? '#FFEBEE' : '#E8F5E9' }]}>
                                <Text style={{ color: item.riskStatus === 'High' ? '#D32F2F' : '#2E7D32', fontSize: 12, fontWeight: 'bold' }}>
                                    {item.riskStatus === 'High' ? '⚠️ HIGH RISK' : '✅ STABLE'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.userMobile}`)}>
                            <Ionicons name="call" size={24} color="#1F7A6B" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 15 },
    searchBar: { flexDirection: 'row', backgroundColor: 'white', margin: 15, padding: 12, borderRadius: 10, elevation: 2, alignItems: 'center' },
    input: { flex: 1, marginLeft: 10 },
    card: { backgroundColor: 'white', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#1F7A6B' },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { color: '#666', fontSize: 13, marginTop: 4 },
    info: {
        flex: 1
    },
    workerInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, marginTop: 8 }
});