import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Dashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Force the parameters to be clean strings so our IF statements work perfectly!
    const userRole = String(params.role || "Admin").trim();
    const userMobile = String(params.mobile || "").trim();

    // Expanded Mock Data based on your new specifications
    const adminStats = {
        activeEmergencies: 2,
        pendingWorkerApprovals: 5,
        totalPregnantWomen: 342,
        highRiskPregnancies: 18,
        immunizationDue: 45,
        activeWorkers: 124,
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Admin Control Center</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.welcomeText}>Welcome back, Supervisor!</Text>
                <Text style={styles.infoText}>Role: {userRole}</Text>

                {/* --- SUPERVISOR / ADMIN DASHBOARD --- */}
                {/* Notice we use userRole here now! */}
                {(userRole === "Supervisor" || userRole === "Admin") && (
                    <View style={styles.adminSection}>

                        {/* 🚨 4. EMERGENCY CONTROL PANEL (Only shows if there are emergencies) */}
                        {adminStats.activeEmergencies > 0 && (
                            <TouchableOpacity style={styles.emergencyCard}>
                                <View style={styles.emergencyHeader}>
                                    <Ionicons name="warning" size={24} color="white" />
                                    <Text style={styles.emergencyTitle}>ACTIVE EMERGENCIES ({adminStats.activeEmergencies})</Text>
                                </View>
                                <Text style={styles.emergencySubText}>Tap to view locations, assign response teams, and update status.</Text>
                            </TouchableOpacity>
                        )}

                        {/* 📊 3. HEALTH MONITORING DASHBOARD */}
                        <Text style={styles.sectionTitle}>Live Health Monitoring</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{adminStats.totalPregnantWomen}</Text>
                                <Text style={styles.statLabel}>Total Pregnancies</Text>
                            </View>
                            <View style={[styles.statBox, styles.highRiskBox]}>
                                <Text style={[styles.statNumber, {color: '#D32F2F'}]}>{adminStats.highRiskPregnancies}</Text>
                                <Text style={[styles.statLabel, {color: '#D32F2F'}]}>High Risk</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{adminStats.immunizationDue}</Text>
                                <Text style={styles.statLabel}>Immunizations Due</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{adminStats.activeWorkers}</Text>
                                <Text style={styles.statLabel}>Active Workers</Text>
                            </View>
                        </View>

                        {/* 🎛️ CORE MODULES GRID (1, 2, 5, 6, 7) */}
                        <Text style={styles.sectionTitle}>System Management</Text>
                        <View style={styles.actionGrid}>

                            {/* 2. Approval System */}
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="checkmark-circle" size={32} color="#1F7A6B" />
                                <Text style={styles.actionText}>Approvals</Text>
                                {adminStats.pendingWorkerApprovals > 0 && (
                                    <View style={styles.badge}><Text style={styles.badgeText}>{adminStats.pendingWorkerApprovals}</Text></View>
                                )}
                            </TouchableOpacity>

                            {/* 1. User Management */}
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="people" size={32} color="#1F7A6B" />
                                <Text style={styles.actionText}>Manage Users</Text>
                            </TouchableOpacity>

                            {/* 6. Worker Performance */}
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="trending-up" size={32} color="#1F7A6B" />
                                <Text style={styles.actionText}>Performance</Text>
                            </TouchableOpacity>

                            {/* 5. Reports & Analytics */}
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="pie-chart" size={32} color="#1F7A6B" />
                                <Text style={styles.actionText}>Reports</Text>
                            </TouchableOpacity>

                            {/* 7. Area Mapping */}
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="map" size={32} color="#1F7A6B" />
                                <Text style={styles.actionText}>Area Mapping</Text>
                            </TouchableOpacity>

                            {/* Extra: Broadcast/Messaging */}
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="megaphone" size={32} color="#1F7A6B" />
                                <Text style={styles.actionText}>Broadcast</Text>
                            </TouchableOpacity>

                        </View>
                    </View>
                )}

                {/* ... (Keep your ASHA Worker and Mother UI blocks here if you still have them) ... */}

                <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace("/auth")}>
                    <Text style={styles.logoutText}>LOGOUT</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", paddingVertical: 24, paddingHorizontal: 20 },
    headerText: { color: "white", fontSize: 22, fontWeight: "bold" },
    content: { padding: 20 },
    welcomeText: { fontSize: 24, fontWeight: "bold", marginBottom: 5 },
    infoText: { fontSize: 16, color: "#555", marginBottom: 10 },

    adminSection: { marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 15, marginTop: 15 },

    // Emergency Panel Styles
    emergencyCard: { backgroundColor: "#D32F2F", padding: 15, borderRadius: 12, marginBottom: 20, elevation: 4, shadowColor: "red", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
    emergencyHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    emergencyTitle: { color: "white", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
    emergencySubText: { color: "#FFCDD2", fontSize: 13 },

    // Stats Grid Styles (2x2)
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },
    statBox: { width: "48%", backgroundColor: "white", padding: 15, borderRadius: 12, alignItems: "center", marginBottom: 15, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, borderWidth: 1, borderColor: "#eee" },
    highRiskBox: { borderColor: "#FFCDD2", backgroundColor: "#FFEBEE" },
    statNumber: { fontSize: 24, fontWeight: "bold", color: "#1F7A6B" },
    statLabel: { fontSize: 12, color: "#666", marginTop: 4, textAlign: "center", fontWeight: "500" },

    // Action Grid Styles
    actionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    actionButton: { width: "48%", backgroundColor: "white", padding: 20, borderRadius: 12, alignItems: "center", marginBottom: 15, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, borderWidth: 1, borderColor: "#eee" },
    actionText: { marginTop: 10, fontSize: 14, fontWeight: "600", color: "#333" },
    badge: { position: "absolute", top: 10, right: 10, backgroundColor: "#D32F2F", borderRadius: 12, minWidth: 24, height: 24, justifyContent: "center", alignItems: "center", paddingHorizontal: 6, borderWidth: 2, borderColor: "white" },
    badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },

    logoutButton: { backgroundColor: "#FF3B30", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 30, marginBottom: 40 },
    logoutText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
