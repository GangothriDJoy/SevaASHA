import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, Alert, Platform, TouchableOpacity, ScrollView, Modal, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, collectionGroup, query, where, getDocs, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    userMobile: string;
    role: string;
    status: string;
    collection: string;
}

const AlertTab = ({ label, count, color, icon, onPress, style }: any) => (
    <TouchableOpacity style={[styles.alertTab, { backgroundColor: color }, style]} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={icon} size={18} color="white" />
        <Text style={styles.alertCount}>{count}</Text>
        <Text style={styles.alertLabel}>{label}</Text>
    </TouchableOpacity>
);

const ModuleBtn = ({ label, icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.moduleBtn} onPress={onPress}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={[styles.actionText, { fontSize: 10, marginTop: 5, textAlign: 'center' }]}>{label}</Text>
    </TouchableOpacity>
);

const StatBox = ({ number, label, color, onPress }: any) => (
    <TouchableOpacity
        style={[styles.statBox, { borderLeftColor: color }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.statNumber, { color: color }]}>{number}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
);

export default function AdminDashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { role, name } = useLocalSearchParams();

    const userRole = String(role || "Supervisor").trim();
    const userMobile = String(params.userMobile || "").trim();
    const userName = String(name || "Supervisor User").trim();

    const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [adminStats, setAdminStats] = useState({
        activeEmergencies: 0,
        totalPregnantWomen: 0,
        highRiskPregnancies: 0,
        benHighRisk: 0, 
        householdHighRisk: 0,
        immunizationDue: 0,
        activeWorkers: 0,
        assignedBlock: "Main Block",
        malnutritionCases: 0,
        hmChildren: 0,
        benChildren: 0,
        usersChildren: 0,
        hmPregnancies: 0,
        usersPregnancies: 0
    });

    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);

    const navigateTo = (path: string, label: string) => {
        router.push({ pathname: path as any, params: { userMobile: userMobile, title: label, role: userRole } });
    };

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

    useEffect(() => {
        let internalCount = -1;

        const qHighRisk = query(collectionGroup(db, "high_risk"), where("healthIssues", "==", "High Risk"));
        const unsubHighRisk = onSnapshot(qHighRisk, (snapshot) => {
            setAdminStats(prev => ({ ...prev, highRiskPregnancies: snapshot.size }));
        }, (error) => console.error("High Risk Check Error:", error.message));

        const qBenHighRisk = query(collection(db, "beneficiaries"), where("role", "==", "Mother"));
        const unsubBenHighRisk = onSnapshot(qBenHighRisk, (snapshot) => {
            let count = 0;
            snapshot.forEach((doc) => {
                const healthStr = (doc.data().healthIssues || "").toLowerCase();
                if(healthStr && healthStr !== "none" && healthStr !== "normal" && healthStr !== "-select-") {
                     count++;
                }
            });
            setAdminStats(prev => ({ ...prev, benHighRisk: count }));
        }, (error) => console.error("Beneficiary High Risk Check Error:", error.message));

        const qMalnutrition = query(collectionGroup(db, "high_risk"), where("malnutritionStatus", "==", "Flagged"));
        const unsubMalnutrition = onSnapshot(qMalnutrition, (snapshot) => {
            setAdminStats(prev => ({ ...prev, malnutritionCases: snapshot.size }));
        }, (error) => console.error("Malnutrition Check Error:", error.message));

        const qHousehold = query(collection(db, "household_members"));
        const unsubHousehold = onSnapshot(qHousehold, (snapshot) => {
            let hrCount = 0;
            let childrenCount = 0;
            let pregCount = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                const bp = data.bloodPressure || "";
                const sys = parseInt(bp.split("/")[0]) || 0;
                const dia = parseInt(bp.split("/")[1]) || 0;
                const hasHighBp = sys >= 140 || dia >= 90 || parseInt(bp) >= 140;
                const sugar = parseInt(data.sugarLevel) || 0;
                const hasHighSugar = sugar >= 140;
                const conditions = data.chronicConditions || [];
                
                if (hasHighBp || hasHighSugar || conditions.length > 0) hrCount++;

                const ageNum = parseInt(data.age);
                if (!isNaN(ageNum) && ageNum <= 5) childrenCount++;
                if (data.childrenDetails && Array.isArray(data.childrenDetails)) childrenCount += data.childrenDetails.length;
                
                const isPregnant = data.isPregnant === true || data.pregnancyStatus === "Pregnant" || data.category === "Pregnant";
                if (isPregnant) pregCount++;
            });
            setAdminStats(prev => ({ ...prev, householdHighRisk: hrCount, hmChildren: childrenCount, hmPregnancies: pregCount }));
        }, (error) => console.error("Household Check Error:", error.message));

        const qBenChildren = query(collection(db, "beneficiaries"));
        const unsubBenChildren = onSnapshot(qBenChildren, (snapshot) => {
            let c = 0;
            let p = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.isChild === true || data.category === "Child" || data.role === "Child") c++;
                if (data.childrenDetails && Array.isArray(data.childrenDetails)) c += data.childrenDetails.length;
                
                const isPregnant = data.isPregnant === true || data.pregnancyStatus === "Pregnant" || data.category === "Pregnant";
                if (isPregnant) p++;
            });
            setAdminStats(prev => ({ ...prev, benChildren: c, totalPregnantWomen: p }));
        });

        const qUsersMother = query(collection(db, "users"), where("role", "==", "Mother"));
        const unsubUsersMother = onSnapshot(qUsersMother, (snapshot) => {
            let c = 0;
            let pUsers = 0; 
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.childrenDetails && Array.isArray(data.childrenDetails)) c += data.childrenDetails.length;
                const isPregnant = data.isPregnant === true || data.pregnancyStatus === "Pregnant" || data.category === "Pregnant";
                if (isPregnant) pUsers++;
            });
            setAdminStats(prev => ({ ...prev, usersChildren: c, usersPregnancies: pUsers })); 
        });

        const todayISO = new Date().toISOString();
        const qMissedVax = query(collection(db, "vaccine_cards"), where("status", "==", "Pending"));
        const unsubMissedVax = onSnapshot(qMissedVax, (snapshot) => {
            const children = new Set();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.dueDate && data.dueDate < todayISO && data.childId) {
                    children.add(data.childId);
                }
            });
            setAdminStats(prev => ({ ...prev, immunizationDue: children.size }));
        }, (error) => console.error("Missed Vax Check Error:", error.message));

        const validWorkerRoles = ["ASHA Worker", "Anganwadi Worker", "JPHN"];
        const qWorkers = query(collection(db, "users"), where("role", "in", validWorkerRoles));
        const unsubWorkers = onSnapshot(qWorkers, (snapshot) => {
            let count = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === "Approved" || data.status === "Active") {
                    count++;
                }
            });
            setAdminStats(prev => ({ ...prev, activeWorkers: count }));
        }, (error) => console.error("Worker Check Error:", error.message));

        const qEmergency = query(collection(db, "emergency"), where("status", "==", "UNRESOLVED"));
        const unsubEmergency = onSnapshot(qEmergency, (snapshot: any) => {
            const currentCount = snapshot.size;
            if (internalCount !== -1 && currentCount > internalCount) {
                triggerEmergencyAlert(currentCount);
            }
            internalCount = currentCount;
            setAdminStats(prev => ({ ...prev, activeEmergencies: currentCount }));
        }, (error: any) => console.error("Emergency Check Error:", error.message));

        const qNotifications = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(40));
        const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.targetRole === userRole || data.targetRole === "All") {
                    list.push({ id: docSnap.id, ...data });
                }
            });
            setNotifications(list);
        });

        return () => {
            unsubMissedVax();
            unsubHighRisk();
            unsubBenHighRisk();
            unsubMalnutrition();
            unsubHousehold();
            unsubBenChildren();
            unsubUsersMother();
            unsubWorkers();
            unsubEmergency();
            unsubNotifications();
        };
    }, []);

    const triggerEmergencyAlert = (count: number) => {
        if (Platform.OS === 'web') {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
            audio.play().catch(e => console.log("Audio play blocked by browser."));
            alert(`🚨 EMERGENCY ALERT: There are now ${count} unresolved emergencies!`);
        } else {
            Alert.alert(
                "🚨 EMERGENCY ALERT",
                `A new SOS has been triggered. Total active: ${count}`,
                [{ text: "View Now", onPress: () => router.push("/emergency") }]
            );
        }
    };

    const filteredUsers = pendingUsers.filter(user => {
        const queryStr = searchQuery.toLowerCase();
        const firstName = (user.firstName || "").toLowerCase();
        const lastName = (user.lastName || "").toLowerCase();
        const mobile = (user.userMobile || "");
        return (firstName.includes(queryStr) || lastName.includes(queryStr) || mobile.includes(queryStr));
    });

    const totalChildrenMerged = adminStats.hmChildren + adminStats.benChildren + adminStats.usersChildren;
    const totalMissedVax = adminStats.immunizationDue;
    const totalImmunizationTargets = totalChildrenMerged + adminStats.totalPregnantWomen + adminStats.hmPregnancies + adminStats.usersPregnancies;

    const unreadCount = notifications.filter(n => n.read === false).length;

    const handleNotificationPress = async (notif: any) => {
        if (!notif.read) {
            try { await updateDoc(doc(db, "notifications", notif.id), { read: true }); }
            catch (e) { console.error("Error marking read", e); }
        }
    };

    const getRelativeTime = (timestamp: any) => {
        if (!timestamp) return "Just now";
        const now = new Date();
        const past = timestamp.toDate();
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} mins ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${Math.floor(diffHours / 24)} days ago`;
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.welcomeBanner}>
                <Text style={styles.welcomeText}>Welcome back, {userName}! </Text>
                <Text style={styles.infoText}>Role: {userRole}</Text>
            </View>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.topBar}>
                    <View>
                        <Text style={styles.topBarName}>{userName}</Text>
                        <Text style={styles.topBarDetail}>{adminStats.assignedBlock} • {new Date().toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.topBarIcons}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setIsNotifModalVisible(true)}>
                            <Ionicons name="notifications" size={20} color="#1F7A6B" />
                            {unreadCount > 0 && (
                                <View style={styles.badgeNotif}>
                                    <Text style={styles.badgeNotifText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/settings', params: { role: userRole, name: userName } })}><Ionicons name="settings-outline" size={20} color="#1F7A6B" /></TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.replace("/auth")}><Ionicons name="log-out-outline" size={20} color="#D32F2F" /></TouchableOpacity>
                    </View>
                </View>

                <View style={styles.adminSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertStrip}>
                        <AlertTab label="Emergencies" count={adminStats.activeEmergencies} color={adminStats.activeEmergencies > 0 ? "#FF0000" : "#D32F2F"} icon="alert-circle" style={adminStats.activeEmergencies > 0 ? styles.pulseGlow : null} onPress={() => navigateTo("/emergency", "Active Emergencies")} />
                        <AlertTab label="High Risk" count={adminStats.highRiskPregnancies + (adminStats.benHighRisk || 0) + (adminStats.householdHighRisk || 0)} color="#E67E22" icon="trending-up" onPress={() => navigateTo("/high-risk", "High Risk")} />
                        <AlertTab label="Malnutrition" count={adminStats.malnutritionCases || 0} color="#8E44AD" icon="fitness" onPress={() => navigateTo("/malnutrition", "Malnutrition Alerts")} />
                        <AlertTab label="Missed Vax" count={totalMissedVax} color="#2980B9" icon="medkit" onPress={() => navigateTo("/missed-vax", "Missed Vaccinations")} />
                    </ScrollView>

                    {adminStats.activeEmergencies > 0 && (
                        <TouchableOpacity style={styles.emergencyCard} onPress={() => navigateTo("/emergency", "Active Emergencies")}>
                            <View style={styles.emergencyHeader} >
                                <Ionicons name="warning" size={24} color="white" />
                                <Text style={styles.emergencyTitle}>
                                    {adminStats.activeEmergencies} ACTIVE EMERGENCIES
                                </Text>
                            </View>
                            <Text style={styles.emergencySubText}>Tap to view locations and assign teams.</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Pending Approvals</Text>
                        <TouchableOpacity onPress={fetchPendingUsers} style={styles.iconCircle}>
                            <Ionicons name="reload" size={18} color="#1F7A6B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#999" style={{ marginLeft: 10 }} />
                        <TextInput
                            style={[styles.integratedSearchBar, { color: '#333' }]}
                            placeholder="Search by name or mobile..."
                            placeholderTextColor="#666"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.approvalListContainer}>
                        {loading ? (
                            <ActivityIndicator color="#1F7A6B" style={{ margin: 20 }} />
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.slice(0, 5).map((item) => (
                                <TouchableOpacity key={item.id} style={styles.compactCard} onPress={() => router.push({ pathname: "/userDetail", params: { userId: item.id, collection: item.collection } })}>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.userName}>{item.firstName || "New"} {item.lastName || "User"}</Text>
                                        <Text style={styles.userSub}>{item.role} • {item.userMobile}</Text>
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

                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Health Monitoring</Text>
                    <View style={styles.statsGrid}>
                        <StatBox number={adminStats.totalPregnantWomen + adminStats.hmPregnancies + adminStats.usersPregnancies} label="Total Pregnancies" color="#1F7A6B" onPress={() => navigateTo("/maternal-registry", "Total Pregnancies")} />
                        <StatBox number={adminStats.highRiskPregnancies + (adminStats.benHighRisk || 0) + (adminStats.householdHighRisk || 0)} label="High Risk" color="#E74C3C" onPress={() => navigateTo("/high-risk", "High Risk Tracking")} />
                        <StatBox number={totalImmunizationTargets} label="Immunizations" color="#3498DB" onPress={() => navigateTo("/vaccination", "Vaccination Tracking")} />
                        <StatBox number={adminStats.activeWorkers} label="Active Workers" color="#2ECC71" onPress={() => navigateTo("/worker-management", "Worker Status")} />
                    </View>

                    <Text style={styles.sectionTitle}>Control Center Modules</Text>
                    <View style={styles.actionGrid}>
                        <ModuleBtn label="Workers" icon="people" color="#1F7A6B" onPress={() => navigateTo("/worker-management", "ASHA Workers")} />
                        <ModuleBtn label="Mothers" icon="woman" color="#8E44AD" onPress={() => navigateTo("/maternal-registry", "Maternal Registry")} />
                        <ModuleBtn label="Children" icon="happy" color="#2980B9" onPress={() => navigateTo("/child-registry", "Child Registry")} />
                        <ModuleBtn label="Analytics" icon="bar-chart" color="#E67E22" onPress={() => navigateTo("/analytics", "Sector Analytics")} />
                        <ModuleBtn label="Area Maps" icon="map" color="#27AE60" onPress={() => navigateTo("/area-maps", "GIS Mapping")} />
                        <ModuleBtn label="Reports" icon="document-text" color="#F39C12" onPress={() => navigateTo("/reports", "Export Reports")} />
                        <ModuleBtn label="Audit Logs" icon="shield-checkmark" color="#34495E" onPress={() => navigateTo("/audit-logs", "System Audits")} />
                        <ModuleBtn label="Stock" icon="clipboard" color="#607D8B" onPress={() => navigateTo("/medicine-stock", "Inventory")} />
                        <ModuleBtn label="Broadcast" icon="megaphone" color="#D32F2F" onPress={() => navigateTo("/broadcast", "Send Alerts")} />
                    </View>
                </View>
            </ScrollView>

            <Modal visible={isNotifModalVisible} transparent={true} animationType="slide" onRequestClose={() => setIsNotifModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Notifications</Text>
                            <TouchableOpacity onPress={() => setIsNotifModalVisible(false)} style={{ padding: 5 }}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                let iconName = "notifications";
                                let iconColor = "#1F7A6B";
                                if (item.type === "alert") { iconName = "warning"; iconColor = "#D32F2F"; }
                                else if (item.type === "success") { iconName = "checkmark-circle"; iconColor = "#2E7D32"; }
                                else if (item.type === "info") { iconName = "information-circle"; iconColor = "#0288D1"; }

                                return (
                                    <TouchableOpacity 
                                        style={[styles.notifCard, item.read ? styles.notifRead : styles.notifUnread]}
                                        onPress={() => handleNotificationPress(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.notifIconWrap, { backgroundColor: iconColor + '20' }]}>
                                            <Ionicons name={iconName as any} size={22} color={iconColor} />
                                        </View>
                                        <View style={styles.notifTextWrap}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Text style={styles.notifItemTitle} numberOfLines={1}>{item.title || "Alert"}</Text>
                                                <Text style={styles.notifTime}>{getRelativeTime(item.createdAt)}</Text>
                                            </View>
                                            <Text style={styles.notifItemMsg} numberOfLines={2}>{item.message}</Text>
                                        </View>
                                        {!item.read && <View style={styles.unreadDot} />}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyNotif}>
                                    <Ionicons name="notifications-off-outline" size={40} color="#ccc" />
                                    <Text style={styles.emptyNotifText}>No notifications right now.</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginLeft: 15, marginRight: 15, flex: 1, backgroundColor: "#F4F6F8" },
    adminSection: { marginTop: 10, paddingBottom: 30 },
    welcomeBanner: { backgroundColor: '#1F7A6B', padding: 20, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
    welcomeText: { marginTop: 20, fontSize: 24, color: '#FFFFFF', fontWeight: "bold", marginBottom: 5 },
    infoText: { fontSize: 16, color: '#e0f2f1', marginBottom: 10 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: 10, borderRadius: 10, marginBottom: 15 },
    topBarName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    topBarDetail: { fontSize: 12, color: '#666' },
    topBarIcons: { flexDirection: 'row', gap: 10 },
    iconBtn: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
    alertStrip: { paddingVertical: 12, marginBottom: 10 },
    alertTab: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginRight: 10, elevation: 3 },
    alertCount: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    alertLabel: { color: 'white', fontSize: 13, marginLeft: 6, fontWeight: '500' },
    pulseGlow: { borderWidth: 3, borderColor: '#FFF', shadowColor: "#FF0000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 },
    emergencyCard: { backgroundColor: "#D32F2F", padding: 15, borderRadius: 12, marginBottom: 20, elevation: 4, shadowColor: "red", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
    emergencyHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    emergencyTitle: { color: "white", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
    emergencySubText: { color: "#FFCDD2", fontSize: 13 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 15 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
    iconCircle: { backgroundColor: '#E8F2F0', padding: 8, borderRadius: 20 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
    integratedSearchBar: { flex: 1, padding: 12, fontSize: 14, marginLeft: 10 },
    approvalListContainer: { paddingBottom: 10 },
    compactCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
    cardInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '600', color: '#333' },
    userSub: { fontSize: 13, color: '#666', marginTop: 4 },
    emptyState: { padding: 30, alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
    emptyText: { textAlign: 'center', color: '#999', fontSize: 15 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },
    statBox: { width: '48%', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, marginBottom: 12, borderLeftWidth: 5, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    statNumber: { fontSize: 24, fontWeight: 'bold' },
    statLabel: { fontSize: 13, color: '#7F8C8D', fontWeight: '600', marginTop: 4, textAlign: 'center' },
    actionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 10 },
    moduleBtn: { width: '31%', aspectRatio: 1, backgroundColor: 'white', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
    actionText: { color: "#333", fontWeight: '600' },
    badgeNotif: { position: 'absolute', top: -3, right: -3, backgroundColor: '#D32F2F', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
    badgeNotifText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: '70%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    notifCard: { flexDirection: 'row', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    notifRead: { backgroundColor: '#FFFFFF' },
    notifUnread: { backgroundColor: '#E8F2F0', borderColor: '#C8E6D9' },
    notifIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    notifTextWrap: { flex: 1 },
    notifItemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 10 },
    notifTime: { fontSize: 11, color: '#888', marginTop: 2 },
    notifItemMsg: { fontSize: 13, color: '#555', marginTop: 4, lineHeight: 18 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D32F2F', marginLeft: 10 },
    emptyNotif: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyNotifText: { marginTop: 15, color: '#999', fontSize: 15 }
});