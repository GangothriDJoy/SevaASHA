import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function HighRiskDetail() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [alertStatus, setAlertStatus] = useState<string | null>(null);
    const [benDetails, setBenDetails] = useState<any>(null);

    // Parse params
    const name = params.beneficiaryName || 'Unknown Beneficiary';
    const beneficiaryId = params.beneficiaryId || 'Unknown ID';
    const bp = params.bloodPressure || '--';
    const hb = params.hemoglobin || '--';
    const sugar = params.sugarLevel || '--';
    const ashaId = params.recordedBy || 'Unknown ASHA'; 

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const docRef = doc(db, 'beneficiaries', beneficiaryId as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setBenDetails(docSnap.data());
                    return; // exit early
                }
                
                // Fallback: Check household_members collection
                const hmRef = doc(db, 'household_members', beneficiaryId as string);
                const hmSnap = await getDoc(hmRef);
                if (hmSnap.exists()) {
                    setBenDetails(hmSnap.data());
                }
            } catch (error) {
                console.error("Error fetching full details:", error);
            }
        };
        if (beneficiaryId && beneficiaryId !== 'Unknown ID') {
            fetchDetails();
        }
    }, [beneficiaryId]);
    
    // Poll Alert Status
    useEffect(() => {
        if (!beneficiaryId || beneficiaryId === 'Unknown ID') return;
        const q = query(
            collection(db, 'alerts'),
            where('beneficiaryId', '==', beneficiaryId),
            where('type', '==', 'High Risk Review')
        );
        // We use onSnapshot to get real-time updates (e.g., if ASHA clicks "Review")
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                // Find the latest alert
                let latestStatus = null;
                let latestTime = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const ts = data.createdAt ? (typeof data.createdAt.toMillis === 'function' ? data.createdAt.toMillis() : data.createdAt) : 0;
                    if (ts >= latestTime) {
                        latestTime = ts;
                        latestStatus = data.status;
                    }
                });
                setAlertStatus(latestStatus);
            }
        });
        return () => unsub();
    }, [beneficiaryId]);

    let riskFactors = { hypertension: false, diabetes: false, anemia: false, teenageMother: false, thyroid: false, heartDisease: false };
    try {
        if (params.riskFactorsRaw) {
            riskFactors = JSON.parse(params.riskFactorsRaw as string);
        }
    } catch (e) {}

    const handleSendAlert = async () => {
        setLoading(true);
        try {
            await addDoc(collection(db, 'alerts'), {
                type: 'High Risk Review',
                beneficiaryId,
                beneficiaryName: name,
                ashaId: ashaId, // The ASHA worker who receives it
                message: `URGENT: Please review high risk case for ${name}. Immediate follow up needed.`,
                status: 'Pending',
                createdAt: serverTimestamp(),
            });
            // We do not need setAlertSent(true) because the onSnapshot will catch it and update alertStatus
            Alert.alert(
                "Alert Sent", 
                "ASHA worker has been notified successfully."
            );
        } catch (error) {
            console.error("Error sending alert", error);
            Alert.alert("Error", "Could not send alert. Try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Case Review</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.subtitle}>Supervised by ASHA: {ashaId}</Text>

                {benDetails && (
                    <View style={styles.fullDetailsBox}>
                        <Text style={styles.detailSectionTitle}>Complete Profile Metadata</Text>
                        <Text style={styles.detailRow}><Text style={styles.boldText}>Age / DOB:</Text> {benDetails.age || 'N/A'} {benDetails.dobString ? `(${benDetails.dobString})` : ''}</Text>
                        <Text style={styles.detailRow}><Text style={styles.boldText}>Phone:</Text> {benDetails.mobile || benDetails.contactOffice || benDetails.altMobile || 'N/A'}</Text>
                        <Text style={styles.detailRow}><Text style={styles.boldText}>Aadhaar:</Text> {benDetails.aadhaar || 'N/A'}</Text>
                        <Text style={styles.detailRow}><Text style={styles.boldText}>Address:</Text> {benDetails.address || 'N/A'}, Ward {benDetails.assignedWard || '--'}</Text>
                        <Text style={styles.detailRow}><Text style={styles.boldText}>District/Block:</Text> {benDetails.district || '--'} / {benDetails.assignedBlock || '--'}</Text>
                        
                        {(benDetails.lmp || benDetails.edd) && (
                            <View style={styles.pregnancyDetails}>
                                <Text style={styles.detailRow}><Text style={styles.boldText}>Last Menstrual Period (LMP):</Text> {benDetails.lmp || '--'}</Text>
                                <Text style={styles.detailRow}><Text style={styles.boldText}>Expected Delivery (EDD):</Text> {benDetails.edd || '--'}</Text>
                                <Text style={styles.detailRow}><Text style={styles.boldText}>Delivery Place:</Text> {benDetails.deliveryPlace || 'Not Decided'}</Text>
                            </View>
                        )}
                        {(benDetails.childCount && benDetails.childCount !== "0") ? (
                            <View style={styles.pregnancyDetails}>
                                <Text style={styles.detailRow}><Text style={styles.boldText}>Existing Children:</Text> {benDetails.childCount}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                <View style={styles.riskTags}>
                    {riskFactors.hypertension && <Text style={styles.badge}>Hypertension</Text>}
                    {riskFactors.diabetes && <Text style={styles.badge}>Diabetes</Text>}
                    {riskFactors.anemia && <Text style={styles.badge}>Anemia</Text>}
                    {riskFactors.thyroid && <Text style={styles.badge}>Thyroid</Text>}
                    {riskFactors.heartDisease && <Text style={styles.badge}>Heart Disease</Text>}
                    {riskFactors.teenageMother && <Text style={styles.badge}>Teenage Mother</Text>}
                </View>

                <View style={styles.vitalsContainer}>
                    <View style={styles.vitalBox}>
                        <Text style={styles.vitalLabel}>Blood Pressure</Text>
                        <Text style={styles.vitalValue}>{bp}</Text>
                    </View>
                    <View style={styles.vitalBox}>
                        <Text style={styles.vitalLabel}>Hemoglobin</Text>
                        <Text style={styles.vitalValue}>{hb}</Text>
                    </View>
                    <View style={styles.vitalBox}>
                        <Text style={styles.vitalLabel}>Sugar Level</Text>
                        <Text style={styles.vitalValue}>{sugar}</Text>
                    </View>
                </View>

                {(() => {
                    let btnText = "SEND ALERT TO ASHA";
                    let btnColor = "#D32F2F";
                    let btnIcon: any = "alert-circle";
                    let isDisabled = loading;

                    if (alertStatus === 'Pending') {
                        btnText = "ALERT SENT TO ASHA";
                        btnColor = "#4CAF50"; // Green
                        btnIcon = "checkmark-circle";
                        isDisabled = true;
                    } else if (alertStatus === 'Reviewed') {
                        btnText = "CASE RESOLVED (BY ASHA)";
                        btnColor = "#607D8B"; // Grayish Blue
                        btnIcon = "shield-checkmark";
                        isDisabled = true;
                    }

                    return (
                        <TouchableOpacity 
                            style={[styles.alertBtn, { backgroundColor: btnColor }]} 
                            onPress={handleSendAlert}
                            disabled={isDisabled}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name={btnIcon} size={20} color="white" />
                                    <Text style={styles.alertBtnText}>{btnText}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    );
                })()}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: 'white' },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    card: { backgroundColor: 'white', margin: 20, padding: 20, borderRadius: 15, elevation: 3 },
    name: { fontSize: 24, fontWeight: 'bold', color: '#1F7A6B', marginBottom: 5 },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 5 },
    fullDetailsBox: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 10, marginTop: 15, marginBottom: 5, borderWidth: 1, borderColor: '#EEE' },
    detailSectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#1F7A6B', marginBottom: 8, textTransform: 'uppercase' },
    detailRow: { fontSize: 14, color: '#444', marginBottom: 4, lineHeight: 20 },
    boldText: { fontWeight: 'bold', color: '#333' },
    pregnancyDetails: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
    riskTags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 15, marginBottom: 20 },
    badge: { backgroundColor: '#FFEBEE', color: '#D32F2F', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, fontSize: 12, fontWeight: 'bold', marginRight: 10, overflow: 'hidden' },
    vitalsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    vitalBox: { alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 10, width: '30%' },
    vitalLabel: { fontSize: 11, color: '#666', marginBottom: 5, textAlign: 'center' },
    vitalValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    alertBtn: { flexDirection: 'row', backgroundColor: '#D32F2F', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    alertBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 16 }
});
