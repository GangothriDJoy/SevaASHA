import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView, Dimensions, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Mock Data for Surveillance & Notifications
const NOTIFICATIONS = [
    { id: "1", type: "Vaccine", msg: "12 Children due for MR Vaccine in Ward 7", time: "10m ago", urgent: true },
    { id: "2", type: "Surveillance", msg: "Spike in fever cases reported by ASHA (Ward 2)", time: "1h ago", urgent: true },
    { id: "3", type: "Maternal", msg: "High-risk follow-up: Sreedevi Nair (Ward 7)", time: "2h ago", urgent: false },
];

const { width } = Dimensions.get("window");

export default function JPHNControlCentre() {
    const router = useRouter();

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
                            <Text style={styles.metricValue}>14</Text>
                            <Text style={styles.metricLabel}>Active Alerts</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metricBlock}>
                            <Text style={styles.metricValue}>3</Text>
                            <Text style={styles.metricLabel}>Wards Monitored</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metricBlock}>
                            <Text style={styles.metricValue}>95%</Text>
                            <Text style={styles.metricLabel}>Overall Health</Text>
                        </View>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* --- 2. LIVE SURVEILLANCE & NOTIFICATION FEED --- */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Priority Notifications</Text>
                        <TouchableOpacity activeOpacity={0.6}>
                            <Text style={styles.viewAll}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {NOTIFICATIONS.map(item => (
                        <TouchableOpacity key={item.id} style={[styles.notifCard, item.urgent && styles.urgentCard]} activeOpacity={0.8}>
                            <View style={[styles.notifIcon, { backgroundColor: item.urgent ? '#FFEBEE' : '#E0F2F1' }]}>
                                <Ionicons
                                    name={item.type === "Vaccine" ? "medkit" : item.type === "Surveillance" ? "pulse" : "woman"}
                                    size={22}
                                    color={item.urgent ? "#D32F2F" : "#0E6C6C"}
                                />
                            </View>
                            <View style={styles.notifTextContainer}>
                                <View style={styles.notifHeader}>
                                    <Text style={[styles.notifType, { color: item.urgent ? '#D32F2F' : '#0E6C6C' }]}>
                                        {item.type.toUpperCase()}
                                    </Text>
                                    <Text style={styles.notifTime}>{item.time}</Text>
                                </View>
                                <Text style={styles.notifMsg}>{item.msg}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}

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

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="document-attach" size={28} color="#8E24AA" />
                            </View>
                            <Text style={styles.btnLabel}>e-Health Reports</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7} onPress={() => router.push("/supervisor-emergencies" as any)}>
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
                        <View style={styles.indexCard}>
                            <View style={styles.indexRow}>
                                <View>
                                    <Text style={styles.wardLabel}>Ward 7</Text>
                                    <Text style={styles.wardSubText}>Anitha (ASHA)</Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <View style={styles.statusDot} />
                                    <Text style={styles.indexStatus}>Stable</Text>
                                </View>
                            </View>
                            <View style={styles.progressBack}>
                                <View style={[styles.progressFill, { width: '85%' }]} />
                            </View>
                            <View style={styles.progressRow}>
                                <Text style={styles.progressText}>Vaccination Coverage</Text>
                                <Text style={styles.progressPercentage}>85%</Text>
                            </View>
                        </View>
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