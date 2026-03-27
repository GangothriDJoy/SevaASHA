import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function AttendanceRecords() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                // Fetch records ordered by date (newest first)
                const q = query(collection(db, "daily_attendance"), orderBy("date", "desc"));
                const snap = await getDocs(q);
                
                const list = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setRecords(list);
            } catch (error) {
                console.error("Error fetching attendance records:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, []);

    // Calculate attendance percentage color
    const getStatusColor = (present: number, total: number) => {
        if (!total || total === 0) return "#999";
        const percent = (present / total) * 100;
        if (percent >= 80) return "#2E7D32"; // Green (Good)
        if (percent >= 50) return "#F57C00"; // Orange (Warning)
        return "#D32F2F"; // Red (Poor)
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance History</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#1976D2" />
            ) : (
                <FlatList 
                    data={records} 
                    keyExtractor={i => i.id} 
                    contentContainerStyle={{ padding: 15 }} 
                    ListEmptyComponent={<Text style={styles.emptyText}>No attendance records found.</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.dateCircle}>
                                <Text style={styles.dateDay}>{item.date.split('-')[2]}</Text>
                                <Text style={styles.dateMonth}>{item.displayDate ? item.displayDate.split(' ')[2] : item.date.split('-')[1]}</Text>
                            </View>
                            
                            <View style={styles.infoContainer}>
                                <Text style={styles.fullDate}>{item.displayDate || item.date}</Text>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statText}>Present: <Text style={{ fontWeight: 'bold', color: '#333' }}>{item.presentCount}</Text></Text>
                                    <Text style={styles.statText}>Absent: <Text style={{ fontWeight: 'bold', color: '#333' }}>{(item.totalEnrolled || 0) - item.presentCount}</Text></Text>
                                </View>
                            </View>

                            <View style={styles.percentageContainer}>
                                <Text style={[styles.percentageText, { color: getStatusColor(item.presentCount, item.totalEnrolled) }]}>
                                    {item.totalEnrolled > 0 ? Math.round((item.presentCount / item.totalEnrolled) * 100) : 0}%
                                </Text>
                            </View>
                        </View>
                    )} 
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#1976D2', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    backBtn: { paddingRight: 15 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 15 },
    
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
    dateCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    dateDay: { fontSize: 20, fontWeight: 'bold', color: '#1565C0', lineHeight: 22 },
    dateMonth: { fontSize: 12, color: '#1976D2', fontWeight: '600', textTransform: 'uppercase' },
    
    infoContainer: { flex: 1 },
    fullDate: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statText: { fontSize: 13, color: '#666' },
    
    percentageContainer: { marginLeft: 10, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#EEE', alignItems: 'center', minWidth: 50 },
    percentageText: { fontSize: 18, fontWeight: '900' }
});