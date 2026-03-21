import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function PatientDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { userId } = params;
    const [patient, setPatient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatient = async () => {
            if (!userId) return;
            try {
                let docRef = doc(db, "beneficiaries", String(userId));
                let snap = await getDoc(docRef);
                if (!snap.exists()) {
                    docRef = doc(db, "household_members", String(userId));
                    snap = await getDoc(docRef);
                }
                if (snap.exists()) setPatient(snap.data());
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchPatient();
    }, [userId]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1F7A6B" />
                <Text style={{ marginTop: 10, color: '#666' }}>Loading Record...</Text>
            </View>
        );
    }

    if (!patient) {
        return (
            <View style={styles.centered}>
                <Ionicons name="document-text-outline" size={60} color="#ccc" />
                <Text style={{ marginTop: 10, color: '#999', fontSize: 16 }}>No Patient Record Found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: '#1F7A6B', fontWeight: 'bold' }}>GO BACK</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const name = patient.fullName || patient.name || (patient.firstName + " " + patient.lastName);
    const hasHighRisk = patient.riskStatus === 'High' || patient.healthIssues !== 'None';

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={26} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Patient Record</Text>
                    <Text style={styles.headerSub}>{patient.role || 'Beneficiary'}</Text>
                </View>
            </View>

            <View style={styles.topProfile}>
                <View style={styles.profileAvatar}>
                    <Ionicons name="person" size={40} color="#FFF" />
                </View>
                <Text style={styles.profileName}>{name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: hasHighRisk ? '#FFEBEE' : '#E8F5E9' }]}>
                    <Text style={[styles.statusBadgeText, { color: hasHighRisk ? '#D32F2F' : '#2E7D32' }]}>
                        {hasHighRisk ? '⚠️ HIGH RISK' : '✅ STABLE'}
                    </Text>
                </View>
            </View>

            <View style={styles.content}>
                
                <Text style={styles.sectionTitle}>Contact & Identity</Text>
                <View style={styles.card}>
                    <DetailItem icon="call-outline" label="Mobile Number" value={patient.mobile || patient.userMobile} />
                    <DetailItem icon="card-outline" label="Aadhaar Number" value={patient.aadhaar || 'Not Provided'} />
                    <DetailItem icon="document-text-outline" label="Ration Card" value={patient.rationCard || 'Not Provided'} />
                    <DetailItem icon="location-outline" label="Address" value={patient.address || 'N/A'} isLast />
                </View>

                {patient.role === 'Mother' || patient.pregnancyStatus === 'Pregnant' ? (
                    <>
                        <Text style={styles.sectionTitle}>Maternal Health Details</Text>
                        <View style={styles.card}>
                            <DetailItem icon="calendar-outline" label="Last Menstrual Period (LMP)" value={patient.lmp || 'Not Set'} />
                            <DetailItem icon="time-outline" label="Trimester" value={patient.trimester || 'Not Set'} />
                            <DetailItem icon="body-outline" label="Children Count" value={patient.noOfChildren || '0'} />
                            <DetailItem icon="medkit-outline" label="Known Health Issues" value={patient.healthIssues || 'None'} valueColor={patient.healthIssues !== 'None' ? '#D32F2F' : '#333'} isLast />
                        </View>
                    </>
                ) : null}

                <Text style={styles.sectionTitle}>Assignments & Jurisdiction</Text>
                <View style={styles.card}>
                    <DetailItem icon="business-outline" label="District" value={patient.district || 'Not Set'} />
                    <DetailItem icon="map-outline" label="Block / Ward" value={`${patient.assignedBlock || '-'} / ${patient.assignedWard || '-'}`} />
                    <DetailItem icon="medkit-outline" label="Assigned PHC" value={patient.assignedPhc || 'Not Assigned'} />
                    <DetailItem icon="person-circle-outline" label="ASHA Worker ID" value={patient.workerId || patient.ashaId || 'Unassigned'} isLast />
                </View>

                <View style={styles.actions}>
                    {patient.mobile && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9', borderColor: '#2E7D32', borderWidth: 1 }]} onPress={() => Linking.openURL(`tel:${patient.mobile}`)}>
                            <Ionicons name="call" size={20} color="#2E7D32" />
                            <Text style={[styles.actionBtnText, { color: '#2E7D32' }]}>Call Beneficiary</Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity style={styles.primaryActionBtn} onPress={() => router.push({ pathname: '/high-risk-detail', params: { beneficiaryId: userId, ashaId: patient.workerId } })}>
                        <Text style={styles.primaryActionText}>REVIEW RISK FACTORS</Text>
                    </TouchableOpacity>

                    {params.readOnly !== 'true' && (
                        <TouchableOpacity style={[styles.primaryActionBtn, { backgroundColor: '#2980B9', shadowColor: '#2980B9' }]} onPress={() => router.push({ pathname: '/health-entry', params: { memberId: userId, name: name } })}>
                            <Text style={styles.primaryActionText}>ADD HEALTH RECORD</Text>
                        </TouchableOpacity>
                    )}
                </View>

            </View>
        </ScrollView>
    );
}

const DetailItem = ({ icon, label, value, isLast = false, valueColor = '#333' }: any) => (
    <View style={[styles.detailItem, !isLast && styles.detailItemBorder]}>
        <Ionicons name={icon} size={20} color="#7F8C8D" style={styles.detailIcon} />
        <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, { color: valueColor }]}>{value || '---'}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#F8F9FA' },
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        backgroundColor: '#1F7A6B',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        zIndex: 10
    },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    headerSub: { color: '#E0F2F1', fontSize: 13, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
    topProfile: {
        alignItems: 'center',
        marginTop: -30,
        marginBottom: 20,
        zIndex: 20
    },
    profileAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#455A64',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#F8F9FA',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4
    },
    profileName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginTop: 10
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 15,
        marginTop: 8
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: 'bold'
    },
    content: { paddingHorizontal: 15 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#7F8C8D',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 15,
        marginLeft: 5
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        paddingHorizontal: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        marginBottom: 10
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15
    },
    detailItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0'
    },
    detailIcon: {
        marginRight: 15,
        backgroundColor: '#F8F9FA',
        padding: 8,
        borderRadius: 10,
        overflow: 'hidden'
    },
    detailTextContainer: { flex: 1 },
    detailLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
    detailValue: { fontSize: 15, fontWeight: '600' },
    actions: {
        marginTop: 20,
        marginBottom: 40,
        gap: 15
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12
    },
    actionBtnText: {
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16
    },
    primaryActionBtn: {
        backgroundColor: '#1F7A6B',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#1F7A6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5
    },
    primaryActionText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1
    }
});
