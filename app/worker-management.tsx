import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function WorkerManagement() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('ASHA Worker');
    const router = useRouter();

    const tabs = ['ASHA Worker', 'Anganwadi Worker', 'JPHN'];

    useEffect(() => {
        const q = query(
            collection(db, "users"), 
            where("role", "in", ["ASHA Worker", "Anganwadi Worker", "JPHN"])
        );
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

    const filteredWorkers = workers.filter(w => w.role === activeTab);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { backgroundColor: '#1F7A6B' }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Worker Management</Text>
            </View>

            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {tabs.map((tab) => (
                        <TouchableOpacity 
                            key={tab} 
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredWorkers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>No {activeTab}s found.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.workerInfo}>
                            <Ionicons name="person-circle" size={50} color={activeTab === 'ASHA Worker' ? '#E67E22' : activeTab === 'JPHN' ? '#2980B9' : '#8E44AD'} />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={styles.name}>{item.fullName || item.name || item.firstName + ' ' + item.lastName}</Text>
                                <Text style={styles.sub}>{item.assignedBlock || item.district || 'Main Block'} • Contact: {item.mobile || item.userMobile || '--'}</Text>
                                
                                {item.role === 'ASHA Worker' && item.jphnsupervisorName ? (
                                    <Text style={styles.subJphn}>JPHN Supervisor: {item.jphnsupervisorName}</Text>
                                ) : null}

                                <Text style={[styles.status, { color: item.status === 'Active' || item.status === 'Approved' ? '#2E7D32' : '#D32F2F' }]}>
                                    ● {item.status || 'Active'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus(item.id, item.status || 'Active')}>
                            <Ionicons name={item.status === 'Active' || item.status === 'Approved' ? "close-circle" : "checkmark-circle"} size={28} color={item.status === 'Active' || item.status === 'Approved' ? '#D32F2F' : '#2E7D32'} />
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7F7' },
    header: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    tabContainer: { flexDirection: 'row', padding: 10, paddingLeft: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: 'white' },
    tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F0F0F0', marginRight: 10 },
    activeTab: { backgroundColor: '#1F7A6B' },
    tabText: { color: '#555', fontWeight: 'bold' },
    activeTabText: { color: 'white' },
    card: { backgroundColor: 'white', margin: 10, padding: 15, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
    workerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    name: { fontSize: 17, fontWeight: 'bold', color: '#2C3E50' },
    sub: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
    subJphn: { fontSize: 12, color: '#E67E22', marginTop: 2, fontWeight: '600' },
    status: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    actionBtn: { padding: 5 }
});