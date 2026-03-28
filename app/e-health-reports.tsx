import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function EHealthReports() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    
    const [reports, setReports] = useState([
        { id: '1', title: 'Maternal Health Summary', type: 'Maternal', stats: { main: 0, sub: 0, third: 0 }, descMain: 'Pregnant Women', descSub: 'High Risk', descThird: 'Postnatal' },
        { id: '2', title: 'Child Immunization Status', type: 'Vaccine', stats: { main: 0, sub: 0, third: 0 }, descMain: 'Total Children', descSub: 'Pending Doses', descThird: 'Overdue Doses' },
        { id: '3', title: 'Epidemiology Watch', type: 'Outbreak', stats: { main: 0, sub: 0, third: 0 }, descMain: 'Active Alerts', descSub: 'Critical Flags', descThird: 'Resolved' },
        { id: '4', title: 'ASHA Performance Report', type: 'Performance', stats: { main: 0, sub: 0, third: 0 }, descMain: 'Active Roles', descSub: 'Pending Tasks', descThird: 'Compliant' },
    ]);

    useEffect(() => {
        generateLiveReports();
    }, []);

    const generateLiveReports = async () => {
        try {
            setLoading(true);
            
            // 1. Maternal
            const hmSnap = await getDocs(query(collection(db, "household_members")));
            let pregCount = 0;
            let prgHighRisk = 0;
            let postNatal = 0;
            let childCount = 0;

            hmSnap.forEach(d => {
                const data = d.data();
                if (data.isPregnant === true || data.isPregnant === "true") {
                    pregCount++;
                    const c = data.chronicConditions || [];
                    if (c.includes?.('Diabetes') || c.includes?.('Hypertension')) prgHighRisk++;
                }
                if (data.status === 'Postnatal') postNatal++;

                const age = parseInt(data.age);
                if (data.isChild || (!isNaN(age) && age <= 5)) childCount++;
                if (data.childrenDetails && Array.isArray(data.childrenDetails)) {
                    childCount += data.childrenDetails.length;
                }
            });

            // 2. Vaccine
            const vSnap = await getDocs(query(collection(db, "vaccine_cards"), where("status", "==", "Pending")));
            let pendingVax = 0;
            let overdueVax = 0;
            const now = new Date().toISOString();
            vSnap.forEach(d => {
                pendingVax++;
                if (d.data().dueDate < now) overdueVax++;
            });

            // 3. Alerts
            const alertSnap = await getDocs(query(collection(db, "alerts")));
            let actAlerts = 0;
            let critAlerts = 0;
            let resAlerts = 0;
            alertSnap.forEach(d => {
                const data = d.data();
                if (data.status === 'Pending') {
                    actAlerts++;
                    if (data.severity === 'high' || data.type?.toLowerCase().includes('disease')) critAlerts++;
                } else {
                    resAlerts++;
                }
            });

            // 4. ASHA
            const uSnap = await getDocs(query(collection(db, "users"), where("role", "==", "ASHA Worker")));
            let activeAshas = 0;
            uSnap.forEach(() => { activeAshas++; });

            setReports([
                { id: '1', title: 'Maternal Health Synopsis', type: 'Maternal', stats: { main: pregCount, sub: prgHighRisk, third: postNatal }, descMain: 'Total Pregnancies', descSub: 'High Risk Config', descThird: 'Postnatal Phases' },
                { id: '2', title: 'Child Immunization Status', type: 'Vaccine', stats: { main: childCount, sub: pendingVax, third: overdueVax }, descMain: 'Children Logged', descSub: 'Gross Pending', descThird: 'Gross Overdue' },
                { id: '3', title: 'Epidemiology Watch', type: 'Outbreak', stats: { main: actAlerts, sub: critAlerts, third: resAlerts }, descMain: 'Active Alarms', descSub: 'Critical Triggers', descThird: 'Cleared Alarms' },
                { id: '4', title: 'ASHA Performance Report', type: 'Performance', stats: { main: activeAshas, sub: actAlerts, third: activeAshas * 20 }, descMain: 'Active Field Staff', descSub: 'Pending Field tasks', descThird: 'Weekly Quota' },
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getIconInfo = (type: string) => {
        switch (type) {
            case 'Maternal': return { name: 'woman', color: '#D81B60', bg: '#FCE4EC' };
            case 'Vaccine': return { name: 'shield-checkmark', color: '#1976D2', bg: '#E3F2FD' };
            case 'Outbreak': return { name: 'warning', color: '#F57C00', bg: '#FFF3E0' };
            case 'Performance': return { name: 'podium', color: '#388E3C', bg: '#E8F5E9' };
            default: return { name: 'document-text', color: '#0E6C6C', bg: '#E0F2F1' };
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0B5555" />
            <View style={styles.container}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.headerTextWrapper}>
                            <Text style={styles.headerTitle}>e-Health Reports</Text>
                            <Text style={styles.subHeaderText}>Live Database Summaries</Text>
                        </View>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={styles.sectionTitle}>Real-time Analytics Repository</Text>
                        <TouchableOpacity onPress={generateLiveReports}>
                            <Ionicons name="refresh" size={20} color="#0E6C6C" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={{ alignItems: 'center', marginTop: 80 }}>
                            <ActivityIndicator size="large" color="#0E6C6C" />
                            <Text style={{ marginTop: 15, color: '#666', fontWeight: '500' }}>Aggregating Live Data Points...</Text>
                        </View>
                    ) : (
                        reports.map(report => {
                            const icon = getIconInfo(report.type);
                            return (
                                <View key={report.id} style={styles.card}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
                                            <Ionicons name={icon.name as any} size={24} color={icon.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.reportTitle}>{report.title}</Text>
                                            <Text style={styles.reportSub}>Live Aggregation</Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.metricsRow}>
                                        <View style={styles.metricItem}>
                                            <Text style={[styles.metricVal, { color: icon.color }]}>{report.stats.main}</Text>
                                            <Text style={styles.metricLabel}>{report.descMain}</Text>
                                        </View>
                                        <View style={styles.metricDivider} />
                                        <View style={styles.metricItem}>
                                            <Text style={[styles.metricVal, { color: report.type === 'Vaccine' || report.type === 'Outbreak' ? '#D32F2F' : icon.color }]}>{report.stats.sub}</Text>
                                            <Text style={styles.metricLabel}>{report.descSub}</Text>
                                        </View>
                                        <View style={styles.metricDivider} />
                                        <View style={styles.metricItem}>
                                            <Text style={[styles.metricVal, { color: '#666' }]}>{report.stats.third}</Text>
                                            <Text style={styles.metricLabel}>{report.descThird}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const shadowConfig = Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    android: { elevation: 3 },
});

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0E6C6C' },
    container: { flex: 1, backgroundColor: '#F7FAFA' },
    header: {
        backgroundColor: '#0E6C6C',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 20 : 10,
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 10,
    },
    headerTopRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { padding: 8, marginLeft: -8, borderRadius: 20 },
    headerTextWrapper: { flex: 1, paddingHorizontal: 10 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
    subHeaderText: { color: '#A7D7D7', fontSize: 13, marginTop: 2, fontWeight: '500' },

    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 15,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    reportTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },
    reportSub: { fontSize: 12, color: '#888', fontWeight: '500' },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },

    metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metricItem: { flex: 1, alignItems: 'center' },
    metricVal: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    metricLabel: { fontSize: 11, color: '#777', fontWeight: '600', textAlign: 'center' },
    metricDivider: { width: 1, height: 30, backgroundColor: '#E0E0E0' },
});
