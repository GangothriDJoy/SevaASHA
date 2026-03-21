import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AnalyticsDashboard() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 800;

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalMothers: 0,
        totalChildren: 0,
        highRiskCases: 0,
        malnutritionAlerts: 0,
        missedVaccinations: 0,
        activeEmergencies: 0
    });

    useEffect(() => {
        let isMounted = true;
        let counts = {
            benMothers: 0, benChildren: 0, benHr: 0,
            hmMothers: 0, hmChildren: 0, hmHr: 0,
            usersMothers: 0, usersChildren: 0,
            malnutrition: 0, emerg: 0,
            missedVaxIds: new Set<string>(),
            benPregnantIds: new Set<string>(),
            hmPregnantIds: new Set<string>()
        };

        const syncStats = () => {
            if (isMounted) {
                const mergedMissedVax = new Set([
                    ...Array.from(counts.missedVaxIds),
                    ...Array.from(counts.benPregnantIds),
                    ...Array.from(counts.hmPregnantIds)
                ]);

                setStats({
                    totalMothers: counts.benMothers + counts.hmMothers + counts.usersMothers,
                    totalChildren: counts.benChildren + counts.hmChildren + counts.usersChildren,
                    highRiskCases: counts.benHr + counts.hmHr,
                    malnutritionAlerts: counts.malnutrition,
                    missedVaccinations: mergedMissedVax.size,
                    activeEmergencies: counts.emerg
                });
                setLoading(false);
            }
        };

        const qBen = query(collection(db, "beneficiaries"));
        const unsubBen = onSnapshot(qBen, (snapshot) => {
            let mCount = 0;
            let cCount = 0;
            let hCount = 0;
            const pIds = new Set<string>();

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                const isPregnant = data.pregnancyStatus === "Pregnant" || data.category === "Pregnant";
                const hasChildren = data.hasChildren === "Yes" || (data.childrenDetails && Array.isArray(data.childrenDetails) && data.childrenDetails.length > 0);
                
                if (isPregnant) pIds.add(doc.id);
                if (isPregnant) mCount++;
                if (hasChildren) mCount++;
                
                if (data.isChild === true || data.category === "Child" || data.role === "Child") cCount++;
                if (data.childrenDetails && Array.isArray(data.childrenDetails)) {
                    cCount += data.childrenDetails.length;
                }

                const isHighRisk = data.riskStatus === 'High' || (data.healthIssues && data.healthIssues !== 'None');
                if (isHighRisk) hCount++;
            });
            
            counts.benMothers = mCount;
            counts.benChildren = cCount;
            counts.benHr = hCount;
            counts.benPregnantIds = pIds;
            syncStats();
        });

        const qHm = query(collection(db, "household_members"));
        const unsubHm = onSnapshot(qHm, (snapshot) => {
            let mCount = 0;
            let cCount = 0;
            let hCount = 0;
            const pIds = new Set<string>();

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                const isPregnant = data.isPregnant === true || data.pregnancyStatus === "Pregnant" || data.category === "Pregnant";
                const hasChildren = data.hasChildren === "Yes" || (data.childrenDetails && Array.isArray(data.childrenDetails) && data.childrenDetails.length > 0);

                if (isPregnant) pIds.add(doc.id);
                if (isPregnant) mCount++;
                if (hasChildren) mCount++;

                const ageNum = parseInt(data.age);
                if (!isNaN(ageNum) && ageNum <= 18) cCount++;
                if (data.childrenDetails && Array.isArray(data.childrenDetails)) {
                    cCount += data.childrenDetails.length;
                }

                const bp = data.bloodPressure || "";
                const sys = parseInt(bp.split("/")[0]) || 0;
                const dia = parseInt(bp.split("/")[1]) || 0;
                const hasHighBp = sys >= 140 || dia >= 90 || parseInt(bp) >= 140;
                const sugar = parseInt(data.sugarLevel) || 0;
                const hasHighSugar = sugar >= 140;
                const conditions = data.chronicConditions || [];
                if (hasHighBp || hasHighSugar || conditions.length > 0) hCount++;
            });

            counts.hmMothers = mCount;
            counts.hmChildren = cCount;
            counts.hmHr = hCount;
            counts.hmPregnantIds = pIds;
            syncStats();
        });

        const qUsers = query(collection(db, "users"), where("role", "==", "Mother"));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
            let mCount = 0;
            let cCount = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                const isPregnant = data.isPregnant === true || data.pregnancyStatus === "Pregnant" || data.category === "Pregnant";
                const hasChildren = data.hasChildren === "Yes" || (data.childrenDetails && Array.isArray(data.childrenDetails) && data.childrenDetails.length > 0);
                
                if (isPregnant) mCount++;
                if (hasChildren) mCount++;
                if (data.childrenDetails && Array.isArray(data.childrenDetails)) cCount += data.childrenDetails.length;
            });
            counts.usersMothers = mCount;
            counts.usersChildren = cCount;
            syncStats();
        });

        const qMal = query(collection(db, "malnutrition_cases"), where("status", "==", "Active"));
        const unsubMal = onSnapshot(qMal, (snapshot) => {
            counts.malnutrition = snapshot.empty ? 0 : snapshot.docs.length;
            syncStats();
        });

        const todayISO = new Date().toISOString();
        const qMissed = query(collection(db, "vaccine_cards"), where("status", "==", "Pending"), where("dueDate", "<", todayISO));
        const unsubMissed = onSnapshot(qMissed, (snapshot) => {
            const vIds = new Set<string>();
            snapshot.forEach(doc => {
                if (doc.data().childId) vIds.add(doc.data().childId);
            });
            counts.missedVaxIds = vIds;
            syncStats();
        });

        const qEmerg = query(collection(db, "emergency"), where("status", "==", "UNRESOLVED"));
        const unsubEmerg = onSnapshot(qEmerg, (snapshot) => {
            counts.emerg = snapshot.empty ? 0 : snapshot.docs.length;
            syncStats();
        });

        syncStats();

        return () => {
            isMounted = false;
            unsubBen();
            unsubHm();
            unsubUsers();
            unsubMal();
            unsubMissed();
            unsubEmerg();
        };
    }, []);

    const renderBar = (label: string, value: number, color: string, maxVal: number) => {
        const barWidth = maxVal === 0 ? 0 : (value / maxVal) * 100;
        return (
            <View style={styles.chartRow} key={label}>
                <Text style={styles.chartLabel}>{label}</Text>
                <View style={styles.chartTrack}>
                    <View style={[styles.chartFill, { width: `${barWidth}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.chartValue}>{value}</Text>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#1F7A6B" />
                <Text style={styles.loadingText}>Compiling Analytics...</Text>
            </SafeAreaView>
        );
    }

    const { totalMothers, totalChildren, highRiskCases, malnutritionAlerts, missedVaccinations, activeEmergencies } = stats;
    const maxChartValue = Math.max(totalMothers, highRiskCases, malnutritionAlerts, 10);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ paddingRight: 15, zIndex: 10 }}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Analytics Dashboard</Text>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollInner, isLargeScreen && styles.scrollInnerLarge]}>
                <Text style={styles.sectionTitle}>Real-Time Metrics</Text>
                
                <View style={styles.grid}>
                    <DashboardCard title="Total Mothers" value={totalMothers} icon="woman" color="#1F7A6B" route="/maternal-registry" router={router} />
                    <DashboardCard title="Total Children" value={totalChildren} icon="happy" color="#1F7A6B" route="/child-registry" router={router} />
                    <DashboardCard title="High Risk Cases" value={highRiskCases} icon="warning" color="#F39C12" route="/high-risk" router={router} />
                    <DashboardCard title="Malnutrition Alerts" value={malnutritionAlerts} icon="nutrition" color="#D32F2F" route="/malnutrition" router={router} />
                    <DashboardCard title="Missed Vaccines" value={missedVaccinations} icon="medkit" color="#E67E22" route="/missed-vax" router={router} />
                    <DashboardCard title="Active Emergencies" value={activeEmergencies} icon="alert-circle" color="#D32F2F" route="/emergency" router={router} />
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Comparative Analysis</Text>
                <View style={styles.chartContainer}>
                    {renderBar("Mothers", totalMothers, "#1F7A6B", maxChartValue)}
                    {renderBar("High Risk", highRiskCases, "#F39C12", maxChartValue)}
                    {renderBar("Malnutrition", malnutritionAlerts, "#D32F2F", maxChartValue)}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const DashboardCard = ({ title, value, icon, color, route, router }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(route)}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={30} color={color} />
        </View>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
    loadingText: { marginTop: 15, color: '#666', fontSize: 16 },
    
    header: {
        backgroundColor: '#1F7A6B',
        paddingVertical: 20,
        paddingHorizontal: 20,
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginBottom: 15
    },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    
    scrollInner: { padding: 15, paddingBottom: 50, alignSelf: 'center', width: '100%' },
    scrollInnerLarge: { maxWidth: 1000, paddingHorizontal: 30 },
    
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 20, paddingLeft: 5, alignSelf: 'flex-start' },
    
    grid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between'
    },
    card: {
        width: '31.5%',
        backgroundColor: '#FFF',
        paddingVertical: 25,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 5
    },
    iconBox: {
        padding: 12,
        borderRadius: 50,
        marginBottom: 10
    },
    cardValue: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 6 },
    cardTitle: { fontSize: 11, color: '#7F8C8D', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    
    chartContainer: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        marginBottom: 20,
        width: '100%'
    },
    chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    chartLabel: { width: 100, fontSize: 14, color: '#555', fontWeight: '700' },
    chartTrack: { flex: 1, height: 14, backgroundColor: '#F0F0F0', borderRadius: 7, marginHorizontal: 15, overflow: 'hidden' },
    chartFill: { height: '100%', borderRadius: 7, elevation: 1 },
    chartValue: { width: 40, fontSize: 15, fontWeight: 'bold', color: '#333', textAlign: 'right' }
});