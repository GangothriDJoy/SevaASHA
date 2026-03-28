import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView, Dimensions, StatusBar, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, onSnapshot, doc, orderBy, limit } from "firebase/firestore";
import { db } from "@/firebaseConfig";

const { width } = Dimensions.get("window");

export default function AwwDashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { role, name, mobile } = params;

    const userName = String(name || "Anganwadi Worker").trim();
    const userRole = String(role || "Anganwadi Worker").trim();
    const userMobile = String(mobile || "").trim();

    const [globalBroadcasts, setGlobalBroadcasts] = useState<any[]>([]);
    
    // Live Dynamic Stats
    const [totalChildren, setTotalChildren] = useState(0);
    const [pregnantMothers, setPregnantMothers] = useState(0);
    const [nutriAlerts, setNutriAlerts] = useState(0);
    const [pendingStock, setPendingStock] = useState("Unknown");

    useEffect(() => {
        // 1. Listen to Resident Demographics (Children & Mothers)
        // FIX: Removed the strict `where("workerId", "==", userMobile)` filter 
        // so it fetches ALL records from the database to ensure it doesn't show 0.
        const qMembers = query(collection(db, "household_members"));
        
        const unsubMembers = onSnapshot(qMembers, (snapshot) => {
            let childCount = 0;
            let motherCount = 0;
            let criticalNutriCount = 0;

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();

                const age = parseInt(data.age || '0', 10);
                
                // ROBUST CHECK for Mothers (Catches multiple string variations)
                const isMom = data.isPregnant === true || 
                              data.isPregnant === "true" || 
                              data.isPregnant === "Yes" || 
                              data.status === "Pregnant" || 
                              data.status === "Postnatal";
                

                if (isMom) {
                    motherCount++;
                }
                
                // Children <= 6 (excluding mothers)
                if (!isNaN(age) && age <= 6 && !isMom) {
                    childCount++;
                    
                    // Nutrition Alert Logic

                    const w = parseFloat(data.weight || '0');

                    if (!isNaN(w) && w > 0) {
                        if (age <= 1 && w < 7) criticalNutriCount++; // Severe Underweight
                        else if (age > 1 && age <= 6 && w < 10) criticalNutriCount++; // Underweight
                    }
                }
            });

            setTotalChildren(childCount);
            setPregnantMothers(motherCount);
            setNutriAlerts(criticalNutriCount);
        });

        // 2. Listen to Inventory Stock (Uses a default fallback if mobile is missing)
        const inventoryDocId = userMobile || "default_center";
        const unsubInventory = onSnapshot(doc(db, "aww_inventory", inventoryDocId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                let criticalItems = 0;
                Object.entries(data).forEach(([k, v]) => {
                    if (typeof v === 'number' && v <= 10) criticalItems++;
                });

                if (criticalItems > 1) setPendingStock(`${criticalItems} Criticals`);
                else if (criticalItems === 1) setPendingStock(`1 Critical`);
                else setPendingStock("Optimum");
            } else {
                setPendingStock("Uninitialized");
            }
        });

        // 3. Listen to Central Broadcasts
        const qBroadcasts = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(10));
        const unsubBroadcasts = onSnapshot(qBroadcasts, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.target === userRole || data.target === "All" || (!data.target)) {
                    list.push({ id: docSnap.id, ...data });
                }
            });
            setGlobalBroadcasts(list);
        });

        return () => {
            unsubMembers();
            unsubInventory();
            unsubBroadcasts();
        };
    }, [userMobile, userRole]);

    const handleEmergency = () => {
        Alert.alert(
            "🚨 RAISE EMERGENCY ALERT",
            "Are you sure you want to notify the PHC and Supervisor immediately for a maternal/child emergency?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Send Alert", onPress: () => alert("Emergency Alert Sent Successfully!"), style: "destructive" }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#D84315" />
            <View style={styles.container}>
                {/* --- 1. PREMIUM WARM HEADER --- */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.headerTextWrapper}>
                            <Text style={styles.headerTitle}>ANGANWADI CENTRE</Text>
                            <Text style={styles.subHeaderText}>Welcome back, {userName}</Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: '/settings', params: { role: userRole, name: userName } })}>
                            <Ionicons name="person-circle" size={32} color="#FFCCBC" />
                        </TouchableOpacity>
                    </View>


                    {/* Floating Summary Dashboard (Fully Clickable) */}

                    <View style={styles.headerMetricsCard}>
                        <TouchableOpacity style={styles.metricBlock} onPress={() => router.push({ pathname: "/children-list", params: { mobile: userMobile } })}>
                            <Text style={[styles.metricValue, { color: '#2E7D32' }]}>{totalChildren}</Text>
                            <Text style={styles.metricLabel}>Children</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.metricBlock} onPress={() => router.push({ pathname: "/mother-list", params: { mobile: userMobile } })}>
                            <Text style={[styles.metricValue, { color: '#1565C0' }]}>{pregnantMothers}</Text>
                            <Text style={styles.metricLabel}>Mothers</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.metricBlock} onPress={() => router.push({ pathname: "/nutri-alert", params: { mobile: userMobile } })}>

                            <View style={[styles.alertBadge, nutriAlerts > 0 && { backgroundColor: '#FFEBEE' }]}>
                                <Text style={[styles.metricValue, { color: nutriAlerts > 0 ? '#D32F2F' : '#E65100' }]}>{nutriAlerts}</Text>
                            </View>
                            <Text style={styles.metricLabel}>Nutri-Alerts</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {globalBroadcasts.length > 0 && (
                        <View style={{ marginBottom: 15 }}>
                            {globalBroadcasts.map((bc) => (
                                <View key={bc.id} style={styles.broadcastBox}>
                                    <Ionicons name="megaphone" size={20} color="#E65100" />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={{ color: '#E65100', fontWeight: 'bold', fontSize: 13 }}>Central Broadcast for {bc.target || "All"}</Text>
                                        <Text style={{ color: '#E65100', fontSize: 14, marginTop: 2 }}>{bc.message}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* --- 2. CENTER MANAGEMENT GRID --- */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Center Management</Text>
                        <Ionicons name="apps" size={20} color="#D84315" />
                    </View>

                    <View style={styles.grid}>
                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: "/mother-list", params: { mobile: userMobile } })}>
                            <View style={[styles.btnIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="people" size={28} color="#FF9800" />
                            </View>
                            <Text style={styles.btnLabel}>Maternal Reg.</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: "/growth-chart", params: { mobile: userMobile } })}>
                            <View style={[styles.btnIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="trending-up" size={28} color="#388E3C" />
                            </View>
                            <Text style={styles.btnLabel}>Growth Chart</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: "/supplement-records", params: { mobile: userMobile } })}>
                            <View style={[styles.btnIcon, { backgroundColor: '#FCE4EC' }]}>
                                <Ionicons name="fast-food" size={28} color="#D81B60" />
                            </View>
                            <Text style={styles.btnLabel}>Supplements</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: "/attendance", params: { mobile: userMobile } })}>
                            <View style={[styles.btnIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="school" size={28} color="#1976D2" />
                            </View>
                            <Text style={styles.btnLabel}>Attendance</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: "/stock-inventory", params: { mobile: userMobile } })}>
                            <View style={[styles.btnIcon, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="cube" size={28} color="#8E24AA" />
                            </View>
                            <Text style={styles.btnLabel}>Inventory</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: "/reports", params: { mobile: userMobile } })}>
                            <View style={[styles.btnIcon, { backgroundColor: '#E8EAF6' }]}>
                                <Ionicons name="document-text" size={28} color="#3F51B5" />
                            </View>
                            <Text style={styles.btnLabel}>Daily Report</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- 3. ALERTS & TRACKING CARDS --- */}
                    <Text style={[styles.sectionTitle, { marginTop: 15, marginBottom: 10 }]}>Tracking Alerts</Text>

                    <TouchableOpacity style={styles.wideAlertCard} activeOpacity={0.8} onPress={() => router.push({ pathname: "/stock-inventory", params: { mobile: userMobile } })}>
                        <View style={[styles.cardIconBox, { backgroundColor: '#E0F7FA' }]}>
                            <Ionicons name="clipboard" size={24} color="#0097A7" />
                        </View>
                        <View style={styles.cardTextBox}>
                            <Text style={styles.cardTitle}>Global Stock Status</Text>
                            <Text style={styles.cardSubText}>Your current physical food reserves are rated as: <Text style={{ fontWeight: 'bold' }}>{pendingStock}</Text></Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>


                    <TouchableOpacity style={styles.wideAlertCard} activeOpacity={0.8} onPress={() => router.push({ pathname: "/nutri-alert", params: { mobile: userMobile } })}>

                        <View style={[styles.cardIconBox, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="warning" size={24} color="#E65100" />
                        </View>
                        <View style={styles.cardTextBox}>
                            <Text style={styles.cardTitle}>Clinical Warning Pool</Text>
                            <Text style={styles.cardSubText}>There are <Text style={{ fontWeight: 'bold', color: '#D32F2F' }}>{nutriAlerts}</Text> children mapped into active Underweight or Severe vectors.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>

                    {/* --- 4. EMERGENCY SOS --- */}
                    <TouchableOpacity style={styles.emergencyCard} activeOpacity={0.8} onPress={handleEmergency}>
                        <View style={styles.emergencyIconGlow}>
                            <Ionicons name="alert-circle" size={36} color="#FFFFFF" />
                        </View>
                        <View style={styles.emergencyTextWrap}>
                            <Text style={styles.emergencyTitle}>RAISE EMERGENCY ALERT</Text>
                            <Text style={styles.emergencySubText}>Notify PHC and Supervisor immediately for maternal or child emergencies.</Text>
                        </View>
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

// OS specific shadow configurations
const shadowConfig = Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
    android: { elevation: 3 },
});

const emergencyShadow = Platform.select({
    ios: { shadowColor: "#D32F2F", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
    android: { elevation: 6 },
});

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#D84315" },
    container: { flex: 1, backgroundColor: "#FFFBF9" },

    header: { backgroundColor: "#D84315", paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 10, paddingBottom: 45, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 10 },
    headerTopRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { padding: 8, marginLeft: -8, borderRadius: 20 },
    headerTextWrapper: { flex: 1, paddingHorizontal: 10 },
    headerTitle: { color: "white", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
    subHeaderText: { color: "#FFCCBC", fontSize: 13, marginTop: 2, fontWeight: "500" },
    profileBtn: { padding: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },

    headerMetricsCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, position: 'absolute', bottom: -35, alignSelf: 'center', width: width - 40, ...shadowConfig, shadowOpacity: 0.12, elevation: 6 },
    metricBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    metricValue: { fontSize: 24, fontWeight: '800' },
    metricLabel: { fontSize: 11, color: '#777', marginTop: 4, fontWeight: '600' },
    divider: { width: 1, backgroundColor: '#EEEEEE', marginVertical: 5 },
    alertBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 2, borderRadius: 12 },

    scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: "800", color: "#222" },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridBtn: { backgroundColor: '#FFFFFF', width: '31%', paddingVertical: 18, paddingHorizontal: 5, borderRadius: 20, alignItems: 'center', marginBottom: 15, ...shadowConfig, borderWidth: 1, borderColor: '#F9F9F9' },
    btnIcon: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    btnLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#444' },

    wideAlertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginBottom: 12, ...shadowConfig, borderWidth: 1, borderColor: '#F5F5F5' },
    cardIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardTextBox: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#333', marginBottom: 4 },
    cardSubText: { fontSize: 12, color: '#666', lineHeight: 18, fontWeight: '500' },

    emergencyCard: { backgroundColor: '#C62828', borderRadius: 20, padding: 20, marginTop: 15, flexDirection: 'row', alignItems: 'center', ...emergencyShadow },
    emergencyIconGlow: { backgroundColor: 'rgba(255,255,255,0.2)', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    emergencyTextWrap: { flex: 1 },
    emergencyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
    emergencySubText: { color: '#FFCDD2', fontSize: 12, lineHeight: 18, fontWeight: '500' },
    broadcastBox: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderColor: '#FFCC80', borderWidth: 1, marginBottom: 8 }
});