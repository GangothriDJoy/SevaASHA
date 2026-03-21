import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView, Dimensions, StatusBar, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function AwwDashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { role, name } = useLocalSearchParams();

    const userName = String(name || "Anganwadi Worker").trim();
    const userRole = String(role || "Anganwadi Worker").trim();

    // Mock Dashboard Stats for AWW
    const awwStats = {
        totalChildren: 42,
        pregnantMothers: 12,
        nutriAlerts: 3,
        vaccineDue: 5,
        pendingStock: "80%"
    };
    
    const [globalBroadcasts, setGlobalBroadcasts] = React.useState<any[]>([]);

    React.useEffect(() => {
        import('firebase/firestore').then(({ collection, query, orderBy, limit, onSnapshot }) => {
            import('@/firebaseConfig').then(({ db }) => {
                const qBroadcasts = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"), limit(10));
                const unsubBroadcasts = onSnapshot(qBroadcasts, (snapshot) => {
                    const list: any[] = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.target === userRole || data.target === "All" || (!data.target)) {
                            list.push({ id: doc.id, ...data });
                        }
                    });
                    setGlobalBroadcasts(list);
                });
                return () => unsubBroadcasts();
            });
        });
    }, [userRole]);

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
                            <Text style={styles.headerTitle}>ANGANAWADI CENTRE</Text>
                            <Text style={styles.subHeaderText}>Welcome back, {userName}</Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: '/settings', params: { role: userRole, name: userName } })}>
                            <Ionicons name="person-circle" size={32} color="#FFCCBC" />
                        </TouchableOpacity>
                    </View>

                    {/* Floating Summary Dashboard */}
                    <View style={styles.headerMetricsCard}>
                        <View style={styles.metricBlock}>
                            <Text style={[styles.metricValue, { color: '#2E7D32' }]}>{awwStats.totalChildren}</Text>
                            <Text style={styles.metricLabel}>Children</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metricBlock}>
                            <Text style={[styles.metricValue, { color: '#1565C0' }]}>{awwStats.pregnantMothers}</Text>
                            <Text style={styles.metricLabel}>Mothers</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.metricBlock}>
                            <View style={styles.alertBadge}>
                                <Text style={[styles.metricValue, { color: '#E65100' }]}>{awwStats.nutriAlerts}</Text>
                            </View>
                            <Text style={styles.metricLabel}>Nutri-Alerts</Text>
                        </View>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {globalBroadcasts.length > 0 && (
                        <View style={{ marginBottom: 15 }}>
                            {globalBroadcasts.map((bc) => (
                                <View key={bc.id} style={styles.broadcastBox}>
                                    <Ionicons name="megaphone" size={20} color="#E65100" />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={{ color: '#E65100', fontWeight: 'bold', fontSize: 13 }}>Central Broadcast for {bc.target}</Text>
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
                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="person-add" size={28} color="#FF9800" />
                            </View>
                            <Text style={styles.btnLabel}>Add Child</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="trending-up" size={28} color="#388E3C" />
                            </View>
                            <Text style={styles.btnLabel}>Growth Chart</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#FCE4EC' }]}>
                                <Ionicons name="fast-food" size={28} color="#D81B60" />
                            </View>
                            <Text style={styles.btnLabel}>Food Dist.</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="calendar" size={28} color="#1976D2" />
                            </View>
                            <Text style={styles.btnLabel}>Attendance</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="color-palette" size={28} color="#8E24AA" />
                            </View>
                            <Text style={styles.btnLabel}>Activities</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#E8EAF6' }]}>
                                <Ionicons name="document-text" size={28} color="#3F51B5" />
                            </View>
                            <Text style={styles.btnLabel}>Daily Report</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- 3. ALERTS & TRACKING CARDS --- */}
                    <Text style={[styles.sectionTitle, { marginTop: 15, marginBottom: 10 }]}>Tracking & Inventory</Text>

                    {/* Vaccine Follow-up Card */}
                    <TouchableOpacity style={styles.wideAlertCard} activeOpacity={0.8}>
                        <View style={[styles.cardIconBox, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="medkit" size={24} color="#8E24AA" />
                        </View>
                        <View style={styles.cardTextBox}>
                            <Text style={styles.cardTitle}>Vaccinations Due</Text>
                            <Text style={styles.cardSubText}>{awwStats.vaccineDue} Children are scheduled for vaccines this week.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>

                    {/* Stock Status Card */}
                    <TouchableOpacity style={styles.wideAlertCard} activeOpacity={0.8}>
                        <View style={[styles.cardIconBox, { backgroundColor: '#E0F7FA' }]}>
                            <Ionicons name="clipboard" size={24} color="#0097A7" />
                        </View>
                        <View style={styles.cardTextBox}>
                            <Text style={styles.cardTitle}>Stock Status</Text>
                            <Text style={styles.cardSubText}>Supplementary food stock is currently at {awwStats.pendingStock}.</Text>
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
    container: { flex: 1, backgroundColor: "#FFFBF9" }, // Very soft warm white

    // --- Header Styles ---
    header: {
        backgroundColor: "#D84315",
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 20 : 10,
        paddingBottom: 45,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 10
    },
    headerTopRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { padding: 8, marginLeft: -8, borderRadius: 20 },
    headerTextWrapper: { flex: 1, paddingHorizontal: 10 },
    headerTitle: { color: "white", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
    subHeaderText: { color: "#FFCCBC", fontSize: 13, marginTop: 2, fontWeight: "500" },
    profileBtn: { padding: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },

    // --- Floating Metrics Card ---
    headerMetricsCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        position: 'absolute',
        bottom: -35,
        alignSelf: 'center',
        width: width - 40,
        ...shadowConfig,
        shadowOpacity: 0.12,
        elevation: 6
    },
    metricBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    metricValue: { fontSize: 24, fontWeight: '800' },
    metricLabel: { fontSize: 11, color: '#777', marginTop: 4, fontWeight: '600' },
    divider: { width: 1, backgroundColor: '#EEEEEE', marginVertical: 5 },
    alertBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 2, borderRadius: 12 },

    // --- Content Area ---
    scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: "800", color: "#222" },

    // --- Grid System ---
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
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
        borderColor: '#F9F9F9'
    },
    btnIcon: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    btnLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#444' },

    // --- Wide List Cards ---
    wideAlertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F5F5F5'
    },
    cardIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardTextBox: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#333', marginBottom: 4 },
    cardSubText: { fontSize: 12, color: '#666', lineHeight: 18, fontWeight: '500' },

    // --- Emergency Button ---
    emergencyCard: {
        backgroundColor: '#C62828',
        borderRadius: 20,
        padding: 20,
        marginTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        ...emergencyShadow
    },
    emergencyIconGlow: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    emergencyTextWrap: { flex: 1 },
    emergencyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
    emergencySubText: { color: '#FFCDD2', fontSize: 12, lineHeight: 18, fontWeight: '500' },
    broadcastBox: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderColor: '#FFCC80', borderWidth: 1, marginBottom: 8 }
});