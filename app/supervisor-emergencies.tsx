import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

export default function MemberProfile() {
    const { memberId, name } = useLocalSearchParams();
    const router = useRouter();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (memberId) {
            fetchHealthHistory();
        }
    }, [memberId]);

    const fetchHealthHistory = async () => {
        try {
            const q = query(
                collection(db, "health_records"),
                where("beneficiaryId", "==", memberId),
                orderBy("timestamp", "desc")
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHistory(list);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskStatus = (type: string, value: string) => {
        if (!value || value === "N/A") return false;
        if (type === 'sugar') return parseInt(value) > 140;
        if (type === 'bp') return parseInt(value.split('/')[0]) > 140;
        return false;
    };

    const referToJPHN = (item: any) => {
        const message = `🚨 HIGH RISK ALERT\nPatient: ${name}\nBP: ${item.bp || 'N/A'}\nSugar: ${item.bloodSugar || 'N/A'} mg/dL\nPlease review.`;
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
        Linking.canOpenURL(url).then(supp => supp ? Linking.openURL(url) : Alert.alert("Error", "WhatsApp not found"));
    };

    const getTrend = () => {
        if (history.length < 2) return null;
        const latest = parseInt(history[0].bloodSugar);
        const previous = parseInt(history[1].bloodSugar);
        if (isNaN(latest) || isNaN(previous)) return null;
        const diff = latest - previous;
        if (diff > 10) return { text: `Rising (+${diff})`, color: "#FFCDD2", textColor: "#B71C1C", icon: "trending-up" };
        if (diff < -10) return { text: `Improving (${diff})`, color: "#C8E6C9", textColor: "#1B5E20", icon: "trending-down" };
        return { text: "Stable", color: "#E0F2F1", textColor: "#004D40", icon: "remove" };
    };

    const getMonthlyStats = () => {
        const now = new Date();
        return history.filter(item => {
            const d = item.timestamp?.toDate();
            return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerText}>{name}</Text>
                    <Text style={styles.subHeaderText}>Health History</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => router.push({ pathname: "/health-entry", params: { memberId, name } })}>
                    <Ionicons name="add-circle" size={30} color="white" />
                </TouchableOpacity>
            </View>

            {!loading && history.length > 0 && (
                <View style={styles.summarySection}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryHeader}>
                            <Ionicons name="pulse" size={20} color="white" />
                            <Text style={styles.summaryTitle}>LATEST HEALTH SNAPSHOT</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}><Text style={styles.summaryLabel}>BP</Text><Text style={styles.summaryValue}>{history[0].bp || "N/A"}</Text></View>
                            <View style={styles.summaryItem}><Text style={styles.summaryLabel}>SUGAR</Text><Text style={styles.summaryValue}>{history[0].bloodSugar || "N/A"}</Text></View>
                            <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Hb</Text><Text style={styles.summaryValue}>{history[0].hemoglobin || "N/A"}</Text></View>
                        </View>
                        <Text style={styles.summaryDate}>Last checked: {history[0].timestamp?.toDate().toLocaleDateString()}</Text>

                        {/* Trend Bar */}
                        {(() => {
                            const trend = getTrend();
                            return trend ? (
                                <View style={[styles.trendBar, { backgroundColor: trend.color }]}>
                                    <Ionicons name={trend.icon as any} size={14} color={trend.textColor} />
                                    <Text style={[styles.trendText, { color: trend.textColor }]}>Sugar Trend: {trend.text}</Text>
                                </View>
                            ) : null;
                        })()}

                        {/* Monthly Incentive Bar */}
                        <View style={styles.incentiveBar}>
                            <Ionicons name="stats-chart" size={14} color="#B2DFDB" />
                            <Text style={styles.incentiveText}>Visits this month: <Text style={{fontWeight: 'bold'}}>{getMonthlyStats()}</Text> (Pending Claim)</Text>
                        </View>
                    </View>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={<Text style={styles.empty}>No health records found.</Text>}
                    renderItem={({ item }) => {
                        const isHighSugar = getRiskStatus('sugar', item.bloodSugar);
                        const isHighBP = getRiskStatus('bp', item.bp);
                        const isEmergency = isHighSugar || isHighBP;
                        return (
                            <View style={[styles.historyCard, isEmergency && { borderLeftColor: '#D32F2F', backgroundColor: '#FFF5F5', elevation: 5 }]}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name={isEmergency ? "alert-circle" : "calendar-outline"} size={16} color={isEmergency ? "#D32F2F" : "#1F7A6B"} />
                                    <Text style={[styles.date, isEmergency && { color: '#D32F2F' }]}>{item.timestamp?.toDate().toLocaleDateString()} {isEmergency && "- HIGH RISK"}</Text>
                                </View>
                                <View style={styles.dataGrid}>
                                    <View style={styles.dataItem}><Text style={styles.label}>BP</Text><Text style={[styles.value, isHighBP && { color: '#D32F2F' }]}>{item.bp || "N/A"}</Text></View>
                                    <View style={styles.dataItem}><Text style={styles.label}>Sugar</Text><Text style={[styles.value, isHighSugar && { color: '#D32F2F' }]}>{item.bloodSugar || "N/A"} mg/dL</Text></View>
                                    <View style={styles.dataItem}><Text style={styles.label}>Weight</Text><Text style={styles.value}>{item.weight} kg</Text></View>
                                    <View style={styles.dataItem}><Text style={styles.label}>Hb</Text><Text style={styles.value}>{item.hemoglobin} g/dL</Text></View>
                                </View>
                                {isEmergency && (
                                    <TouchableOpacity style={styles.referButton} onPress={() => referToJPHN(item)}>
                                        <Ionicons name="logo-whatsapp" size={18} color="white" />
                                        <Text style={styles.referText}>REFER TO JPHN (WHATSAPP)</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 18, fontWeight: "bold", marginLeft: 15 },
    subHeaderText: { color: "#B2DFDB", fontSize: 12, marginLeft: 15 },
    addButton: { padding: 5 },
    summarySection: { padding: 20, paddingBottom: 0 },
    summaryCard: { backgroundColor: "#00695C", padding: 15, borderRadius: 15, elevation: 4 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.3)', paddingBottom: 5 },
    summaryTitle: { color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 8 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
    summaryItem: { alignItems: 'center' },
    summaryLabel: { color: '#B2DFDB', fontSize: 10, fontWeight: 'bold' },
    summaryValue: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    summaryDate: { color: 'white', fontSize: 10, fontStyle: 'italic', textAlign: 'right', opacity: 0.8 },
    trendBar: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, marginTop: 10, justifyContent: 'center' },
    trendText: { fontSize: 11, fontWeight: 'bold', marginLeft: 5 },
    incentiveBar: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    incentiveText: { color: 'white', fontSize: 11, marginLeft: 6, opacity: 0.9 },
    historyCard: { backgroundColor: "white", padding: 15, borderRadius: 12, marginBottom: 12, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#1F7A6B' },
    referButton: { backgroundColor: "#D32F2F", flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, marginTop: 15 },
    referText: { color: "white", fontWeight: "bold", fontSize: 12, marginLeft: 8 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
    date: { fontWeight: "bold", color: "#1F7A6B", marginLeft: 8 },
    dataGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    dataItem: { width: '48%', marginBottom: 10 },
    label: { fontSize: 12, color: '#666' },
    value: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    empty: { textAlign: "center", marginTop: 50, color: "#999", fontSize: 16 }
});