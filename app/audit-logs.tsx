import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, FlatList, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, onSnapshot, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return `Just now`;
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return `Yesterday`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
};

const getIconConfig = (type: string) => {
    switch (type) {
        case 'CREATE': return { name: 'document-text', color: '#1976D2', bgColor: '#E3F2FD' };
        case 'EXPORT': return { name: 'download', color: '#5E35B1', bgColor: '#EDE7F6' };
        case 'RESOLVE': return { name: 'checkmark-circle', color: '#388E3C', bgColor: '#E8F5E9' };
        case 'ALERT': return { name: 'warning', color: '#D32F2F', bgColor: '#FFEBEE' };
        case 'UPDATE': return { name: 'add-circle', color: '#F57C00', bgColor: '#FFF3E0' };
        case 'LOGIN': return { name: 'log-in', color: '#616161', bgColor: '#F5F5F5' };
        default: return { name: 'ellipse', color: '#9E9E9E', bgColor: '#EEEEEE' };
    }
};

export default function AuditLogs() {
    const router = useRouter();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const clearAllLogs = async () => {
        Alert.alert(
            "Clear All Logs",
            "Are you sure you want to delete all audit logs? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const snapshot = await getDocs(collection(db, "audit_logs"));
                            const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, "audit_logs", document.id)));
                            await Promise.all(deletePromises);
                            setLoading(false);
                            Alert.alert("Success", "All audit logs have been cleared.");
                        } catch (error) {
                            console.error("Wipe failed:", error);
                            setLoading(false);
                            Alert.alert("Error", "Failed to clear logs. Please try again.");
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    useEffect(() => {
        const q = query(
            collection(db, "audit_logs"),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(doc => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setLogs(list);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const iconConfig = getIconConfig(item.type);
        const isLast = index === logs.length - 1;

        return (
            <View style={styles.timelineRow}>
                {/* Timeline Line & Node */}
                <View style={styles.timelineGraphic}>
                    <View style={[styles.timelineNode, { backgroundColor: iconConfig.color }]} />
                    {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* Log Card */}
                <View style={styles.card}>
                    <View style={[styles.iconBox, { backgroundColor: iconConfig.bgColor }]}>
                        <Ionicons name={iconConfig.name as any} size={22} color={iconConfig.color} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.logText}>
                            <Text style={styles.boldText}>{item.userRole} {item.userName}</Text> {item.actionText}
                        </Text>
                        <Text style={styles.timeText}>{getRelativeTime(item.timestamp)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ paddingRight: 15, zIndex: 10 }}>
                    <Ionicons name="arrow-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Audit Trail</Text>
                
                <TouchableOpacity onPress={clearAllLogs} style={{ marginLeft: 'auto', paddingRight: 10 }}>
                    <Ionicons name="trash-outline" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.container}>
                <View style={styles.filterHeader}>
                    <Text style={styles.filterText}>Showing logs for: Last 24 Hours</Text>
                    <TouchableOpacity>
                        <Ionicons name="filter" size={20} color="#555" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={logs}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No securely tracked audit sequences discovered in this timeframe.</Text>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#1F7A6B' }, 
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginLeft: 15 },
    
    container: { flex: 1, backgroundColor: '#F8F9FA', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    
    filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 25, paddingBottom: 15 },
    filterText: { fontSize: 14, fontWeight: 'bold', color: '#555' },
    
    listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
    
    timelineRow: { flexDirection: 'row' },
    timelineGraphic: { width: 40, alignItems: 'center', overflow: 'visible' },
    timelineNode: { width: 14, height: 14, borderRadius: 7, marginTop: 30, zIndex: 10, borderWidth: 3, borderColor: '#F8F9FA' },
    timelineLine: { width: 2, flex: 1, backgroundColor: '#E0E0E0', marginTop: -14, marginBottom: -30, zIndex: 1 },
    
    card: { flex: 1, flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 15, marginLeft: 5, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, alignItems: 'center' },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    
    cardContent: { flex: 1, justifyContent: 'center' },
    logText: { fontSize: 15, color: '#444', lineHeight: 22 },
    boldText: { fontWeight: 'bold', color: '#111' },
    timeText: { fontSize: 12, color: '#888', marginTop: 6, fontWeight: '600' },
    
    emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15, paddingHorizontal: 20 }
});
