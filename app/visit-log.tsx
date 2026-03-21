import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, getDocs, orderBy, collectionGroup, where } from "firebase/firestore";

export default function VisitLog() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (workerMobile) {
            fetchVisitLogs();
        }
    }, [workerMobile]);

    const fetchVisitLogs = async () => {
        try {
            setLoading(true);
            const visitData: any[] = [];

            // 1. Fetch Household Visits (The "Mark as Visited" logs)
            const householdQuery = query(
                collection(db, "household_visits"),
                where("workerId", "==", workerMobile),
                orderBy("createdAt", "desc")
            );
            
            try {
                const householdSnap = await getDocs(householdQuery);
                householdSnap.forEach((doc) => {
                    const data = doc.data();
                    visitData.push({
                        id: doc.id,
                        title: data.patientName || `House: ${data.houseId}`,
                        subtitle: data.visitType || "Routine Visit",
                        timestamp: data.createdAt,
                        type: 'visit'
                    });
                });
            } catch (hhError) {
                // Failsafe fallback incase workerId index doesn't exist
                const householdQueryUnfiltered = query(
                    collection(db, "household_visits"),
                    orderBy("createdAt", "desc")
                );
                const householdSnapUnfil = await getDocs(householdQueryUnfiltered);
                householdSnapUnfil.forEach((doc) => {
                    const data = doc.data();
                    // Fallback software filter
                    if (data.workerId === workerMobile || !data.workerId) {
                        visitData.push({
                            id: doc.id,
                            title: data.patientName || `House: ${data.houseId}`,
                            subtitle: data.visitType || "Routine Visit",
                            timestamp: data.createdAt,
                            type: 'visit'
                        });
                    }
                });
            }

            // 2. Fetch Vitals Entries (Specific health checkups)
            const vitalsQuery = query(
                collectionGroup(db, "vitals"),
                orderBy("recordedAt", "desc")
            );
            const vitalsSnapshot = await getDocs(vitalsQuery);

            vitalsSnapshot.forEach((doc) => {
                const data = doc.data();
                visitData.push({
                    id: doc.id,
                    title: data.patientName || "Health Checkup",
                    subtitle: `BP: ${data.bloodPressure} | Sugar: ${data.sugarLevel}`,
                    timestamp: data.recordedAt,
                    type: 'health'
                });
            });

            // Sort everything by time (newest first)
            visitData.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                return timeB - timeA;
            });

            setLogs(visitData);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "N/A";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Visit History</Text>
                <TouchableOpacity onPress={fetchVisitLogs} style={{ marginLeft: 'auto' }}>
                    <Ionicons name="refresh" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={styles.loadingText}>Fetching logs...</Text>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No visits recorded yet.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.logCard}>
                            <View style={styles.dateBadge}>
                                <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
                            </View>
                            <View style={styles.logInfo}>
                                <Text style={styles.logTitle}>{item.title}</Text>
                                <Text style={styles.logDetails}>{item.subtitle}</Text>
                            </View>
                            <View style={[styles.typeIcon, { backgroundColor: item.type === 'health' ? '#E3F2FD' : '#E8F5E9' }]}>
                                <Ionicons
                                    name={item.type === 'health' ? "fitness" : "home"}
                                    size={18}
                                    color={item.type === 'health' ? "#1976D2" : "#2E7D32"}
                                />
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#666' },
    logCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#eee' },
    dateBadge: { backgroundColor: '#F0F4F3', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginRight: 15, alignItems: 'center', minWidth: 60 },
    dateText: { color: '#1F7A6B', fontWeight: 'bold', fontSize: 13 },
    logInfo: { flex: 1 },
    logTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    logDetails: { color: '#666', fontSize: 13, marginTop: 4 },
    typeIcon: { padding: 8, borderRadius: 20 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { textAlign: 'center', marginTop: 15, color: '#999', fontSize: 16 }
});