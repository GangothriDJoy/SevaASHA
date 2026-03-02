import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collectionGroup, query, where, getDocs, orderBy } from "firebase/firestore";

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
            // collectionGroup allows us to find all 'vitals' entries across all patients
            const vitalsQuery = query(
                collectionGroup(db, "vitals"),
                orderBy("recordedAt", "desc")
            );

            const querySnapshot = await getDocs(vitalsQuery);
            const visitData: any[] = [];

            querySnapshot.forEach((doc) => {
                visitData.push({ id: doc.id, ...doc.data() });
            });

            setLogs(visitData);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Visit Log</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No visits recorded yet.</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.logCard}>
                            <View style={styles.dateBadge}>
                                <Text style={styles.dateText}>{formatDate(item.recordedAt)}</Text>
                            </View>
                            <View style={styles.logInfo}>
                                <Text style={styles.logTitle}>Health Checkup Completed</Text>
                                <Text style={styles.logDetails}>BP: {item.bloodPressure} | Weight: {item.weight}kg</Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
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
    logCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    dateBadge: { backgroundColor: '#E0F2F1', padding: 8, borderRadius: 8, marginRight: 15 },
    dateText: { color: '#1F7A6B', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
    logInfo: { flex: 1 },
    logTitle: { fontWeight: 'bold', fontSize: 15, color: '#333' },
    logDetails: { color: '#666', fontSize: 13, marginTop: 4 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#999' }
});