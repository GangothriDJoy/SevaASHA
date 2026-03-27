import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from './../firebaseConfig';

export default function HealthRecords() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [scans, setScans] = useState([
        { id: '1', date: '15 Feb 2026', type: 'Ultrasound (Anomaly Scan)', result: 'Normal', facility: 'PHC Kozhikode', doctor: 'Dr. Smitha' },
        { id: '2', date: '22 Jan 2026', type: 'Blood Test & Vitals', result: 'Hb: 11.2 g/dL', facility: 'CHC Center', doctor: 'Dr. Rajesh' },
        { id: '3', date: '10 Dec 2025', type: 'First Trimester Screen', result: 'Low Risk', facility: 'City Hospital', doctor: 'Dr. Smitha' }
    ]);

    useEffect(() => {
        // Simulating data fetch for aesthetics
        setTimeout(() => setLoading(false), 800);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Health Records</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#C2185B" style={{ marginTop: 50 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollArea}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIcon}>
                            <Ionicons name="fitness" size={32} color="#C2185B" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.summaryTitle}>Current Status: Healthy</Text>
                            <Text style={styles.summarySub}>Your vitals are stable. Next scan due in 2 weeks.</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Recent Checkups & Lab Reports</Text>
                    
                    {scans.map(scan => (
                        <View key={scan.id} style={styles.recordCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="document-text" size={20} color="#C2185B" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.recordType}>{scan.type}</Text>
                                    <Text style={styles.recordDate}>{scan.date} • {scan.facility}</Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{scan.result}</Text>
                                </View>
                            </View>
                            <View style={styles.cardFooter}>
                                <Text style={styles.doctorText}>Consultant: {scan.doctor}</Text>
                                <TouchableOpacity style={styles.viewBtn}>
                                    <Text style={styles.viewBtnText}>View File</Text>
                                    <Ionicons name="download-outline" size={16} color="#C2185B" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    
                    <TouchableOpacity style={styles.uploadBtn}>
                        <Ionicons name="cloud-upload" size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.uploadText}>Upload New Report</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { backgroundColor: '#C2185B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    backBtn: { paddingRight: 15 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    
    scrollArea: { padding: 20, paddingBottom: 50 },
    
    summaryCard: { flexDirection: 'row', backgroundColor: '#FCE4EC', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 25 },
    summaryIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2 },
    summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#880E4F', marginBottom: 4 },
    summarySub: { fontSize: 13, color: '#C2185B', lineHeight: 18 },
    
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    
    recordCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8BBD0', justifyContent: 'center', alignItems: 'center' },
    recordType: { fontSize: 15, fontWeight: 'bold', color: '#222' },
    recordDate: { fontSize: 12, color: '#666', marginTop: 2 },
    statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { color: '#2E7D32', fontSize: 11, fontWeight: 'bold' },
    
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 12 },
    doctorText: { fontSize: 13, color: '#555', fontStyle: 'italic' },
    viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    viewBtnText: { color: '#C2185B', fontWeight: 'bold', fontSize: 13, marginRight: 4 },
    
    uploadBtn: { backgroundColor: '#C2185B', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 3 },
    uploadText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
