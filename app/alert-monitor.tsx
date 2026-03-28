import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function AlertMonitor() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const alertId = params.id as string;
    const beneficiaryId = params.beneficiaryId as string;
    const message = params.message as string;
    const status = params.status as string;

    const [patient, setPatient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!beneficiaryId) {
                setLoading(false);
                return;
            }
            try {
                let docRef = doc(db, "beneficiaries", beneficiaryId);
                let snap = await getDoc(docRef);
                if (!snap.exists()) {
                    docRef = doc(db, "household_members", beneficiaryId);
                    snap = await getDoc(docRef);
                }
                if (snap.exists()) {
                    setPatient(snap.data());
                }
            } catch (error) {
                console.error("Error fetching beneficiary:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [beneficiaryId]);

    const handleAcknowledge = async () => {
        if (!alertId) return;
        setMarking(true);
        try {
            await updateDoc(doc(db, "alerts", alertId), {
                status: "Reviewed"
            });
            Alert.alert("Success", "Alert acknowledged and marked as reviewed.", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (e) {
            console.error("Failed to update alert", e);
            Alert.alert("Error", "Could not mark alert as reviewed. Please check connection.");
        } finally {
            setMarking(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#D32F2F" />
                <Text style={{ marginTop: 10, color: '#666' }}>Fetching case details...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Monitor High-Risk Alert</Text>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* 1. Alert Information */}
                <View style={styles.alertBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <Ionicons name="warning" size={24} color="#D32F2F" />
                        <Text style={styles.alertTitle}> Supervisor Alert / JPHN Instruction</Text>
                    </View>
                    <Text style={styles.alertMessage}>{message || "Please proceed to monitor the beneficiary."}</Text>
                    {status === 'Reviewed' && (
                        <View style={styles.reviewedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                            <Text style={{ color: '#2E7D32', fontWeight: 'bold', marginLeft: 5 }}>Already Reviewed</Text>
                        </View>
                    )}
                </View>

                {/* 2. Patient / Beneficiary Snapshot */}
                <Text style={styles.sectionTitle}>Beneficiary Snapshot</Text>
                {patient ? (
                    <View style={styles.patientCard}>
                        <View style={styles.nameRow}>
                            <Ionicons name="person-circle" size={40} color="#1F7A6B" />
                            <View style={{ marginLeft: 15 }}>
                                <Text style={styles.patientName}>{patient.fullName || patient.firstName || params.beneficiaryName || "Unknown Patient"}</Text>
                                <Text style={styles.patientRole}>{patient.role || 'Beneficiary'}</Text>
                            </View>
                        </View>

                        <View style={styles.detailGrid}>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Age / DOB</Text>
                                <Text style={styles.detailValue}>{patient.age || 'N/A'}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Health Conditions</Text>
                                <Text style={[styles.detailValue, { color: '#D32F2F' }]} numberOfLines={1}>{patient.healthIssues || 'None'}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Phone Number</Text>
                                <Text style={styles.detailValue}>{patient.mobile || patient.altMobile || 'N/A'}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Address/Ward</Text>
                                <Text style={styles.detailValue}>{patient.address || 'N/A'}</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.fullProfileBtn}
                            onPress={() => router.push({ pathname: '/patient-details', params: { id: beneficiaryId } })}
                        >
                            <Text style={styles.fullProfileText}>VIEW COMPLETE HEALTH RECORD</Text>
                            <Ionicons name="chevron-forward" size={16} color="#1F7A6B" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.patientCard}>
                        <Text style={{ color: '#666', textAlign: 'center' }}>Detailed profile data is unavailable.</Text>
                    </View>
                )}

                {/* 3. Action Logic */}
                {status !== 'Reviewed' && (
                    <View style={{ marginTop: 20 }}>
                        <TouchableOpacity 
                            style={styles.actionBtn}
                            onPress={handleAcknowledge}
                            disabled={marking}
                        >
                            {marking ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="checkbox-outline" size={20} color="white" />
                                    <Text style={styles.actionBtnText}>MARK AS REVIEWED</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.infoText}>
                            By marking this as reviewed, you confirm you have analyzed the patient's status. It will be dismissed from your recent alerts.
                        </Text>
                    </View>
                )}
                
                <View style={{ height: 60 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D32F2F', padding: 20, paddingTop: 50, elevation: 5 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    alertBox: { backgroundColor: '#FFEBEE', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#FFCDD2', marginBottom: 20 },
    alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#D32F2F' },
    alertMessage: { fontSize: 15, color: '#B71C1C', marginTop: 10, lineHeight: 22 },
    reviewedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginTop: 15 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12, marginLeft: 5 },
    patientCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    nameRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 15, marginBottom: 15 },
    patientName: { fontSize: 18, fontWeight: 'bold', color: '#111' },
    patientRole: { fontSize: 13, color: '#777', marginTop: 2 },
    detailGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    detailItem: { width: '48%', marginBottom: 15 },
    detailLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
    detailValue: { fontSize: 14, color: '#333', fontWeight: '500' },
    fullProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, backgroundColor: '#E8F2F0', padding: 12, borderRadius: 10 },
    fullProfileText: { color: '#1F7A6B', fontWeight: 'bold', fontSize: 12, marginRight: 5 },
    actionBtn: { flexDirection: 'row', backgroundColor: '#2E7D32', padding: 18, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
    infoText: { textAlign: 'center', color: '#666', fontSize: 12, marginTop: 12, paddingHorizontal: 10, lineHeight: 18 }
});
