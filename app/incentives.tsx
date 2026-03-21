import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs, orderBy, collectionGroup } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Base Monthly Logic
const INCENTIVE_PER_VISIT = 200; // Flat ₹200 for validated visits.
const INCENTIVE_PER_VITALS = 150; // Extra ₹150 for conducting a full Vitals Health Checkup

export default function MyIncentives() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userMobile = String(params.mobile || "").trim();

    const [loading, setLoading] = useState(true);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [visitCount, setVisitCount] = useState({ visits: 0, checkups: 0 });
    const [history, setHistory] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            const fetchIncentives = async () => {
                setLoading(true);
                try {
                    const now = new Date();
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

                    // --- 1. Fetch Basic Visits ---
                    const visitQuery = userMobile
                        ? query(collection(db, "household_visits"), where("workerId", "==", userMobile))
                        : query(collection(db, "household_visits"));

                    const [visitSnap, vitalsSnap] = await Promise.all([
                        getDocs(visitQuery),
                        // Fetching vitals using collectionGroup, but doing heavy lifting on the client side since WorkerId indexing might not be guaranteed on vitals
                        getDocs(query(collectionGroup(db, "vitals")))
                    ]);

                    let vCount = 0;
                    let cCount = 0;
                    let currentMonthEarnings = 0;
                    let combinedHistory: any[] = [];

                    // Process Standard Visits
                    visitSnap.forEach((docSnap) => {
                        const data = docSnap.data();
                        const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();

                        if (ts >= monthStart) {
                            vCount++;
                            currentMonthEarnings += INCENTIVE_PER_VISIT;
                            combinedHistory.push({
                                id: `v_${docSnap.id}`,
                                rawDate: ts.getTime(),
                                date: ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                                title: `Routine Visit • House ${data.houseId || "N/A"}`,
                                amount: INCENTIVE_PER_VISIT,
                                type: 'visit'
                            });
                        }
                    });

                    // Process Vitals / Health Checkups
                    vitalsSnap.forEach((docSnap) => {
                        const data = docSnap.data();
                        // Verify this ASHA actually performed the checkup
                        if (userMobile && data.workerId !== userMobile) return; 

                        const ts = data.recordedAt?.toDate ? data.recordedAt.toDate() : new Date(data.recordedAt || Date.now());
                        
                        if (ts >= monthStart) {
                            cCount++;
                            currentMonthEarnings += INCENTIVE_PER_VITALS;
                            combinedHistory.push({
                                id: `c_${docSnap.id}`,
                                rawDate: ts.getTime(),
                                date: ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                                title: `Health Checkup • ${data.patientName || "Patient"}`,
                                amount: INCENTIVE_PER_VITALS,
                                type: 'checkup'
                            });
                        }
                    });

                    combinedHistory.sort((a, b) => b.rawDate - a.rawDate);

                    setVisitCount({ visits: vCount, checkups: cCount });
                    setTotalEarnings(currentMonthEarnings);
                    setHistory(combinedHistory);

                } catch (error) {
                    console.error("Incentive Fetch Error:", error);
                    Alert.alert("Error", "Could not calculate updated earnings from the server.");
                } finally {
                    setLoading(false);
                }
            };

            fetchIncentives();
        }, [userMobile])
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 10 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Incentives</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={{marginTop: 15, color: '#666', fontSize: 16}}>Calculating Live Earnings...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Total Earnings Card */}
                    <View style={styles.mainCard}>
                        <Text style={styles.cardLabel}>Earnings This Month</Text>
                        <Text style={styles.amountText}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
                        <View style={styles.divider} />
                        
                        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15 }}>
                            <View style={styles.statsRow}>
                                <Ionicons name="home" size={20} color="#B2DFDB" style={{ marginRight: 6 }}/>
                                <Text style={styles.subText}>{visitCount.visits} Visits</Text>
                            </View>
                            <View style={styles.statsRow}>
                                <Ionicons name="fitness" size={20} color="#FFCC80" style={{ marginRight: 6 }}/>
                                <Text style={styles.subText}>{visitCount.checkups} Checkups</Text>
                            </View>
                        </View>
                    </View>

                    {/* Earnings History List */}
                    <Text style={styles.sectionTitle}>Monthly History Ledger</Text>

                    {history.length > 0 ? (
                        history.map((item) => (
                            <View key={item.id} style={styles.historyItem}>
                                <View style={[styles.iconBox, { backgroundColor: item.type === 'checkup' ? '#FFF3E0' : '#E0F2F1' }]}>
                                    <Ionicons 
                                        name={item.type === 'checkup' ? 'fitness' : 'home'} 
                                        size={20} 
                                        color={item.type === 'checkup' ? '#E65100' : '#1F7A6B'} 
                                    />
                                </View>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={styles.historyDetail}>{item.date}</Text>
                                </View>
                                <View style={styles.amountPill}>
                                    <Text style={styles.historyAmount}>+₹{item.amount}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyBox}>
                            <Ionicons name="receipt-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No verified incentive tasks completed this month.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerTitle: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 10 },
    scrollContent: { padding: 15, paddingBottom: 40 },
    mainCard: { backgroundColor: "#1F7A6B", paddingVertical: 35, paddingHorizontal: 20, borderRadius: 20, alignItems: "center", elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.15, shadowRadius: 3, marginBottom: 10 },
    cardLabel: { color: "#B2DFDB", fontSize: 16, marginBottom: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    amountText: { color: "white", fontSize: 54, fontWeight: "bold" },
    divider: { width: '100%', height: 1.5, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 25 },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    subText: { color: "white", fontSize: 16, fontWeight: "600" },
    sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginVertical: 20, marginLeft: 5 },
    historyItem: { backgroundColor: "white", padding: 15, borderRadius: 15, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 1, borderWidth: 1, borderColor: '#eee' },
    iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    historyTitle: { fontWeight: "bold", fontSize: 15, color: "#333" },
    historyDetail: { fontSize: 12, color: "#666", marginTop: 4, fontWeight: '500' },
    amountPill: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#C8E6C9' },
    historyAmount: { color: "#2E7D32", fontWeight: "bold", fontSize: 14 }
});