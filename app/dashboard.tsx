import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

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

    const ashaStats = {
        todayVisits: 8,
        ancDue: 3,
        immunizationDue: 5,
        completedVisits: 28,
        targetVisits: 40
    };

    const jphnStats = {
        totalSubCenterPopulation: 4500,
        activeAshaWorkers: 8,
        pendingHighRiskReferrals: 4,
        scheduledVaccinationCamps: 2,
        ancVisitsPending: 15,
    };

    const motherStats = {
        weeksPregnant: 24,
        nextCheckup: "March 15, 2026",
        lastWeight: "62 kg",
        ironTabletsRemaining: 12,
        assignedAsha: "Anitha Devi",
    };

    const awwStats = {
        totalChildren: 42,
        pregnantMothers: 12,
        nutriAlerts: 3,
        vaccineDue: 5,
        pendingStock: "80%"
    };

    // Add 'name' to the destructuring here
    const { role, mobile, name } = useLocalSearchParams();

// Keep your existing clean-up lines below it
    const userName = String(name || "User").trim(); // Create a clean string version

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    {userRole === "Mother" ? "My Health Dashboard" : "Control Center"}
                </Text>
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
                {/* --- 🎯 ASHA WORKER DASHBOARD (NEW) --- */}
                {userRole === "ASHA Worker" && (
                    <View style={styles.ashaSection}>

                        {/* 2. Tasks for Today Card */}
                        <TouchableOpacity style={styles.tasksCard}>
                            <View style={styles.tasksHeader}>
                                <Text style={styles.tasksTitle}>Tasks for Today</Text>
                                <View style={styles.taskBadge}><Text style={styles.taskBadgeText}>{ashaStats.todayVisits} Due</Text></View>
                            </View>
                            <View style={styles.taskRow}>
                                <Ionicons name="calendar-outline" size={18} color="#666" />
                                <Text style={styles.taskItem}>{ashaStats.ancDue} ANC Checkups • {ashaStats.immunizationDue} Immunizations</Text>
                            </View>
                        </TouchableOpacity>

                        {/* 1. Beneficiary & Data Entry Grid */}
                        <Text style={styles.sectionTitle}>Beneficiary Management</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="person-add" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Add New</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="list" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>My Records</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="fitness" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Health Entry</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="journal" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Visit Log</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 3. Emergency SOS */}
                        <TouchableOpacity
                            style={[styles.emergencyCard, {marginTop: 10}]}
                            onPress={() => {
                                alert("SOS Alert Sent to Supervisor!");
                                return;
                            }}
                        >
                            <View style={styles.emergencyHeader}>
                                <Ionicons name="alert-circle" size={26} color="white" />
                                <Text style={styles.emergencyTitle}>EMERGENCY SOS</Text>
                            </View>
                            <Text style={styles.emergencySubText}>Press to alert supervisor of a high-risk medical emergency.</Text>
                        </TouchableOpacity>

                        {/* 6. Notifications */}
                        <Text style={styles.sectionTitle}>Recent Notifications</Text>
                        <View style={styles.notifyBox}>
                            <Ionicons name="notifications" size={20} color="#1F7A6B" />
                            <Text style={styles.notifyText}>New Govt Scheme: Matru Vandana update available.</Text>
                        </View>

                        {/* 7. Simple Performance */}
                        <View style={styles.performanceRow}>
                            <Text style={styles.performanceLabel}>Monthly Visits Completed: </Text>
                            <Text style={styles.performanceValue}>28 / 40</Text>
                        </View>
                    </View>
                )}

                {/* --- 🩺 JPHN DASHBOARD --- */}
                {userRole === "JPHN" && (
                    <View style={styles.jphnSection}>
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                {/* Updated to use JPHN color */}
                                <Text style={styles.jphnStatNumber}>{jphnStats.activeAshaWorkers}</Text>
                                <Text style={styles.statLabel}>ASHAs under you</Text>
                            </View>

                            <View style={[styles.statBox, {borderColor: '#FBC02D'}]}>
                                <Text style={[styles.statNumber, {color: '#FBC02D'}]}>{jphnStats.pendingHighRiskReferrals}</Text>
                                <Text style={styles.statLabel}>High-Risk Referrals</Text>
                            </View>
                        </View>
                        {/* 1. Sub-Center Overview */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{jphnStats.activeAshaWorkers}</Text>
                                <Text style={styles.statLabel}>ASHAs under you</Text>
                            </View>
                            <View style={[styles.statBox, {borderColor: '#FBC02D'}]}>
                                <Text style={[styles.statNumber, {color: '#FBC02D'}]}>{jphnStats.pendingHighRiskReferrals}</Text>
                                <Text style={styles.statLabel}>High-Risk Referrals</Text>
                            </View>
                        </View>

                        {/* 2. Urgent Actions Card */}
                        <TouchableOpacity style={styles.tasksCard}>
                            <View style={styles.tasksHeader}>
                                <Text style={styles.tasksTitle}>Sub-Center Priorities</Text>
                                <View style={[styles.taskBadge, {backgroundColor: '#FFF3E0'}]}>
                                    <Text style={[styles.taskBadgeText, {color: '#E65100'}]}>Action Required</Text>
                                </View>
                            </View>
                            <Text style={styles.taskItem}>• {jphnStats.ancVisitsPending} ANC follow-ups overdue in your sector.</Text>
                            <Text style={styles.taskItem}>• {jphnStats.scheduledVaccinationCamps} Vaccination camps this week.</Text>
                        </TouchableOpacity>

                        {/* 3. Core Modules for JPHN */}
                        <Text style={styles.sectionTitle}>Field Operations</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="git-network" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>ASHA Reports</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="medical" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Immunization</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="document-text" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Death/Birth Reg</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="analytics" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Sector Stats</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {userRole === "Anganwadi Worker" && (
                    <View style={styles.awwSection}>

                        {/* 1. Overview Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={[styles.statNumber, {color: '#2E7D32'}]}>{awwStats.totalChildren}</Text>
                                <Text style={styles.statLabel}>Total Children</Text>
                            </View>
                            <View style={[styles.statBox, {borderColor: '#BBDEFB'}]}>
                                <Text style={[styles.statNumber, {color: '#1565C0'}]}>{awwStats.pregnantMothers}</Text>
                                <Text style={styles.statLabel}>Linked Mothers</Text>
                            </View>
                            <View style={[styles.statBox, {borderColor: '#FFE0B2', backgroundColor: '#FFF3E0'}]}>
                                <Text style={[styles.statNumber, {color: '#E65100'}]}>{awwStats.nutriAlerts}</Text>
                                <Text style={[styles.statLabel, {color: '#E65100'}]}>Nutri-Alerts</Text>
                            </View>
                            <View style={[styles.statBox, {borderColor: '#E1BEE7'}]}>
                                <Text style={[styles.statNumber, {color: '#8E24AA'}]}>{awwStats.vaccineDue}</Text>
                                <Text style={styles.statLabel}>Vaccines Due</Text>
                            </View>
                        </View>

                        {/* 2. Management Modules */}
                        <Text style={styles.sectionTitle}>Center Management</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="person-add" size={30} color="#FF9800" />
                                <Text style={styles.actionText}>Add Child</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="trending-up" size={30} color="#FF9800" />
                                <Text style={styles.actionText}>Growth Chart</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="fast-food" size={30} color="#FF9800" />
                                <Text style={styles.actionText}>Food Dist.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="calendar" size={30} color="#FF9800" />
                                <Text style={styles.actionText}>Attendance</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 3. Supplementary Stock */}
                        <TouchableOpacity style={styles.wideCard}>
                            <Ionicons name="clipboard-outline" size={24} color="#333" />
                            <View style={{ marginLeft: 15, flex: 1 }}>
                                <Text style={styles.wideCardTitle}>Stock Status</Text>
                                <Text style={styles.wideCardSub}>Supplementary food stock is {awwStats.pendingStock}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        {/* 4. Emergency SOS */}
                        <TouchableOpacity
                            style={[styles.emergencyCard, {marginTop: 20}]}
                            onPress={() => alert("Emergency Alert Raised!")}
                        >
                            <View style={styles.emergencyHeader}>
                                <Ionicons name="alert-circle" size={26} color="white" />
                                <Text style={styles.emergencyTitle}>RAISE EMERGENCY ALERT</Text>
                            </View>
                            <Text style={styles.emergencySubText}>Notify PHC and Supervisor immediately for maternal/child emergencies.</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- 🤰 MOTHER / BENEFICIARY DASHBOARD --- */}
                {userRole === "Mother" && (
                    <View style={styles.motherSection}>
                        {/* 1. Pregnancy Progress Card */}
                        <View style={styles.progressCard}>
                            <Text style={styles.welcomeText}>Hello, {userName}!</Text><Text style={styles.welcomeText}>Hello, {userName}!</Text>
                            <View style={styles.weekCircle}>
                                <Text style={styles.weekNumber}>{motherStats.weeksPregnant}</Text>
                                <Text style={styles.weekLabel}>Weeks</Text>
                            </View>
                            <Text style={styles.subText}>You are in your 2nd Trimester</Text>
                        </View>

                        {/* 2. Upcoming Appointment */}
                        <View style={styles.appointmentBox}>
                            <Ionicons name="calendar" size={24} color="#E91E63" />
                            <View style={{ marginLeft: 10 }}>
                                <Text style={styles.appointmentTitle}>Next Clinic Visit</Text>
                                <Text style={styles.appointmentDate}>{motherStats.nextCheckup}</Text>
                            </View>
                        </View>

                        {/* 3. Quick Action Grid */}
                        <Text style={styles.sectionTitle}>My Health Tools</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="fitness" size={30} color="#E91E63" />
                                <Text style={styles.actionText}>Weight Log</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="book" size={30} color="#E91E63" />
                                <Text style={styles.actionText}>Health Tips</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="call" size={30} color="#E91E63" />
                                <Text style={styles.actionText}>Contact ASHA</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="medkit" size={30} color="#E91E63" />
                                <Text style={styles.actionText}>Medicine</Text>
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

    subText: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },

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
    // --- NEW ASHA STYLES ---
    ashaSection: { marginTop: 5 },
    tasksCard: { backgroundColor: 'white', padding: 18, borderRadius: 15, borderLeftWidth: 5, borderLeftColor: '#1F7A6B', elevation: 3, marginBottom: 10 },
    tasksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    tasksTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    taskBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    taskBadgeText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
    taskRow: { flexDirection: 'row', alignItems: 'center' },
    taskItem: { marginLeft: 8, color: '#555', fontSize: 14 },
    notifyBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
    notifyText: { marginLeft: 10, fontSize: 13, color: '#00695C', flex: 1 },
    performanceRow: { flexDirection: 'row', marginTop: 20, padding: 10, backgroundColor: '#eee', borderRadius: 8, justifyContent: 'center' },
    performanceLabel: { color: '#666', fontWeight: '500' },
    performanceValue: { color: '#1F7A6B', fontWeight: 'bold' },

    // ... existing styles ...

    // --- JPHN SPECIFIC STYLES ---
    jphnSection: {
        marginTop: 10
    },
    jphnActionBox: {
        borderColor: '#0288D1', // A calm blue for nursing/clinical roles
        backgroundColor: '#E1F5FE',
    },
    jphnStatNumber: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0288D1",
    },

    motherSection: { marginTop: 10 },
    progressCard: {
        backgroundColor: '#FCE4EC', // Light Pink
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    weekCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 5,
        borderColor: '#E91E63',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 15,
    },
    weekNumber: { fontSize: 30, fontWeight: 'bold', color: '#E91E63' },
    weekLabel: { fontSize: 14, color: '#888' },
    appointmentBox: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        borderLeftWidth: 5,
        borderLeftColor: '#E91E63',
        marginBottom: 20,
    },
    // --- Anganwadi Worker (AWW) Specific Styles ---
    awwSection: {
        marginTop: 10
    },
    wideCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 15
    },
    wideCardTitle: {
        fontWeight: "bold",
        fontSize: 16,
        color: '#333'
    },
    wideCardSub: {
        color: "#777",
        fontSize: 13,
        marginTop: 4
    },
    appointmentTitle: { fontWeight: 'bold', fontSize: 16 },
    appointmentDate: { color: '#E91E63', fontSize: 14 },
});
