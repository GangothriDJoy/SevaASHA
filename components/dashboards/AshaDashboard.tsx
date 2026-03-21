import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, collectionGroup, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function Dashboard() {
    const router = useRouter();
    const {role, name} = useLocalSearchParams();
    const params = useLocalSearchParams();
    const userMobile = String(params.userMobile || "").trim();
    const [userRole, setUserRole] = useState<string>("");
    const ashaStats = {ancDue: 3,immunizationDue: 5, targetVisits: 50,};
    const jphnStats = { activeAshaWorkers: 8, pendingHighRiskReferrals: 4, scheduledVaccinationCamps: 2, ancVisitsPending: 15,};
    const awwStats = {totalChildren: 42, pregnantMothers: 12, nutriAlerts: 3, vaccineDue: 5, pendingStock: "80%"};
    const [adminStats, setAdminStats] = useState({activeEmergencies: 0, totalPregnantWomen: 0, highRiskPregnancies: 0, immunizationDue: 0, activeWorkers: 0, assignedBlock: "Today", malnutritionCases: 0,});
    const [visitCounts, setVisitCounts] = useState({monthly: 0, today: 0});
    useEffect(() => {
        if (role) {
            setUserRole(String(role));
        }
    }, [role]);
    useEffect(() => {
        if (!userRole) return;
        if (userRole !== "Supervisor" && userRole !== "Admin") return;
        let internalCount = -1;
        console.log("Listeners starting for role:", userRole);
        const qHighRisk = query(collectionGroup(db, "high_risk"), where("healthIssues", "==", "High Risk"));
        const unsubHighRisk = onSnapshot(qHighRisk, (snapshot) => {console.log("High Risk Found:", snapshot.size);setAdminStats(prev => ({ ...prev, highRiskPregnancies: snapshot.size }));}, (error) => {console.error("🚨 HIGH RISK FIREBASE ERROR:", error.message);});
        const qMalnutrition = query(collectionGroup(db, "high_risk"), where("malnutritionStatus", "==", "Flagged"));
        const unsubMalnutrition = onSnapshot(qMalnutrition, (snapshot) => {console.log("Malnutrition Found:", snapshot.size);setAdminStats(prev => ({ ...prev, malnutritionCases: snapshot.size }));}, (error) => {console.error("🚨 MALNUTRITION FIREBASE ERROR:", error.message);});
        const qMissedVax = query(collection(db, "beneficiaries"), where("vaccinationStatus", "==", "Missed"));
        const unsubMissedVax = onSnapshot(qMissedVax, (snapshot) => {
                console.log("Missed Vax Found:", snapshot.size);
                setAdminStats(prev => ({ ...prev, immunizationDue: snapshot.size }));
            },
            (error) => {console.error("🚨 MISSED VAX FIREBASE ERROR:", error.message);}
        );
        const q = query(collection(db, "emergency"), where("status", "==", "UNRESOLVED"));
        const unsubscribe = onSnapshot(q, (snapshot : any) => {const currentCount = snapshot.size;
            if (internalCount !== -1 && currentCount > internalCount) {triggerEmergencyAlert(currentCount);}
            internalCount = currentCount;
            setAdminStats(prev => ({...prev, activeEmergencies: currentCount}));
        }, (error : any) => {console.error("Emergency Listener Error:", error);});
        return () => {unsubMissedVax(); unsubHighRisk(); unsubMalnutrition(); unsubscribe();}
    }, [userRole]);
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
            );}};
    useEffect(() => {
        const validRoles = ["ASHA Worker", "Supervisor", "JPHN", "Anganwadi Worker", "Mother", "Admin"];
        if (!userMobile || !validRoles.includes(userRole)) return;
        const fetchVisitMetrics = async () => {
            try {
                let monthly = 0;
                let today = 0;
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const vitalsQuery = query(collectionGroup(db, "high_risk"), where("recordedBy", "==", userMobile));
                const vitalsSnapshot = await getDocs(vitalsQuery);
                vitalsSnapshot.forEach((docSnap) => {const data: any = docSnap.data();const ts = data.recordedAt;if (!ts || !ts.toDate) return;const d = ts.toDate();if (d >= monthStart) monthly += 1;if (d >= dayStart) today += 1;});
                const householdQuery = query(collection(db, "household_visits"), where("workerId", "==", userMobile));
                const householdSnapshot = await getDocs(householdQuery);
                householdSnapshot.forEach((docSnap) => {const data: any = docSnap.data();const ts = data.createdAt;if (!ts || !ts.toDate) return;const d = ts.toDate();if (d >= monthStart) monthly += 1;if (d >= dayStart) today += 1;});
                setVisitCounts({ monthly, today });
            } catch (e) {console.error("Error loading ASHA visit metrics", e);}
        };
        if (userRole === "ASHA Worker") {
            fetchVisitMetrics();
        }
    }, [userMobile, userRole]);
    const getMonthlyProgress = () => {const target = ashaStats.targetVisits;const current = visitCounts.monthly;const percentage = Math.min(target === 0 ? 0 : (current / target) * 100, 100);return { monthlyTotal: current, target, percentage };};
    const userName = String(name || "User").trim();
    return (
        <View style={{flex: 1}}>
            <View style={styles.welcomeBanner}>
                <Text style={styles.welcomeText}>Welcome back, {userName}! </Text>
                <Text style={styles.infoText}>Role: {userRole}</Text>
            </View>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.topBar}>
                    <View>
                        <Text style={styles.topBarName}>{userName }</Text>
                        <Text style={styles.topBarDetail}>{adminStats.assignedBlock || "Main Block"} • {new Date().toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.topBarIcons}>
                        <TouchableOpacity style={styles.iconBtn}><Ionicons name="notifications" size={20} color="#1F7A6B"/></TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn}><Ionicons name="settings-outline" size={20} color="#1F7A6B"/></TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.replace("/auth")}><Ionicons name="log-out-outline" size={20} color="#D32F2F"/></TouchableOpacity>
                    </View>
                </View>
                {userRole === "ASHA Worker" && (
                    <View style={styles.ashaSection}>
                        {(() => {
                            const { monthlyTotal, target, percentage } = getMonthlyProgress();
                            return (
                                <View style={styles.targetSection}>
                                    <View style={styles.targetHeader}>
                                        <Text style={styles.targetTitle}>Monthly Incentive Goal</Text>
                                        <Text style={styles.targetCount}>{monthlyTotal} / {target} Visits</Text>
                                    </View>
                                    <View style={styles.progressBarBackground}>
                                        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                                    </View>
                                    <Text style={styles.targetSubtext}>
                                        {percentage >= 100
                                            ? "🎉 Target Achieved! Max Incentive unlocked."
                                            : `You need ${target - monthlyTotal} more visits to reach your goal.`}
                                    </Text>
                                </View>
                            );
                        })()}

                        <TouchableOpacity style={styles.tasksCard}>
                            <View style={styles.tasksHeader}>
                                <Text style={styles.tasksTitle}>Tasks for Today</Text>
                                <View style={styles.taskBadge}>
                                    <Text style={styles.taskBadgeText}>{visitCounts.today} Visits</Text>
                                </View>
                            </View>
                            <View style={styles.taskRow}>
                                <Ionicons name="calendar-outline" size={18} color="#666" />
                                <Text style={styles.taskItem}>{ashaStats.ancDue} ANC Checkups • {ashaStats.immunizationDue} Immunizations</Text>
                            </View>
                        </TouchableOpacity>

                        {/* 1. Beneficiary & Data Entry Grid */}
                        <Text style={styles.sectionTitle}>Beneficiary Management</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => router.push({
                                    pathname: "/add-new",
                                    params: { mobile: userMobile, role: userRole, name: params.name }
                                })}
                            >
                                <Ionicons name="person-add" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Add New</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => router.push({
                                    pathname: "/my-records",
                                    params: { mobile: userMobile }
                                })}
                            >
                                <Ionicons name="list" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>My Records</Text>
                            </TouchableOpacity>

                            {/* ✅ UPDATED TO VACCINATION */}
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => router.push({
                                    pathname: "/vaccination",
                                    params: { mobile: userMobile }
                                })}
                            >
                                <Ionicons name="medkit-outline" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Vaccination</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => router.push({
                                    pathname: "/visit-log",
                                    params: { mobile: userMobile }
                                })}
                            >
                                <Ionicons name="journal" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Visit Log</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 📋 Field Tasks & Awareness */}
                        <Text style={styles.sectionTitle}>Field Tasks & Awareness</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => router.push({
                                    pathname: "/household-survey",
                                    params: { mobile: userMobile, role: userRole, name: params.name }
                                })}
                            >
                                <Ionicons name="add-circle-outline" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>New Survey</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => router.push({
                                    pathname: "/household-records",
                                    params: { mobile: userMobile, role: userRole, name: params.name }
                                })}
                            >
                                <Ionicons name="copy-outline" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>View House</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => router.push({
                                    pathname: "/awareness",
                                    params: { mobile: userMobile }
                                })}
                            >
                                <Ionicons name="megaphone" size={30} color="#1F7A6B" />
                                <Text style={styles.actionText}>Awareness</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 💰 Performance & SOS */}
                        <Text style={styles.sectionTitle}>Performance & Safety</Text>
                        <TouchableOpacity
                            style={[styles.actionButton, { width: '100%', flexDirection: 'row', justifyContent: 'center' }]}
                            onPress={() => router.push({
                                pathname: "/incentives",
                                params: { mobile: userMobile }
                            })}
                        >
                            <Ionicons name="cash" size={30} color="#1F7A6B" />
                            <Text style={[styles.actionText, { marginTop: 0, marginLeft: 15 }]}>View My Incentives</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.emergencyCard, { marginTop: 15 }]}
                            onPress={() => router.push({
                                pathname: "/emergency-alert",
                                params: { mobile: userMobile } // CRITICAL: This passes the ID to the SOS screen
                            })}
                        >
                            <View style={styles.emergencyHeader}>
                                <Ionicons name="alert-circle" size={26} color="white" />
                                <Text style={styles.emergencyTitle}>EMERGENCY SOS</Text>
                            </View>
                            <Text style={styles.emergencySubText}>Press to alert supervisor of a high-risk medical emergency.</Text>
                        </TouchableOpacity>

                        <Text style={styles.sectionTitle}>Recent Notifications</Text>
                        <View style={styles.notifyBox}>
                            <Ionicons name="notifications" size={20} color="#1F7A6B" />
                            <Text style={styles.notifyText}>New Govt Scheme: Matru Vandana update available.</Text>
                        </View>

                        <View style={styles.performanceRow}>
                            <Text style={styles.performanceLabel}>Monthly Visits Completed: </Text>
                            <Text style={styles.performanceValue}>{visitCounts.monthly} / {ashaStats.targetVisits}</Text>
                        </View>
                    </View>
                )}
                {userRole === "JPHN" && (
                    <View style={styles.jphnSection}>
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.jphnStatNumber}>{jphnStats.activeAshaWorkers}</Text>
                                <Text style={styles.statLabel}>ASHAs under you</Text>
                            </View>
                            <View style={[styles.statBox, {borderColor: '#FBC02D'}]}>
                                <Text style={[styles.statNumber, {color: '#FBC02D'}]}>{jphnStats.pendingHighRiskReferrals}</Text>
                                <Text style={styles.statLabel}>High-Risk Referrals</Text>
                            </View>
                        </View>
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
                        <Text style={styles.sectionTitle}>Field Operations</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="git-network" size={30} color="#1F7A6B"/>
                                <Text style={styles.actionText}>ASHA Reports</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="medical" size={30} color="#1F7A6B"/>
                                <Text style={styles.actionText}>Immunization</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="document-text" size={30} color="#1F7A6B"/>
                                <Text style={styles.actionText}>Death/Birth Reg</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="analytics" size={30} color="#1F7A6B"/>
                                <Text style={styles.actionText}>Sector Stats</Text>
                            </TouchableOpacity>
                        </View>
                    </View>)}
                {userRole === "Anganwadi Worker" && (
                    <View style={styles.awwSection}>
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
                        <Text style={styles.sectionTitle}>Center Management</Text>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="person-add" size={30} color="#FF9800"/>
                                <Text style={styles.actionText}>Add Child</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="trending-up" size={30} color="#FF9800"/>
                                <Text style={styles.actionText}>Growth Chart</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="fast-food" size={30} color="#FF9800"/>
                                <Text style={styles.actionText}>Food Dist.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="calendar" size={30} color="#FF9800"/>
                                <Text style={styles.actionText}>Attendance</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.wideCard}>
                            <Ionicons name="clipboard-outline" size={24} color="#333"/>
                            <View style={{marginLeft: 15, flex: 1}}>
                                <Text style={styles.wideCardTitle}>Stock Status</Text>
                                <Text style={styles.wideCardSub}>Supplementary food stock is {awwStats.pendingStock}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999"/>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.emergencyCard, {marginTop: 20}]} onPress={() => alert("Emergency Alert Raised!")}>
                            <View style={styles.emergencyHeader}>
                                <Ionicons name="alert-circle" size={26} color="white"/>
                                <Text style={styles.emergencyTitle}>RAISE EMERGENCY ALERT</Text>
                            </View>
                            <Text style={styles.emergencySubText}>Notify PHC and Supervisor immediately for maternal/child emergencies.</Text>
                        </TouchableOpacity>
                    </View>)}
            </ScrollView>
        </View>);}
const styles = StyleSheet.create({subText: {fontSize: 14, color: '#666', marginTop: 5,},
    approvalListContainer: {marginTop: 10, paddingBottom: 15, marginLeft: 10, marginRight: 10,},
    container: { marginLeft: 15, marginRight: 15, flex: 1, backgroundColor: "#F4F6F8" },
    adminSection: { marginTop: 10 },         infoText: { fontSize: 16, marginBottom: 10 },
    welcomeText: { marginTop: 20, fontSize: 24, color: '#FFFFFF', fontWeight: "bold", marginBottom: 5 },
    pulseGlow: {borderWidth: 3, borderColor: '#FFF', shadowColor: "#FF0000",        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 10,},
    sectionTitle: { marginLeft: 15, fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 10, marginTop: 15 },
    emergencyCard: {backgroundColor: "#D32F2F", padding: 15, borderRadius: 12, marginBottom: 20, elevation: 4, shadowColor: "red", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
    emergencyHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },      emergencyTitle: { color: "white", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
    emergencySubText: { color: "#FFCDD2", fontSize: 13 },          ashaSection: { marginLeft: 15, marginRight: 15,marginTop: 5 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },
    actionGrid: { marginLeft: 15, marginRight: 15,flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    actionButton: {width: "48%", backgroundColor: "white", padding: 20, borderRadius: 12, alignItems: "center", marginBottom: 15, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, borderWidth: 1, borderColor: "#eee" },
    actionText: { marginTop: 10, fontSize: 14, fontWeight: "600", color: "#333" },targetTitle: {fontSize: 14, fontWeight: 'bold', color: '#333',},
    badge: { marginLeft: 15, marginRight: 15,position: "absolute", top: 10, right: 10, backgroundColor: "#D32F2F", borderRadius: 12, minWidth: 24, height: 24, justifyContent: "center", alignItems: "center", paddingHorizontal: 6, borderWidth: 2, borderColor: "white" },
    badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },          targetCount: {fontSize: 14, fontWeight: 'bold', color: '#1F7A6B',},
    //statBox: { backgroundColor: 'white', width: '48%', padding: 15, borderRadius: 12, marginBottom: 15, borderLeftWidth: 5, elevation: 2 },
    targetSection: {backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 4, marginBottom: 15, borderWidth: 1, borderColor: '#e0e0e0'},
    targetHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,},
    progressBarBackground: {height: 12, backgroundColor: '#E0F2F1', borderRadius: 6, overflow: 'hidden', marginVertical: 10,},
    progressBarFill: {height: '100%', backgroundColor: '#4CAF50', borderRadius: 6,},           targetSubtext: {fontSize: 12, color: '#666', fontStyle: 'italic',},
    tasksCard: { backgroundColor: 'white', padding: 18, borderRadius: 15, borderLeftWidth: 5, borderLeftColor: '#1F7A6B', elevation: 3, marginBottom: 10 },
    tasksHeader: { marginLeft: 15, marginRight: 15,flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    tasksTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },           taskBadgeText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
    taskBadge: { marginLeft: 15, marginRight: 15,backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    taskRow: { flexDirection: 'row', alignItems: 'center' },           taskItem: { marginLeft: 8, color: '#555', fontSize: 14 },
    notifyBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
    notifyText: { marginLeft: 10, fontSize: 13, color: '#00695C', flex: 1 },       performanceLabel: { color: '#666', fontWeight: '500' },
    performanceRow: { flexDirection: 'row', marginTop: 20, padding: 10, backgroundColor: '#eee', borderRadius: 8, justifyContent: 'center' },
    performanceValue: { color: '#1F7A6B', fontWeight: 'bold' },               jphnSection: {marginTop: 10,marginLeft: 15, marginRight: 15,},
    jphnStatNumber: {fontSize: 24, fontWeight: "bold", color: "#0288D1",},              motherSection: { marginTop: 10 },
    progressCard: {backgroundColor: '#FCE4EC', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20, marginLeft: 15, marginRight: 15,},
    weekCircle: {width: 100, height: 100, borderRadius: 50, borderWidth: 5, borderColor: '#E91E63', justifyContent: 'center', alignItems: 'center', marginVertical: 15,},
    weekNumber: { fontSize: 30, fontWeight: 'bold', color: '#E91E63' },               weekLabel: { fontSize: 14, color: '#888' },
    appointmentBox: {flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 10, alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#E91E63', marginBottom: 20,},
    awwSection: {marginTop: 10},           wideCardTitle: {fontWeight: "bold", fontSize: 16, color: '#333'},
    wideCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#eee', marginBottom: 15},
    wideCardSub: {color: "#777", fontSize: 13, marginTop: 4},          appointmentTitle: { fontWeight: 'bold', fontSize: 16 },
    appointmentDate: { color: '#E91E63', fontSize: 14 },          userName: { fontSize: 18, fontWeight: '600', color: '#333' },
    card: {backgroundColor: '#fff', padding: 15, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4},
    userSub: { fontSize: 14, color: '#666', marginTop: 4 },         buttonText: { color: '#fff', fontWeight: 'bold' },
    approveButton: { backgroundColor: '#2E7D32', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
    sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
    searchContainer: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 0, marginLeft: 10, marginRight: 10,},
    integratedSearchBar: {flex: 1, padding: 12, fontSize: 14, marginLeft: 10,},          cardInfo: { flex: 1 },
    emptyState: {padding: 30, alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc'},
    compactCard: {flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,},
    statBox: {width: '48%', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, marginBottom: 12, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5,},
    highRiskBox: {backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FFE3E3',},    topBarDetail: { fontSize: 12, color: '#666' },
    statNumber: {fontSize: 24, fontWeight: 'bold', color: '#1F7A6B',},    topBarName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statLabel: {fontSize: 12, color: '#7F8C8D', fontWeight: '600', marginTop: 4, textAlign: 'center',},    topBarIcons: { flexDirection: 'row', gap: 10 },
    iconCircle: {backgroundColor: '#E8F2F0', padding: 8, borderRadius: 20,},    alertStrip: { paddingVertical: 12, marginBottom: 10 },
    welcomeBanner: {backgroundColor: '#1F7A6B', padding: 20, borderRadius: 0, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, marginLeft: 0, marginRight: 0,},
    topBar: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: 10},
    iconBtn: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 }
});