import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, collectionGroup } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function AshaPerformance() {
    const router = useRouter();
    const [workers, setWorkers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [incentives, setIncentives] = useState<Record<string, boolean>>({});

    // Modal state for drill-down verifications
    const [selectedWorker, setSelectedWorker] = useState<any>(null);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        const fetchWorkers = async () => {
            try {
                const q = query(collection(db, "users"), where("role", "==", "ASHA Worker"));
                const snap = await getDocs(q);
                
                const workerMap: any[] = [];
                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    workerMap.push({
                        id: docSnap.id,
                        name: data.name || data.fullName || data.firstName || "Unknown ASHA",
                        mobile: data.userMobile || data.mobile || docSnap.id,
                        zone: data.assignedWard || data.wardName || "Unassigned",
                        visits: []
                    });
                });

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                // A. High Risk Interventions
                const hrq = query(collectionGroup(db, "high_risk"));
                const hrSnap = await getDocs(hrq);
                hrSnap.forEach(vd => {
                    const d = vd.data() as any;
                    const ts = d.recordedAt;
                    if (ts && ts.toDate) {
                        const visitTime = ts.toDate();
                        if (visitTime >= startOfMonth) {
                            const targetWorker = workerMap.find(w => w.mobile === d.recordedBy);
                            if (targetWorker) {
                                targetWorker.visits.push({ id: vd.id, date: visitTime, type: "High Risk Checkup", details: d });
                            }
                        }
                    }
                });

                // B. Household Visits
                const vq = query(collection(db, "household_visits"));
                const vSnap = await getDocs(vq);
                vSnap.forEach(vd => {
                    const d = vd.data() as any;
                    const ts = d.createdAt;
                    if (ts && ts.toDate) {
                        const visitTime = ts.toDate();
                        if (visitTime >= startOfMonth) {
                            const targetWorker = workerMap.find(w => w.mobile === d.workerId);
                            if (targetWorker) {
                                targetWorker.visits.push({ id: vd.id, date: visitTime, type: "Routine Household Visit", details: d });
                            }
                        }
                    }
                });

                // Sort all visits chronologically newest first
                workerMap.forEach(w => w.visits.sort((a: any, b: any) => b.date.getTime() - a.date.getTime()));

                setWorkers(workerMap);
                setLoading(false);
            } catch (e) {
                console.error("Failed to map ASHA ledger:", e);
                Alert.alert("Execution Blocked", "Could not synchronize the ASHA performance ledger.");
                setLoading(false);
            }
        };

        fetchWorkers();

        // Listen explicitly for granular per-visit incentive claims
        const currentMonth = new Date().toISOString().slice(0, 7);
        const invQ = query(collection(db, "incentive_claims"), where("month", "==", currentMonth));
        const unsub = onSnapshot(invQ, (iSnap) => {
            const approvedSet: Record<string, boolean> = {};
            iSnap.forEach(id => {
                const claim = id.data();
                if (claim.visitId) {
                    approvedSet[claim.visitId] = true;
                }
            });
            setIncentives(approvedSet);
        });

        return () => unsub();
    }, []);

    const authorizeVisit = async (visit: any, worker: any) => {
        const confirmMsg = `Authorize a ₹200 payout for this verified '${visit.type}' logged on ${visit.date.toLocaleDateString()}?`;
        
        const executePayment = async () => {
            setVerifying(true);
            try {
                const currentMonth = new Date().toISOString().slice(0, 7);
                await addDoc(collection(db, "incentive_claims"), {
                    workerMobile: worker.mobile,
                    workerName: worker.name,
                    visitId: visit.id,
                    visitType: visit.type,
                    month: currentMonth,
                    amount: 200,
                    authorizedAt: serverTimestamp(),
                    authorizedBy: "JPHN Control",
                    status: "Approved"
                });
            } catch (e) {
                if (Platform.OS === 'web') {
                    window.alert("Network Failure: Failed to commit the financial claim securely.");
                } else {
                    Alert.alert("Network Failure", "Failed to commit the financial claim securely.");
                }
            } finally {
                setVerifying(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                executePayment();
            }
        } else {
            Alert.alert(
                "Verify & Approve Request",
                confirmMsg,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Approve Payment", style: "default", onPress: executePayment }
                ]
            );
        }
    };

    const renderWorker = ({ item }: { item: any }) => {
        // Calculate dynamic approvals out of total visits
        const approvedCount = item.visits.filter((v: any) => incentives[v.id]).length;
        const totalVisits = item.visits.length;
        const earned = approvedCount * 200;

        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => setSelectedWorker(item)}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconRing}>
                        <Ionicons name="person" size={24} color="#1F7A6B" />
                    </View>
                    <View style={styles.infoBlock}>
                        <Text style={styles.workerName}>{item.name}</Text>
                        <Text style={styles.subText}>Zone: {item.zone} | ID: {item.mobile}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </View>

                <View style={styles.metricsRow}>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricVal}>{totalVisits}</Text>
                        <Text style={styles.metricLbl}>Total Visits</Text>
                    </View>
                    <View style={styles.metricBox}>
                        <Text style={[styles.metricVal, { color: '#2E7D32' }]}>{approvedCount}</Text>
                        <Text style={styles.metricLbl}>Verified</Text>
                    </View>
                    <View style={styles.metricBox}>
                        <Text style={[styles.metricVal, { color: '#F57C00' }]}>₹{earned}</Text>
                        <Text style={styles.metricLbl}>Authorized</Text>
                    </View>
                </View>

                {totalVisits === 0 ? (
                    <View style={[styles.actionBannerPending, { backgroundColor: '#F5F5F5' }]}>
                        <Ionicons name="information-circle" size={16} color="#757575" style={{ marginRight: 6 }} />
                        <Text style={[styles.actionBannerPendingText, { color: '#757575' }]}>No visits logged yet</Text>
                    </View>
                ) : totalVisits > approvedCount ? (
                    <View style={styles.actionBannerPending}>
                        <Ionicons name="document-text" size={16} color="#0288D1" style={{ marginRight: 6 }} />
                        <Text style={styles.actionBannerPendingText}>{totalVisits - approvedCount} visits awaiting verification</Text>
                    </View>
                ) : (
                    <View style={styles.successBanner}>
                        <Ionicons name="checkmark-circle" size={16} color="#2E7D32" style={{ marginRight: 6 }} />
                        <Text style={styles.successText}>All logged visits are verified</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderVisitModal = () => (
        <Modal visible={!!selectedWorker} transparent animationType="slide" onRequestClose={() => setSelectedWorker(null)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>{selectedWorker?.name}'s Field Log</Text>
                            <Text style={styles.modalSub}>{selectedWorker?.visits.length} Monthly Activities Detected</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedWorker(null)} style={{ padding: 5 }}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={selectedWorker?.visits}
                        extraData={incentives}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 20 }}
                        renderItem={({ item }) => {
                            const isApproved = incentives[item.id] === true;
                            return (
                                <View style={[styles.visitCard, isApproved && styles.visitCardApproved]}>
                                    <View style={styles.visitInfo}>
                                        <Text style={styles.visitType}>{item.type}</Text>
                                        <Text style={styles.visitDate}>{item.date.toLocaleString()}</Text>
                                        <Text style={styles.visitDetails}>Target Ref: {item.details?.childId || item.details?.motherId || item.details?.beneficiaryId || "Unknown Demographic"}</Text>
                                    </View>
                                    
                                    {isApproved ? (
                                        <View style={styles.approvedBadge}>
                                            <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                                            <Text style={styles.approvedBadgeText}>₹200 Paid</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            style={styles.verifyBtn} 
                                            activeOpacity={0.7} 
                                            disabled={verifying}
                                            onPress={() => authorizeVisit(item, selectedWorker)}
                                        >
                                            <Text style={styles.verifyBtnText}>Verify (₹200)</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        }}
                        ListEmptyComponent={<Text style={styles.empty}>This ASHA worker has not logged any verifiable field visits this month.</Text>}
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Visit Verifications & Incentives</Text>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={{ marginTop: 15, color: '#666', fontWeight: 'bold' }}>Mapping Telemetry Logs...</Text>
                </View>
            ) : (
                <FlatList
                    data={workers}
                    keyExtractor={item => item.mobile}
                    renderItem={renderWorker}
                    contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text style={styles.empty}>Zero active ASHA workers mapped.</Text>}
                />
            )}

            {renderVisitModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconRing: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    infoBlock: { flex: 1 },
    workerName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
    subText: { fontSize: 12, color: '#666', marginTop: 2 },
    
    metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12 },
    metricBox: { alignItems: 'center', flex: 1 },
    metricVal: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    metricLbl: { fontSize: 10, color: '#777', fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
    
    actionBannerPending: { flexDirection: 'row', backgroundColor: '#E1F5FE', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    actionBannerPendingText: { color: '#0288D1', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },
    successBanner: { flexDirection: 'row', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    successText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },
    
    empty: { textAlign: 'center', marginTop: 40, color: '#999', fontStyle: 'italic' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#F4F6F8', height: '85%', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', elevation: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    modalSub: { fontSize: 12, color: '#777', marginTop: 3 },
    
    visitCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
    visitCardApproved: { borderColor: '#A5D6A7', backgroundColor: '#F1F8E9' },
    visitInfo: { flex: 1, paddingRight: 10 },
    visitType: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    visitDate: { fontSize: 12, color: '#666', marginTop: 4 },
    visitDetails: { fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic' },
    
    verifyBtn: { backgroundColor: '#1F7A6B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    verifyBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    approvedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 },
    approvedBadgeText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }
});
