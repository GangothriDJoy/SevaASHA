import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Broadcast() {
    const router = useRouter();
    const [msg, setMsg] = useState('');
    const [target, setTarget] = useState('All');
    const [isSent, setIsSent] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(20));
        const unsub = onSnapshot(q, (snap) => {
            const list: any[] = [];
            snap.forEach(document => {
                list.push({ id: document.id, ...document.data() });
            });
            setHistory(list);
        });
        return unsub;
    }, []);

    const sendBroadcast = async () => {
        if (!msg.trim()) return;
        try {
            await addDoc(collection(db, "broadcasts"), {
                message: msg.trim(),
                target: target,
                createdAt: serverTimestamp(),
                sender: "Admin"
            });
            setIsSent(true);
            setMsg('');
            setTimeout(() => setIsSent(false), 3000);
        } catch (e) { Alert.alert("Error", "Failed to send."); }
    };

    const deleteBroadcast = (id: string) => {
        Alert.alert(
            "Delete Message",
            "Are you sure you want to permanently delete this broadcast? It will instantly disappear from all worker dashboards.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        await deleteDoc(doc(db, "broadcasts", id));
                    } catch (e) { Alert.alert("Error", "Failed to delete broadcast."); }
                }}
            ]
        );
    };

    const roles = ["All", "ASHA Worker", "Anganwadi Worker", "JPHN"];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Central Broadcast</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.label}>Select Target Audience:</Text>
                <View style={styles.roleContainer}>
                    {roles.map(r => (
                        <TouchableOpacity 
                            key={r} 
                            style={[styles.roleBtn, target === r && styles.roleBtnActive]}
                            onPress={() => setTarget(r)}
                        >
                            <Text style={[styles.roleText, target === r && styles.roleTextActive]}>
                                {r === 'All' ? 'All Workers' : r.replace(' Worker', '')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Message Body:</Text>
                <TextInput
                    multiline numberOfLines={5}
                    style={[styles.input, { color: '#333' }]}
                    placeholder="Enter urgent announcement or policy update..."
                    placeholderTextColor="#666"
                    value={msg} onChangeText={setMsg}
                />

                <TouchableOpacity 
                    style={[styles.btn, isSent && styles.btnSent]} 
                    onPress={sendBroadcast}
                    disabled={isSent || !msg.trim()}
                >
                    <Ionicons name={isSent ? "checkmark-circle" : "send"} size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>{isSent ? "Broadcast Sent" : "Send Alert"}</Text>
                </TouchableOpacity>

                <Text style={[styles.label, { marginTop: 30, marginBottom: 15 }]}>Recent Broadcasts History</Text>
                <FlatList
                    data={history}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={styles.historyCard}>
                            <View style={styles.historyHeader}>
                                <View style={styles.targetBadge}>
                                    <Text style={styles.targetBadgeText}>{item.target}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.timeText}>
                                        {item.createdAt ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                    </Text>
                                    <TouchableOpacity style={{ marginLeft: 15, padding: 4 }} onPress={() => deleteBroadcast(item.id)}>
                                        <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.historyMsg}>{item.message}</Text>
                        </View>
                    )}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7F7' },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D32F2F', padding: 20, paddingTop: 50 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20, flex: 1 },
    label: { fontWeight: 'bold', marginBottom: 10, color: '#333', fontSize: 16 },
    roleContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 10 },
    roleBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#E0E0E0', borderRadius: 20 },
    roleBtnActive: { backgroundColor: '#D32F2F' },
    roleText: { color: '#555', fontWeight: 'bold', fontSize: 13 },
    roleTextActive: { color: 'white' },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 10, textAlignVertical: 'top', elevation: 2, fontSize: 15 },
    btn: { flexDirection: 'row', backgroundColor: '#D32F2F', padding: 16, borderRadius: 10, marginTop: 20, alignItems: 'center', justifyContent: 'center', elevation: 3 },
    btnSent: { backgroundColor: '#2E7D32' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    historyCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    targetBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    targetBadgeText: { color: '#E65100', fontSize: 11, fontWeight: 'bold' },
    timeText: { color: '#888', fontSize: 12 },
    historyMsg: { color: '#444', fontSize: 14, lineHeight: 20 }
});