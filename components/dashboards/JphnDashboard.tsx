import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView, Dimensions, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebaseConfig";
import { collection, query, where, onSnapshot, getDocs, orderBy, limit } from "firebase/firestore";



const { width } = Dimensions.get("window");

export default function JPHNControlCentre() {
    const router = useRouter();

    const [notifications, setNotifications] = useState<any[]>([]);
    const [ashaWorkers, setAshaWorkers] = useState<any[]>([]);
    const [wardRisk, setWardRisk] = useState<Record<string, { total: number, risk: number }>>({});
    
    // New Feature: District filtering tabs for Ward Health Index
    const [districts, setDistricts] = useState<string[]>([]);
    const [selectedDistrict, setSelectedDistrict] = useState<string>("All");

    const [stats, setStats] = useState({
        activeAlerts: 0,
        uniqueWards: 0,
        healthPercentage: 100
    });

    useEffect(() => {
        let alertsCount = 0;
        let emergenciesCount = 0;
        let totalPopulation = 0;
        let highRiskCount = 0;

        // 1. Listen for Emergencies
        const qEmergency = query(collection(db, "emergency"), where("status", "==", "UNRESOLVED"));
        const unsubEmergency = onSnapshot(qEmergency, (snap) => {
            emergenciesCount = snap.size;
            updateStats();
        });

        // 2. Listen for General Alerts
        const qAlerts = query(collection(db, "alerts"), where("status", "==", "Pending"));
        const unsubAlerts = onSnapshot(qAlerts, (snap) => {
            alertsCount = snap.size;
            updateStats();
        });

        // 3. Fetch Wards using ASHA Workers
        const fetchWards = async () => {
            try {
                const qWorkers = query(collection(db, "users"), where("role", "==", "ASHA Worker"));
                const snap = await getDocs(qWorkers);
                const wards = new Set();
                const districtSet = new Set<string>();
                const workerList: any[] = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    const w = data.assignedWard || data.wardName || data.assignedBlock || data.allocatedArea || data.ward || "Zone";
                    const districtName = data.district || "Default District";
                    const mobile = data.mobile || data.userMobile || data.workerMobile || doc.id;
                    const name = data.fullName || data.name || (data.firstName ? `${data.firstName} ${data.lastName || ""}` : "Worker");
                    
                    wards.add(w);
                    districtSet.add(districtName);
                    
                    workerList.push({
                        id: doc.id,
                        mobile: mobile,
                        name: name,
                        district: districtName,
                        ward: w
                    });
                });
                
                const districtArr = Array.from(districtSet);
                setDistricts(districtArr);
                if (districtArr.length > 0) setSelectedDistrict(districtArr[0]);
                
                setStats(prev => ({ ...prev, uniqueWards: wards.size > 0 ? wards.size : 1 }));
                setAshaWorkers(workerList);
            } catch (e) { console.error(e); }
        };
        fetchWards();

        // 4. Calculate Overall Health (Population vs High Risk)
        const qBen = query(collection(db, "beneficiaries"));
        const unsubBen = onSnapshot(qBen, (snap) => {
            let total = 0;
            let risk = 0;
            const newWardRisk: Record<string, { total: number, risk: number }> = {};

            snap.forEach(doc => {
                total++;
                const data = doc.data();
                const issues = (data.healthIssues || "").toLowerCase();
                const category = (data.category || "").toLowerCase();
                const workerId = data.ashaId || data.workerId || "unknown";

                if (!newWardRisk[workerId]) newWardRisk[workerId] = { total: 0, risk: 0 };
                newWardRisk[workerId].total++;

                let isRisk = false;
                if (issues && issues !== "none" && issues !== "normal" && issues !== "-select-") isRisk = true;
                if (category === "high risk" || category === "severe") isRisk = true;
                
                if (isRisk) {
                    risk++;
                    newWardRisk[workerId].risk++;
                }
            });
            totalPopulation = total;
            highRiskCount = risk;

            setWardRisk(newWardRisk);
            updateStats();
        });

        let systemNotifs: any[] = [];
        let broadcastNotifs: any[] = [];

        const mergeNotifications = () => {
            const merged = [...systemNotifs, ...broadcastNotifs];
            merged.sort((a, b) => {
                const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return tB - tA;
            });
            setNotifications(merged.slice(0, 3));
        };

        // 5. Fetch Priority Notifications
        const qNotifications = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(10));
        const unsubNotifications = onSnapshot(qNotifications, (snap) => {
            const list: any[] = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.targetRole === "JPHN" || data.targetRole === "All") {
                    list.push({ id: docSnap.id, ...data });
                }
            });
            systemNotifs = list;
            mergeNotifications();
        });

        // 6. Fetch Supervisor Broadcasts
        const qBroadcasts = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(10));
        const unsubBroadcasts = onSnapshot(qBroadcasts, (snap) => {
            const list: any[] = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.target === "JPHN" || data.target === "All" || !data.target) {
                    // Map broadcasts into notification schema
                    list.push({ id: docSnap.id, title: "Supervisor Broadcast", message: data.message, type: "info", createdAt: data.createdAt });
                }
            });
            broadcastNotifs = list;
            mergeNotifications();
        });

        const updateStats = () => {
            let healthPct = 100;
            if (totalPopulation > 0) {
                // Ensure health % doesn't drop below 0
                healthPct = Math.max(0, Math.round(((totalPopulation - highRiskCount) / totalPopulation) * 100));
            }
            setStats(prev => ({
                ...prev,
                activeAlerts: alertsCount + emergenciesCount,
                healthPercentage: healthPct
            }));
        };

        return () => {
            unsubEmergency();
            unsubAlerts();
            unsubBen();
            unsubNotifications();
            unsubBroadcasts();
        };
    }, []);

    const getRelativeTime = (timestamp: any) => {
        if (!timestamp) return "Just now";
        const now = new Date();
        const past = timestamp.toDate();
        const diffMins = Math.floor((now.getTime() - past.getTime()) / 60000);
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffH = Math.floor(diffMins / 60);
        if (diffH < 24) return `${diffH}h ago`;
        return `${Math.floor(diffH / 24)}d ago`;
    };

    const wardHealth = ashaWorkers.map(w => {
        // Find matching worker stat deeply by ID or stripped mobile
        let matchedTotal = 0;
        let matchedRisk = 0;
        
        Object.keys(wardRisk).forEach(key => {
            const wMobileStr = String(w.mobile || "").replace(/\D/g, "");
            const kMobileStr = String(key || "").replace(/\D/g, "");
            
            if (
                key === w.id || 
                (wMobileStr && wMobileStr === kMobileStr) || 
                (wMobileStr && kMobileStr && wMobileStr.includes(kMobileStr)) || 
                (wMobileStr && kMobileStr && kMobileStr.includes(wMobileStr))
            ) {
                matchedTotal += wardRisk[key].total;
                matchedRisk += wardRisk[key].risk;
            }
        });

        // 0 patients = 0% coverage correctly. Otherwise, health % based on healthy vs risk
        const cov = matchedTotal > 0 ? Math.max(0, Math.round(((matchedTotal - matchedRisk) / matchedTotal) * 100)) : 0;
        
        return { ...w, coverage: cov, riskCount: matchedRisk, totalPatients: matchedTotal };
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0B5555" />
            <View style={styles.container}>
                {/* --- 1. PREMIUM HEADER --- */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.headerTextWrapper}>
                            <Text style={styles.headerTitle}>JPHN CONTROL CENTRE</Text>
                            <Text style={styles.subHeaderText}>PHC Kozhikode | Surveillance Hub</Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7}>
                            <Ionicons name="shield-checkmark" size={28} color="#A7D7D7" />
                        </TouchableOpacity>
                    </View>

                    {/* Modern Summary Metric in Header */}
                    <View style={styles.headerMetricsCard}>
                        <View style={styles.metricBlock}>
                            <Text style={styles.metricValue}>{stats.activeAlerts}</Text>
                            <Text style={styles.metricLabel}>Active Alerts</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metricBlock}>
                            <Text style={styles.metricValue}>{stats.uniqueWards}</Text>
                            <Text style={styles.metricLabel}>Wards Monitored</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metricBlock}>
                            <Text style={styles.metricValue}>{stats.healthPercentage}%</Text>
                            <Text style={styles.metricLabel}>Overall Health</Text>
                        </View>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* --- 2. LIVE SURVEILLANCE & NOTIFICATION FEED --- */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Priority Notifications</Text>
                        <TouchableOpacity activeOpacity={0.6} onPress={() => router.push({ pathname: "/notification", params: { role: "JPHN" } } as any)}>
                            <Text style={styles.viewAll}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {notifications.length > 0 ? (
                        notifications.map((item, index) => {
                            const isUrgent = item.type === "alert";
                            let iconName = "information-circle";
                            if (item.title?.toLowerCase().includes("vaccine") || item.title?.toLowerCase().includes("restock")) iconName = "medkit";
                            if (isUrgent) iconName = "warning";

                            return (
                                <TouchableOpacity key={item.id || index.toString()} style={[styles.notifCard, isUrgent && styles.urgentCard]} activeOpacity={0.8} onPress={() => router.push({ pathname: "/notification", params: { role: "JPHN" } } as any)}>
                                    <View style={[styles.notifIcon, { backgroundColor: isUrgent ? '#FFEBEE' : '#E0F2F1' }]}>
                                        <Ionicons
                                            name={iconName as any}
                                            size={22}
                                            color={isUrgent ? "#D32F2F" : "#0E6C6C"}
                                        />
                                    </View>
                                    <View style={styles.notifTextContainer}>
                                        <View style={styles.notifHeader}>
                                            <Text style={[styles.notifType, { color: isUrgent ? '#D32F2F' : '#0E6C6C', maxWidth: '75%' }]} numberOfLines={1}>
                                                {(item.title || "UPDATE").toUpperCase()}
                                            </Text>
                                            <Text style={styles.notifTime}>{getRelativeTime(item.createdAt)}</Text>
                                        </View>
                                        <Text style={styles.notifMsg}>{item.message}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <View style={{ alignItems: 'center', padding: 20, marginBottom: 10 }}>
                            <Text style={{ color: '#888', fontStyle: 'italic' }}>No priority notifications right now.</Text>
                        </View>
                    )}

                    {/* --- 3. FUNCTIONALITY GRID (MAXIMIZED) --- */}
                    <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Core Functionalities</Text>
                    <View style={styles.grid}>
                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push("/pregnancy-monitor" as any)}>
                            <View style={[styles.btnIcon, { backgroundColor: '#FFF0F5' }]}>
                                <Ionicons name="woman" size={28} color="#D81B60" />
                            </View>
                            <Text style={styles.btnLabel}>Maternal Tracking</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push("/child-vaccine-monitor" as any)}>
                            <View style={[styles.btnIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="shield-half" size={28} color="#43A047" />
                            </View>
                            <Text style={styles.btnLabel}>Child Vaccine</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push("/disease-monitor" as any)}>
                            <View style={[styles.btnIcon, { backgroundColor: '#FFF8E1' }]}>
                                <Ionicons name="search-sharp" size={28} color="#FBC02D" />
                            </View>
                            <Text style={styles.btnLabel}>Disease Watch</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push("/asha-performance" as any)}>
                            <View style={[styles.btnIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="people" size={28} color="#1E88E5" />
                            </View>
                            <Text style={styles.btnLabel}>ASHA Metrics</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push("/e-health-reports" as any)}>
                            <View style={[styles.btnIcon, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="document-attach" size={28} color="#8E24AA" />
                            </View>
                            <Text style={styles.btnLabel}>e-Health Reports</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push("/emergency" as any)}>
                            <View style={[styles.btnIcon, { backgroundColor: '#FFEBEE' }]}>
                                <Ionicons name="megaphone" size={28} color="#E53935" />
                            </View>
                            <Text style={styles.btnLabel}>Emergency Alerts</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- 4. DATA FETCH SUMMARY (Ward Health Index) --- */}
                    <View style={styles.indexSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Ward Health Index</Text>
                            <Ionicons name="stats-chart" size={18} color="#0E6C6C" />
                        </View>

                        {districts.length > 1 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15, paddingHorizontal: 5 }}>
                                {districts.map(d => (
                                    <TouchableOpacity 
                                        key={d} 
                                        style={[styles.districtTab, selectedDistrict === d && styles.districtTabActive]}
                                        onPress={() => setSelectedDistrict(d)}
                                    >
                                        <Text style={[styles.districtTabText, selectedDistrict === d && styles.districtTabTextActive]}>
                                            {d}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                        
                        {wardHealth.length > 0 ? (
                            wardHealth.filter(w => w.district === selectedDistrict).map((wardItem) => (
                                <View key={wardItem.id} style={[styles.indexCard, { marginBottom: 15 }]}>
                                    <View style={styles.indexRow}>
                                        <View>
                                            <Text style={styles.wardLabel}>{wardItem.ward?.length > 15 ? wardItem.ward.substring(0, 15) + "..." : wardItem.ward}</Text>
                                            <Text style={styles.wardSubText}>{wardItem.name} (ASHA)</Text>
                                        </View>
                                        <View style={[styles.statusBadge, wardItem.coverage < 70 && { backgroundColor: '#FFEBEE' }]}>
                                            <View style={[styles.statusDot, wardItem.coverage < 70 && { backgroundColor: '#D32F2F' }]} />
                                            <Text style={[styles.indexStatus, wardItem.coverage < 70 && { color: '#D32F2F' }]}>
                                                {wardItem.coverage >= 90 ? "Excellent" : wardItem.coverage >= 70 ? "Stable" : "Critical"}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.progressBack}>
                                        <View style={[styles.progressFill, { width: `${wardItem.coverage}%`, backgroundColor: wardItem.coverage < 70 ? '#D32F2F' : '#0E6C6C' }]} />
                                    </View>
                                    <View style={styles.progressRow}>
                                        <Text style={styles.progressText}>Overall Health Score</Text>
                                        <Text style={[styles.progressPercentage, wardItem.coverage < 70 && { color: '#D32F2F' }]}>{wardItem.coverage}%</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={{ alignItems: 'center', padding: 20 }}>
                                <Text style={{ color: '#888', fontStyle: 'italic' }}>Loading active wards...</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* --- FOOTER NAVIGATION --- */}
                <View style={styles.footerContainer}>
                    <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/medicine-stock" as any)} activeOpacity={0.6}>
                        <Ionicons name="beaker" size={24} color="#94B7B7" />
                        <Text style={styles.footerText}>Pharmacy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.footerTab, styles.activeFooterTab]} activeOpacity={1}>
                        <Ionicons name="grid" size={24} color="#FFFFFF" />
                        <Text style={[styles.footerText, styles.activeFooterText]}>Control Hub</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.footerTab} onPress={() => router.replace("/auth" as any)} activeOpacity={0.6}>
                        <Ionicons name="log-out" size={24} color="#E53935" />
                        <Text style={[styles.footerText, { color: '#E53935' }]}>Exit</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const shadowConfig = Platform.select({
    ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    android: {
        elevation: 3,
    },
});

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#0E6C6C" },
    container: { flex: 1, backgroundColor: "#F7FAFA" },
    header: {
        backgroundColor: "#0E6C6C",
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 20 : 10,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 10
    },
    headerTopRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { padding: 8, marginLeft: -8, borderRadius: 20 },
    headerTextWrapper: { flex: 1, paddingHorizontal: 10 },
    headerTitle: { color: "white", fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
    subHeaderText: { color: "#A7D7D7", fontSize: 13, marginTop: 2, fontWeight: "500" },
    profileBtn: { padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },

    headerMetricsCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 15,
        position: 'absolute',
        bottom: -35,
        alignSelf: 'center',
        width: width - 40,
        ...shadowConfig,
        shadowOpacity: 0.1,
        elevation: 6
    },
    metricBlock: { flex: 1, alignItems: 'center' },
    metricValue: { fontSize: 22, fontWeight: '800', color: '#0E6C6C' },
    metricLabel: { fontSize: 11, color: '#777', marginTop: 4, fontWeight: '600' },
    divider: { width: 1, backgroundColor: '#E0E0E0', marginVertical: 5 },

    scrollContent: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 110 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
    viewAll: { fontSize: 13, color: "#0E6C6C", fontWeight: "700" },

    notifCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        marginBottom: 12,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    urgentCard: { borderLeftWidth: 5, borderLeftColor: '#D32F2F', paddingLeft: 12 },
    notifIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    notifTextContainer: { flex: 1, justifyContent: 'center' },
    notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    notifType: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    notifTime: { fontSize: 11, color: '#999', fontWeight: '500' },
    notifMsg: { fontSize: 14, color: '#444', fontWeight: "500", lineHeight: 20 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 5 },
    gridBtn: {
        backgroundColor: '#FFFFFF',
        width: '31%',
        paddingVertical: 18,
        paddingHorizontal: 5,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 15,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    btnIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    btnLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#333' },

    indexSection: { marginTop: 10 },
    districtTab: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#E0F2F1',
        marginRight: 10,
        height: 36,
        justifyContent: 'center',
    },
    districtTabActive: { backgroundColor: '#0E6C6C' },
    districtTabText: { fontSize: 13, color: '#0E6C6C', fontWeight: 'bold' },
    districtTabTextActive: { color: '#FFFFFF' },
    indexCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    indexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    wardLabel: { fontWeight: '800', fontSize: 16, color: '#1A1A1A' },
    wardSubText: { fontSize: 12, color: '#666', marginTop: 2, fontWeight: '500' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2E7D32', marginRight: 6 },
    indexStatus: { fontSize: 12, color: '#2E7D32', fontWeight: '800' },
    progressBack: { height: 10, backgroundColor: '#E0F2F1', borderRadius: 5, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#0E6C6C', borderRadius: 5 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    progressText: { fontSize: 12, color: '#777', fontWeight: '600' },
    progressPercentage: { fontSize: 12, fontWeight: '800', color: '#0E6C6C' },

    footerContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 20,
        ...shadowConfig,
        shadowOffset: { width: 0, height: -4 },
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        justifyContent: 'space-between',
        paddingBottom: Platform.OS === 'ios' ? 25 : 12
    },
    footerTab: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15, minWidth: 90 },
    activeFooterTab: { backgroundColor: '#0E6C6C' },
    footerText: { fontSize: 11, fontWeight: '700', marginTop: 6, color: '#94B7B7' },
    activeFooterText: { color: '#FFFFFF' }
});