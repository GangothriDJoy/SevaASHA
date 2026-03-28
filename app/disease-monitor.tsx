import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView, Dimensions, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function DiseaseMonitor() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch specific high risk / disease related alerts
        const qAlerts = query(collection(db, "alerts"), orderBy("createdAt", "desc"));
        const unsubAlerts = onSnapshot(qAlerts, async (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(d => {
                const data = d.data();
                // Filter specifically for health/disease surveillance context if possible, otherwise pull all for demo
                const typeStr = (data.type || '').toLowerCase();
                const isHealthAlert = typeStr.includes('disease') || typeStr.includes('outbreak') || typeStr.includes('risk') || typeStr.includes('fever') || typeStr.includes('dengue') || typeStr.includes('malnutrition');
                
                // Also pull from emergencies
                if (isHealthAlert || data.targetRole === "JPHN") {
                    list.push({
                        id: d.id,
                        type: data.type || "Health Incident",
                        location: data.patientId || data.ashaId || 'Untracked Region', // Normally a ward name
                        cases: data.severity === 'high' ? Math.floor(Math.random() * 5) + 1 : 1, // Simulated case aggregation for identical patient alerts
                        status: data.status === 'Pending' ? 'Warning' : (data.status === 'Resolved' || data.status === 'Reviewed' ? 'Resolved' : 'Monitoring'),
                        date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'Recent',
                        asha: data.ashaId || "System Flag",
                        ...data
                    });
                }
            });

            // Additionally, scan household members for distinct disease clusters (like Dengue, Fever, Diarrhea)
            const collectionRef = collection(db, "household_members");
            const hmSnap = await getDocs(query(collectionRef));
            
            const diseaseCounts: Record<string, { count: number, asha: string, date: string }> = {};
            
            hmSnap.forEach(hdoc => {
                const hData = hdoc.data();
                const chronicList = Array.isArray(hData.chronicConditions) 
                    ? hData.chronicConditions 
                    : (typeof hData.chronicConditions === 'string' ? hData.chronicConditions.split(',').map(s=>s.trim()) : []);
                
                chronicList.forEach(c => {
                    const cLower = c.toLowerCase();
                    if (cLower.includes("fever") || cLower.includes("dengue") || cLower.includes("malaria") || cLower.includes("diarrhea") || cLower.includes("virus")) {
                        const locKey = `${c} - House ${hData.houseId || 'Unknown'}`;
                        if (!diseaseCounts[locKey]) {
                            diseaseCounts[locKey] = { count: 0, asha: hData.workerName || hData.workerId || 'Unassigned', date: new Date().toLocaleDateString() };
                        }
                        diseaseCounts[locKey].count += 1;
                    }
                });
            });

            // Merge clusters into alerts list
            Object.keys(diseaseCounts).forEach(diseaseKey => {
                const splits = diseaseKey.split(' - ');
                const type = splits[0];
                const location = splits[1];
                const dData = diseaseCounts[diseaseKey];
                list.push({
                    id: `cluster_${diseaseKey.replace(/[^a-zA-Z]/g, '')}`,
                    type: type,
                    location: location,
                    cases: dData.count,
                    status: dData.count > 3 ? 'Critical' : 'Monitoring',
                    date: dData.date,
                    asha: dData.asha
                });
            });

            list.sort((a,b) => {
                const mapScore = (status: string) => status === 'Critical' ? 3 : status === 'Warning' ? 2 : 1;
                return mapScore(b.status) - mapScore(a.status);
            });

            setAlerts(list);
            setLoading(false);
        });

        return () => unsubAlerts();
    }, []);

    const filteredAlerts = alerts.filter(alert => {
        const matchesSearch = alert.type.toLowerCase().includes(searchQuery.toLowerCase()) || alert.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus ? alert.status === filterStatus : true;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Critical': return '#D32F2F';
            case 'Warning': return '#F57C00';
            case 'Monitoring': return '#1976D2';
            case 'Resolved': return '#388E3C';
            default: return '#555';
        }
    };

    const getIconName = (type: string) => {
        const tLower = type.toLowerCase();
        if (tLower.includes('dengue') || tLower.includes('malaria')) return 'bug';
        if (tLower.includes('fever')) return 'thermometer';
        if (tLower.includes('diarrhea')) return 'water';
        return 'pulse';
    };

    const stats = {
        warnings: alerts.filter(a => a.status === 'Warning').length,
        critical: alerts.filter(a => a.status === 'Critical').length,
        monitoring: alerts.filter(a => a.status === 'Monitoring').length,
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
                            <Text style={styles.headerTitle}>Disease Watch</Text>
                            <Text style={styles.subHeaderText}>Outbreak Surveillance Hub</Text>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search disease or ward..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#777" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* FILTERS */}
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        <TouchableOpacity 
                            style={[styles.filterBtn, !filterStatus && styles.activeFilterBtn]} 
                            onPress={() => setFilterStatus(null)}>
                            <Text style={[styles.filterText, !filterStatus && styles.activeFilterText]}>All Alerts</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterStatus === 'Critical' && styles.activeFilterBtn]} 
                            onPress={() => setFilterStatus('Critical')}>
                            <Text style={[styles.filterText, filterStatus === 'Critical' && styles.activeFilterText]}>Critical</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterStatus === 'Warning' && styles.activeFilterBtn]} 
                            onPress={() => setFilterStatus('Warning')}>
                            <Text style={[styles.filterText, filterStatus === 'Warning' && styles.activeFilterText]}>Warning</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterStatus === 'Monitoring' && styles.activeFilterBtn]} 
                            onPress={() => setFilterStatus('Monitoring')}>
                            <Text style={[styles.filterText, filterStatus === 'Monitoring' && styles.activeFilterText]}>Monitoring</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterStatus === 'Resolved' && styles.activeFilterBtn]} 
                            onPress={() => setFilterStatus('Resolved')}>
                            <Text style={[styles.filterText, filterStatus === 'Resolved' && styles.activeFilterText]}>Resolved</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* SUMMARY STATS */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{stats.warnings}</Text>
                        <Text style={styles.statLabel}>Active Warnings</Text>
                    </View>
                    <View style={styles.dividerVertical} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statVal, {color: '#D32F2F'}]}>{stats.critical}</Text>
                        <Text style={styles.statLabel}>Critical Zones</Text>
                    </View>
                    <View style={styles.dividerVertical} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statVal, {color: '#1976D2'}]}>{stats.monitoring}</Text>
                        <Text style={styles.statLabel}>Under Watch</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>Recent Incident Reports</Text>

                    {loading ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <ActivityIndicator size="large" color="#0E6C6C" />
                            <Text style={{ marginTop: 10, color: '#666' }}>Scanning Database for Outbreaks...</Text>
                        </View>
                    ) : (
                        <>
                            {filteredAlerts.map(alert => (
                                <View key={alert.id} style={[styles.card, alert.status === 'Critical' && styles.criticalCard]}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardTitleRow}>
                                            <View style={[styles.iconBox, { backgroundColor: getStatusColor(alert.status) + '15' }]}>
                                                <Ionicons name={getIconName(alert.type) as any} size={24} color={getStatusColor(alert.status)} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.alertType} numberOfLines={2}>{alert.type}</Text>
                                                <Text style={styles.locationText} numberOfLines={1}>{alert.location}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(alert.status) + '15' }]}>
                                            <Text style={[styles.statusText, { color: getStatusColor(alert.status) }]}>{alert.status}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.infoRow}>
                                        <View style={styles.infoCol}>
                                            <Text style={styles.infoLabel}>Affected Cases</Text>
                                            <Text style={styles.infoValue}>{alert.cases} Persons</Text>
                                        </View>
                                        <View style={styles.infoCol}>
                                            <Text style={styles.infoLabel}>Reported By</Text>
                                            <Text style={styles.infoValue}>{alert.asha}</Text>
                                        </View>
                                        <View style={styles.infoCol}>
                                            <Text style={styles.infoLabel}>Date</Text>
                                            <Text style={styles.infoValue}>{alert.date}</Text>
                                        </View>
                                    </View>

                                    {alert.status === 'Critical' && (
                                        <TouchableOpacity style={styles.actionBtnCritical}>
                                            <Ionicons name="flash" size={16} color="white" />
                                            <Text style={styles.actionBtnTextCritical}>Deploy Interventions</Text>
                                        </TouchableOpacity>
                                    )}
                                    {alert.status !== 'Critical' && (
                                        <TouchableOpacity 
                                            style={styles.actionBtnNormal}
                                            onPress={async () => {
                                                if (alert.id && !alert.id.toString().startsWith('cluster')) {
                                                    try {
                                                        await updateDoc(doc(db, "alerts", alert.id), { status: 'Reviewed' });
                                                    } catch (e) {
                                                        console.error("error marking reviewed", e);
                                                    }
                                                }
                                            }}
                                        >
                                            <Text style={styles.actionBtnTextNormal}>{alert.id && alert.id.toString().startsWith('cluster') ? 'View Cluster details' : 'Mark Reviewed'}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                            {filteredAlerts.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Ionicons name="checkmark-circle-outline" size={48} color="#CCC" />
                                    <Text style={styles.emptyText}>No alerts matching your criteria.</Text>
                                </View>
                            )}
                        </>
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
    headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { padding: 8, marginLeft: -8, borderRadius: 20 },
    headerTextWrapper: { flex: 1, paddingHorizontal: 10 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
    subHeaderText: { color: '#A7D7D7', fontSize: 13, marginTop: 2, fontWeight: '500' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 50,
        ...shadowConfig,
        shadowOpacity: 0.1,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
    
    filterContainer: { marginTop: 15, marginBottom: 5 },
    filterScroll: { paddingHorizontal: 20 },
    filterBtn: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#E0F2F1',
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    activeFilterBtn: { backgroundColor: '#0E6C6C', borderColor: '#0E6C6C' },
    filterText: { fontSize: 13, fontWeight: '700', color: '#0E6C6C' },
    activeFilterText: { color: '#FFFFFF' },

    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginTop: 15,
        borderRadius: 15,
        padding: 15,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    statBox: { flex: 1, alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: '800', color: '#0E6C6C' },
    statLabel: { fontSize: 11, color: '#777', marginTop: 4, fontWeight: '600' },
    dividerVertical: { width: 1, backgroundColor: '#E0E0E0', marginVertical: 5 },

    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 15 },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 15,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    criticalCard: { borderLeftWidth: 4, borderLeftColor: '#D32F2F', paddingLeft: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    alertType: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
    locationText: { fontSize: 13, color: '#666', fontWeight: '500' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 10 },
    statusText: { fontSize: 11, fontWeight: '700' },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    infoCol: { flex: 1 },
    infoLabel: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 4 },
    infoValue: { fontSize: 13, color: '#333', fontWeight: '700' },

    actionBtnCritical: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D32F2F', paddingVertical: 12, borderRadius: 12 },
    actionBtnTextCritical: { color: 'white', fontSize: 14, fontWeight: '700', marginLeft: 8 },
    actionBtnNormal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F7F7', paddingVertical: 12, borderRadius: 12 },
    actionBtnTextNormal: { color: '#0E6C6C', fontSize: 14, fontWeight: '700' },

    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { marginTop: 10, fontSize: 15, color: '#999', fontWeight: '500' },
});
