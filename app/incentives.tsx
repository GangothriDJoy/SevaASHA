import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collectionGroup, query, where, getDocs } from "firebase/firestore";

export default function Incentives() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [loading, setLoading] = useState(true);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [visitCount, setVisitCount] = useState(0);
    const [history, setHistory] = useState<any[]>([]);

    const RATE_PER_VISIT = 250; // Example incentive amount

    useEffect(() => {
        if (workerMobile) {
            calculateIncentives();
        }
    }, [workerMobile]);

    const calculateIncentives = async () => {
        try {
            setLoading(true);
            // Query all health entries across all beneficiaries
            const q = query(
                collectionGroup(db, "vitals"),
                where("recordedBy", "==", workerMobile)
            );

            const querySnapshot = await getDocs(q);
            const data: any[] = [];

            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });

            setVisitCount(data.length);
            setTotalEarnings(data.length * RATE_PER_VISIT);
            setHistory(data);
        } catch (error) {
            console.error("Incentive Error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>My Incentives</Text>
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Earnings</Text>
                <Text style={styles.amount}>₹{totalEarnings}</Text>
                <View style={styles.divider} />
                <Text style={styles.subText}>Total Validated Visits: {visitCount}</Text>
            </View>

            <Text style={styles.sectionTitle}>Earnings History</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#1F7A6B" />
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.historyItem}>
                            <View>
                                <Text style={styles.patientName}>{item.patientName || "Beneficiary Visit"}</Text>
                                <Text style={styles.dateText}>
                                    {item.recordedAt?.toDate().toLocaleDateString() || "Recent"}
                                </Text>
                            </View>
                            <Text style={styles.itemAmount}>+ ₹{RATE_PER_VISIT}</Text>
                        </View>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 15 },
    summaryCard: { backgroundColor: "#1F7A6B", margin: 20, padding: 30, borderRadius: 20, alignItems: 'center', elevation: 5 },
    summaryLabel: { color: "rgba(255,255,255,0.8)", fontSize: 16 },
    amount: { color: "white", fontSize: 42, fontWeight: "bold", marginVertical: 10 },
    divider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", width: '100%', marginVertical: 15 },
    subText: { color: "white", fontWeight: "500" },
    sectionTitle: { fontSize: 18, fontWeight: "bold", margin: 20, color: "#333" },
    historyItem: { backgroundColor: "white", padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    patientName: { fontWeight: "bold", fontSize: 16 },
    dateText: { color: "#666", fontSize: 12 },
    itemAmount: { color: "#4CAF50", fontWeight: "bold", fontSize: 16 }
});