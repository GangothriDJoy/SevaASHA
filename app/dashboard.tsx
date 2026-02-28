import React , { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, Alert, Platform, TouchableOpacity, ScrollView, Dimensions} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    role: string;
    status: string;
    collection: string; // To track which table they are in
}
const AlertTab = ({ label, count, color, icon }: any) => (
    <TouchableOpacity style={[styles.alertTab, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="white" />
        <Text style={styles.alertCount}>{count}</Text>
        <Text style={styles.alertLabel}>{label}</Text>
    </TouchableOpacity>
);

const ModuleBtn = ({ label, icon, color }: any) => (
    <TouchableOpacity style={styles.moduleBtn}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={[styles.actionText, { fontSize: 10, marginTop: 5, textAlign: 'center' }]}>{label}</Text>
    </TouchableOpacity>
);
const DashboardButton = ({ icon, label, badge }: { icon: any, label: string, badge?: number }) => (
    <TouchableOpacity style={styles.actionButton}>
        <Ionicons name={icon} size={32} color="#1F7A6B" />
        <Text style={styles.actionText}>{label}</Text>
        {badge && badge > 0 ? (
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
            </View>
        ) : null}
    </TouchableOpacity>
);
const { width } = Dimensions.get("window");
export default function Dashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const userRole = String(params.role || "Admin").trim();
    const userMobile = String(params.mobile || "").trim();

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
    const [adminStats, setAdminStats] = useState({
        activeEmergencies: 0,
        pendingWorkerApprovals: 0,
        totalPregnantWomen: 0,
        highRiskPregnancies: 0,
        immunizationDue: 0,
        activeWorkers: 0,
        assignedBlock: "Today", // 👈 Add this
        malnutritionCases: 0,        // 👈 Add this
    });

    const fetchPendingUsers = async () => {
        setLoading(true);
        const allPending: UserProfile[] = [];
        const collections = ["users", "beneficiaries"];

        try {
            for (const colName of collections) {
                const q = query(collection(db, colName), where("status", "==", "Pending"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    allPending.push({ id: doc.id, ...doc.data(), collection: colName } as UserProfile);
                });
            }
            setPendingUsers(allPending);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchPendingUsers();
    }, []);
    const handleApprove = async (user: UserProfile) => {
        try {
            const userRef = doc(db, user.collection, user.id);
            await updateDoc(userRef, { status: "Approved" });

            // Remove from local list to update UI immediately
            setPendingUsers(prev => prev.filter(u => u.id !== user.id));

            const msg = `${user.firstName} has been approved.`;
            Platform.OS === 'web' ? alert(msg) : Alert.alert("Success", msg);
        } catch (error) {
            Alert.alert("Error", "Failed to approve user.");
        }
    };
// ✅ NEW SAFE CODE
    const filteredUsers = pendingUsers.filter(user => {
        const query = searchQuery.toLowerCase();

        // Convert to string and fallback to empty string "" if the data is missing
        const firstName = (user.firstName || "").toLowerCase();
        const lastName = (user.lastName || "").toLowerCase();
        const mobile = (user.mobile || "");

        return (
            firstName.includes(query) ||
            lastName.includes(query) ||
            mobile.includes(query)
        );
    });

    const renderUserItem = ({ item }: { item: UserProfile }) => (
        <View style={styles.card}>
            <View>
                <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.userSub}>{item.role} • {item.mobile}</Text>
            </View>
            <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handleApprove(item)}
            >
                <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
        </View>
    );
    const { role, mobile, name } = useLocalSearchParams();

// Keep your existing clean-up lines below it
    const userName = String(name || "User").trim(); // Create a clean string version

    return (
        <View style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeBanner}>
                <Text style={styles.welcomeText}>Welcome back, {userName}! </Text>
                <Text style={styles.infoText}>Role: {userRole}</Text>
            </View>
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.topBarName}>{userName || "User"}</Text>
                    <Text style={styles.topBarDetail}>{adminStats.assignedBlock || "Main Block"} • {new Date().toLocaleDateString()}</Text>
                </View>
                <View style={styles.topBarIcons}>
                    <TouchableOpacity style={styles.iconBtn}><Ionicons name="notifications" size={20} color="#1F7A6B" /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}><Ionicons name="settings-outline" size={20} color="#1F7A6B" /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.replace("/auth")}><Ionicons name="log-out-outline" size={20} color="#D32F2F" /></TouchableOpacity>
                </View>
            </View>
                {/* --- SUPERVISOR / ADMIN DASHBOARD --- */}
                {/* Notice we use userRole here now! */}
                {(userRole === "Supervisor" || userRole === "Admin") && (<View style={styles.adminSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertStrip}>
                        <AlertTab label="Emergencies" count={adminStats.activeEmergencies} color="#D32F2F" icon="alert-circle" />
                        <AlertTab label="High Risk" count={adminStats.highRiskPregnancies} color="#E67E22" icon="trending-up" />
                        <AlertTab label="Malnutrition" count={adminStats.malnutritionCases || 0} color="#8E44AD" icon="fitness" />
                        <AlertTab label="Missed Vax" count={adminStats.immunizationDue} color="#2980B9" icon="medkit" />
                    </ScrollView>

                        {/* 🚨 1. EMERGENCY PANEL - High Visibility */}
                        {adminStats.activeEmergencies > 0 && (
                            <TouchableOpacity style={styles.emergencyCard}>
                                <View style={styles.emergencyHeader}>
                                    <Ionicons name="warning" size={24} color="white" />
                                    <Text style={styles.emergencyTitle}>
                                        {adminStats.activeEmergencies} ACTIVE EMERGENCIES
                                    </Text>
                                </View>
                                <Text style={styles.emergencySubText}>Tap to view locations and assign teams.</Text>
                            </TouchableOpacity>
                        )}

                        {/* 🔍 2. PENDING REQUESTS SECTION */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Pending Approvals</Text>
                            <TouchableOpacity onPress={fetchPendingUsers} style={styles.iconCircle}>
                                <Ionicons name="reload" size={18} color="#1F7A6B" />
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar - Integrated into the list area */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#999" style={{marginLeft: 10}} />
                            <TextInput
                                style={styles.integratedSearchBar}
                                placeholder="Search by name or mobile..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <View style={styles.approvalListContainer}>
                            {loading ? (
                                <ActivityIndicator color="#1F7A6B" style={{ margin: 20 }} />
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.slice(0, 3).map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.compactCard}
                                        onPress={() => router.push({
                                            pathname: "/userDetail",
                                            params: { userId: item.id, collection: item.collection }
                                        })}
                                    >
                                        <View style={styles.cardInfo}>
                                            <Text style={styles.userName}>{item.firstName || "New"} {item.lastName || "User"}</Text>
                                            <Text style={styles.userSub}>{item.role} • {item.mobile}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#1F7A6B" />
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No pending requests found.</Text>
                                </View>
                            )}
                        </View>

                        {/* 📊 3. LIVE HEALTH MONITORING */}
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Health Monitoring</Text>
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
                                <Text style={styles.statLabel}>Immunizations</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{adminStats.activeWorkers}</Text>
                                <Text style={styles.statLabel}>Active Workers</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Control Center Modules</Text>
                        <View style={styles.actionGrid}>
                            <ModuleBtn label="Workers" icon="people" color="#1F7A6B" />
                            <ModuleBtn label="Mothers" icon="woman" color="#1F7A6B" />
                            <ModuleBtn label="Children" icon="happy" color="#1F7A6B" />
                            <ModuleBtn label="Analytics" icon="bar-chart" color="#2980B9" />
                            <ModuleBtn label="Area Maps" icon="map" color="#27ae60" />
                            <ModuleBtn label="Reports" icon="document-text" color="#f39c12" />
                            <ModuleBtn label="Audit Logs" icon="shield-checkmark" color="#34495e" />
                            <ModuleBtn label="Stock" icon="clipboard" color="#607d8b" />
                            <ModuleBtn label="Broadcast" icon="megaphone" color="#D32F2F" />
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
                            <Text style={styles.welcomeText}>Hello, {userName}!</Text>
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
        </ScrollView>
        </View>

    );
}

const styles = StyleSheet.create({

    subText: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    approvalListContainer: {
        marginTop: 10,
        paddingBottom: 15,
        marginLeft: 10,
        marginRight: 10,
    },
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", paddingVertical: 24, paddingHorizontal: 20 },
    headerText: { color: "white", fontSize: 22, fontWeight: "bold" },
    content: { padding: 20 },
    welcomeText: { marginTop: 20, fontSize: 24, color: '#FFFFFF', fontWeight: "bold", marginBottom: 5 },
    infoText: { fontSize: 16, marginBottom: 10 },

    adminSection: { marginTop: 10 },
    sectionTitle: { marginLeft: 15, fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 10, marginTop: 15 },

    // Emergency Panel Styles
    emergencyCard: { marginLeft: 15, marginRight: 15, backgroundColor: "#D32F2F", padding: 15, borderRadius: 12, marginBottom: 20, elevation: 4, shadowColor: "red", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
    emergencyHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    emergencyTitle: { color: "white", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
    emergencySubText: { color: "#FFCDD2", fontSize: 13 },

    // Stats Grid Styles (2x2)
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },

    // Action Grid Styles
    actionGrid: { marginLeft: 15, marginRight: 15,flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    actionButton: {width: "48%", backgroundColor: "white", padding: 20, borderRadius: 12, alignItems: "center", marginBottom: 15, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, borderWidth: 1, borderColor: "#eee" },
    actionText: { marginTop: 10, fontSize: 14, fontWeight: "600", color: "#333" },
    badge: { marginLeft: 15, marginRight: 15,position: "absolute", top: 10, right: 10, backgroundColor: "#D32F2F", borderRadius: 12, minWidth: 24, height: 24, justifyContent: "center", alignItems: "center", paddingHorizontal: 6, borderWidth: 2, borderColor: "white" },
    badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },

    logoutButton: {marginLeft: 15, marginRight: 15, backgroundColor: "#FF3B30", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 30, marginBottom: 40 },
    logoutText: { color: "white", fontWeight: "bold", fontSize: 16 },
    // --- NEW ASHA STYLES ---
    ashaSection: { marginLeft: 15, marginRight: 15,marginTop: 5 },
    tasksCard: { backgroundColor: 'white', padding: 18, borderRadius: 15, borderLeftWidth: 5, borderLeftColor: '#1F7A6B', elevation: 3, marginBottom: 10 },
    tasksHeader: { marginLeft: 15, marginRight: 15,flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    tasksTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    taskBadge: { marginLeft: 15, marginRight: 15,backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
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
        marginTop: 10,marginLeft: 15, marginRight: 15,
    },
    jphnActionBox: {
        borderColor: '#0288D1', // A calm blue for nursing/clinical roles
        backgroundColor: '#E1F5FE',
        marginLeft: 15, marginRight: 15,
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
        marginLeft: 15, marginRight: 15,
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
    searchBar: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#DDD' },
    card: {
        backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4
    },
    userName: { fontSize: 18, fontWeight: '600', color: '#333' },
    userSub: { fontSize: 14, color: '#666', marginTop: 4 },
    approveButton: { backgroundColor: '#2E7D32', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 0,
        marginLeft: 10,
        marginRight: 10,
    },
    integratedSearchBar: {
        flex: 1,
        padding: 12,
        fontSize: 14,
        marginLeft: 10,
    },
    refreshIcon: {
        padding: 5,
    },
    cardInfo: { flex: 1 },
    emptyState: {
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ccc'
    },
    compactCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0', // Very subtle border
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    statBox: {
        width: '48%', // Grid layout
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 20,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    highRiskBox: {
        backgroundColor: '#FFF5F5', // Light red tint for urgency
        borderWidth: 1,
        borderColor: '#FFE3E3',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F7A6B',
    },
    statLabel: {
        fontSize: 12,
        color: '#7F8C8D',
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
    iconCircle: {
        backgroundColor: '#E8F2F0',
        padding: 8,
        borderRadius: 20,
    },
    welcomeBanner: {
        backgroundColor: '#1F7A6B', // Your teal color
        padding: 20,
        borderRadius: 0,
        marginBottom: 20,
        // Adds a slight lift to the banner
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginLeft: 0, marginRight: 0,
    },
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: 10
    },
    topBarName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    topBarDetail: { fontSize: 12, color: '#666' },
    topBarIcons: { flexDirection: 'row', gap: 10 },
    iconBtn: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
    alertStrip: { paddingVertical: 12, marginBottom: 10 },
    alertTab: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
            borderRadius: 12, marginRight: 10, elevation: 3
    },
    alertCount: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    alertLabel: { color: 'white', fontSize: 11, marginLeft: 4 },
    moduleBtn: {
        width: '31%', aspectRatio: 1, backgroundColor: 'white',
            borderRadius: 15, justifyContent: 'center', alignItems: 'center',
            marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0'
    }
});
