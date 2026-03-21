import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function WorkerManagement() {
    const [workers, setWorkers] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "ASHA Worker"));
        const unsub = onSnapshot(q, (snap) => {
            setWorkers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsub;
    }, []);

    const toggleStatus = async (workerId: string, currentStatus: string) => {
        const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
        try {
            await updateDoc(doc(db, "users", workerId), { status: newStatus });
            Alert.alert("Success", `Worker is now ${newStatus}`);
        } catch (e) {
            Alert.alert("Error", "Could not update status.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { backgroundColor: '#455A64' }]}>
                <Text style={styles.headerTitle}>ASHA Personnel</Text>
            </View>

            <FlatList
                data={workers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.workerInfo}>
                            <Ionicons name="person-circle" size={50} color="#455A64" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                                <Text style={styles.sub}>{item.block || 'Main Block'} • {item.userMobile}</Text>
                                <Text style={[styles.status, { color: item.status === 'Active' ? '#2E7D32' : '#D32F2F' }]}>
                                    ● {item.status || 'Active'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus(item.id, item.status)}>
                            <Ionicons name={item.status === 'Active' ? "close-circle" : "checkmark-circle"} size={28} color={item.status === 'Active' ? '#D32F2F' : '#2E7D32'} />
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7F7' },
    header: { padding: 20, paddingTop: 50 },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    card: { backgroundColor: 'white', margin: 10, padding: 15, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3 },
    workerInfo: { flexDirection: 'row', alignItems: 'center' },
    name: { fontSize: 17, fontWeight: 'bold', color: '#2C3E50' },
    sub: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
    status: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    actionBtn: { padding: 5 }
});