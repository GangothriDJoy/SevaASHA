import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView, Dimensions, StatusBar, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function PregnancyMonitor() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRisk, setFilterRisk] = useState<string | null>(null);
    const [mothers, setMothers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMothers();
    }, []);

    const fetchMothers = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, "household_members"));
            const snap = await getDocs(q);
            
            const list = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((m: any) => m.isPregnant === true || m.isPregnant === "true" || m.status === "Postnatal");

            const formattedMothers = list.map(m => {
                const chronicList = Array.isArray(m.chronicConditions) 
                    ? m.chronicConditions 
                    : (typeof m.chronicConditions === 'string' ? m.chronicConditions.split(',').map(s=>s.trim()) : []);

                const isHighRisk = chronicList.some(c => 
                    c.includes("Diabetes") || c.includes("Hypertension") || c.includes("Thyroid")
                ) || m.isBedridden === "true" || m.isBedridden === true;
                
                const riskLevel = isHighRisk ? 'High' : (chronicList.length > 0 ? 'Medium' : 'Normal');

                return {
                    ...m, // Keep original data for "View Full Profile" passing
                    id: m.id,
                    name: m.name || "Unknown",
                    ward: m.houseId ? `House ID: ${m.houseId}` : 'Untracked Ward',
                    edd: m.lmpDate || "Pending (Based on LMP)",
                    asha: m.workerName || m.workerId || 'Unassigned',
                    workerId: m.workerId || 'unknown',
                    trimester: 2, // Default visual placeholder if not tracked precisely yet
                    risk: riskLevel,
                    lastVisit: 'Pending',
                    conditions: chronicList,
                };
            });

            setMothers(formattedMothers);
        } catch (e) {
            console.error("Mother Fetch Error:", e);
            Alert.alert("Error", "Could not retrieve Maternal tracking active cases");
        } finally {
            setLoading(false);
        }
    };

    const sendASHAAlert = async (mother: any) => {
        try {
            if (!mother.workerId || mother.workerId === 'unknown') {
                Alert.alert("Warning", "No specific ASHA worker assigned to this patient.");
                return;
            }
            await addDoc(collection(db, 'alerts'), {
                ashaId: mother.workerId,
                status: "Pending",
                type: "High Risk Maternal Alert",
                message: `URGENT: ${mother.name} (${mother.ward}) flagged as High Risk. Requires immediate monitoring.`,
                createdAt: serverTimestamp(),
                patientId: mother.id,
                targetRole: "ASHA Worker"
            });
            Alert.alert("Success", "Alert routed successfully to assigned ASHA worker.");
        } catch(e) {
            console.error("Alert Error:", e);
            Alert.alert("Error", "Could not route alert.");
        }
    };

    const filteredMothers = mothers.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.ward.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRisk = filterRisk ? m.risk === filterRisk : true;
        return matchesSearch && matchesRisk;
    });

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'High': return '#D32F2F';
            case 'Medium': return '#F57C00';
            default: return '#388E3C';
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
                            <Text style={styles.headerTitle}>Maternal Tracking</Text>
                            <Text style={styles.subHeaderText}>Surveillance & Monitoring</Text>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or house..."
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
                            style={[styles.filterBtn, !filterRisk && styles.activeFilterBtn]} 
                            onPress={() => setFilterRisk(null)}>
                            <Text style={[styles.filterText, !filterRisk && styles.activeFilterText]}>All Data</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterRisk === 'High' && styles.activeFilterBtn]} 
                            onPress={() => setFilterRisk('High')}>
                            <Text style={[styles.filterText, filterRisk === 'High' && styles.activeFilterText]}>High Risk</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterRisk === 'Medium' && styles.activeFilterBtn]} 
                            onPress={() => setFilterRisk('Medium')}>
                            <Text style={[styles.filterText, filterRisk === 'Medium' && styles.activeFilterText]}>Medium Risk</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterRisk === 'Normal' && styles.activeFilterBtn]} 
                            onPress={() => setFilterRisk('Normal')}>
                            <Text style={[styles.filterText, filterRisk === 'Normal' && styles.activeFilterText]}>Normal</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>Tracked Mothers ({filteredMothers.length})</Text>

                    {loading ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <ActivityIndicator size="large" color="#0E6C6C" />
                            <Text style={{ marginTop: 10, color: '#666' }}>Fetching database records...</Text>
                        </View>
                    ) : (
                        <>
                            {filteredMothers.map(mother => (
                                <View key={mother.id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardTitleRow}>
                                            <View style={[styles.avatar, { backgroundColor: getRiskColor(mother.risk) + '20' }]}>
                                                <Text style={[styles.avatarText, { color: getRiskColor(mother.risk) }]}>
                                                    {mother.name.charAt(0)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1, marginRight: 10 }}>
                                                <Text style={styles.motherName} numberOfLines={1}>{mother.name}</Text>
                                                <Text style={styles.wardText} numberOfLines={1}>{mother.ward} • ASHA: {mother.asha}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(mother.risk) + '15' }]}>
                                            <Text style={[styles.riskText, { color: getRiskColor(mother.risk) }]}>{mother.risk} Risk</Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.infoGrid}>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>EDD / LMP</Text>
                                            <Text style={styles.infoValue}>{mother.edd}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Age</Text>
                                            <Text style={styles.infoValue}>{mother.age || "N/A"}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Last Visit</Text>
                                            <Text style={styles.infoValue}>{mother.lastVisit}</Text>
                                        </View>
                                    </View>

                                    {mother.conditions.length > 0 && (
                                        <View style={styles.conditionsWrapper}>
                                            <Ionicons name="warning" size={14} color="#D32F2F" />
                                            <Text style={styles.conditionsText}>{mother.conditions.join(', ')}</Text>
                                        </View>
                                    )}

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                                        <TouchableOpacity 
                                            style={[styles.actionBtn, { flex: 1, marginRight: mother.risk === 'High' ? 10 : 0 }]}
                                            onPress={() => router.push({ 
                                                pathname: "/patient-details", 
                                                params: { 
                                                    ...mother,
                                                    isPregnant: String(mother.isPregnant || false),
                                                    isBedridden: String(mother.isBedridden || false),
                                                    chronicConditions: Array.isArray(mother.chronicConditions) ? mother.chronicConditions.join(", ") : mother.chronicConditions
                                                } 
                                            })}
                                        >
                                            <Text style={styles.actionBtnText}>View Full Profile</Text>
                                            <Ionicons name="arrow-forward" size={16} color="#0E6C6C" />
                                        </TouchableOpacity>

                                        {mother.risk === 'High' && (
                                            <TouchableOpacity 
                                                style={[styles.actionBtn, { flex: 1, backgroundColor: '#FFEBEE' }]} 
                                                onPress={() => sendASHAAlert(mother)}
                                            >
                                                <Text style={[styles.actionBtnText, { color: '#D32F2F' }]}>Alert ASHA</Text>
                                                <Ionicons name="warning" size={16} color="#D32F2F" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))}
                            
                            {filteredMothers.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Ionicons name="folder-open-outline" size={48} color="#CCC" />
                                    <Text style={styles.emptyText}>No tracking records found.</Text>
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

    scrollContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 40 },
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 18, fontWeight: '800' },
    motherName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
    wardText: { fontSize: 12, color: '#666', fontWeight: '500' },
    riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    riskText: { fontSize: 11, fontWeight: '700' },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },

    infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    infoItem: { flex: 1 },
    infoLabel: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 4 },
    infoValue: { fontSize: 14, color: '#333', fontWeight: '700' },

    conditionsWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 10, borderRadius: 10, marginBottom: 15 },
    conditionsText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginLeft: 6 },

    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7FAFA', paddingVertical: 12, borderRadius: 12 },
    actionBtnText: { fontSize: 13, color: '#0E6C6C', fontWeight: '700', marginRight: 6 },

    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { marginTop: 10, fontSize: 15, color: '#999', fontWeight: '500' },
});
