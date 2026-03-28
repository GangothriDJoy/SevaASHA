import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView, Dimensions, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function ChildVaccineMonitor() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [vaccines, setVaccines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVaccines();
    }, []);

    const fetchVaccines = async () => {
        try {
            setLoading(true);

            const vcxQuery = query(collection(db, "vaccine_cards"), where("status", "==", "Pending"));
            const vcxSnap = await getDocs(vcxQuery);
            const vaxMap: Record<string, any[]> = {};
            vcxSnap.forEach(doc => {
                const data = doc.data();
                if (!vaxMap[data.childId]) vaxMap[data.childId] = [];
                vaxMap[data.childId].push(data);
            });

            const collectionRef = collection(db, "household_members");
            const qHm = query(collectionRef);
            const hmSnap = await getDocs(qHm);

            const children: any[] = [];
            const today = new Date().toISOString();

            hmSnap.forEach(doc => {
                const data = doc.data();
                const ageNum = parseInt(data.age);
                const isChild = data.isChild === true || data.category === "Child" || data.role === "Child" || (!isNaN(ageNum) && ageNum <= 5);

                if (isChild) {
                    const pendingVax = vaxMap[doc.id] || [];
                    if (pendingVax.length > 0) {
                        pendingVax.sort((a: any, b: any) => (a.dueDate < b.dueDate ? -1 : 1));
                        const nextVax = pendingVax[0];
                        data.nextVaccine = nextVax.vaccineName || 'Next Dose';
                        data.dueDate = nextVax.dueDate || 'Unknown';
                        data.status = nextVax.dueDate < today ? 'Overdue' : 'Pending';
                    } else {
                        data.nextVaccine = "All Caught Up";
                        data.dueDate = "N/A";
                        data.status = "Completed";
                    }
                    children.push({
                        id: doc.id,
                        childName: data.name || "Unknown Child",
                        age: data.age ? `${data.age} Years` : 'Unknown Age',
                        ward: data.houseId ? `House ID: ${data.houseId}` : 'Untracked',
                        vaccine: data.nextVaccine,
                        dueDate: data.dueDate !== "N/A" ? new Date(data.dueDate).toLocaleDateString() : '--',
                        status: data.status,
                        asha: data.workerName || data.workerId || 'Unassigned',
                        workerId: data.workerId,
                        ...data
                    });
                }

                if (data.childrenDetails && Array.isArray(data.childrenDetails)) {
                    data.childrenDetails.forEach((child: any, index: number) => {
                        const childId = `${doc.id}_child_${index}`;
                        const pendingVax = vaxMap[childId] || [];
                        let nVax = "All Caught Up";
                        let dDate = "N/A";
                        let stat = "Completed";

                        if (pendingVax.length > 0) {
                            pendingVax.sort((a: any, b: any) => (a.dueDate < b.dueDate ? -1 : 1));
                            const nextVax = pendingVax[0];
                            nVax = nextVax.vaccineName || 'Next Dose';
                            dDate = nextVax.dueDate || 'Unknown';
                            stat = nextVax.dueDate < today ? 'Overdue' : 'Pending';
                        }

                        children.push({
                            id: childId,
                            childName: child.name || "Child",
                            age: child.age ? `${child.age} Years` : 'Unknown',
                            ward: data.houseId ? `House ID: ${data.houseId}` : 'Untracked',
                            vaccine: nVax,
                            dueDate: dDate !== "N/A" ? new Date(dDate).toLocaleDateString() : '--',
                            status: stat,
                            asha: data.workerName || data.workerId || 'Unassigned',
                            workerId: data.workerId,
                            ...child
                        });
                    });
                }
            });

            // Deduplicate safely
            const uniqueChildren = Array.from(new Map(children.map(item => [item.id, item])).values());
            
            // Sort to show overdue first
            uniqueChildren.sort((a: any, b: any) => {
                const mapScore = (status: string) => status === 'Overdue' ? 2 : status === 'Pending' ? 1 : 0;
                return mapScore(b.status) - mapScore(a.status);
            });

            setVaccines(uniqueChildren);
        } catch (error) {
            console.error("Error fetching child vaccines:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVaccines = vaccines.filter(v => {
        const matchesSearch = v.childName.toLowerCase().includes(searchQuery.toLowerCase()) || v.vaccine.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus ? v.status === filterStatus : true;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Overdue': return '#D32F2F';
            case 'Pending': return '#F57C00';
            case 'Completed': return '#388E3C';
            default: return '#555';
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
                            <Text style={styles.headerTitle}>Child Vaccine</Text>
                            <Text style={styles.subHeaderText}>Immunization Surveillance</Text>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search child or vaccine..."
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
                            <Text style={[styles.filterText, !filterStatus && styles.activeFilterText]}>All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterStatus === 'Pending' && styles.activeFilterBtn]} 
                            onPress={() => setFilterStatus('Pending')}>
                            <Text style={[styles.filterText, filterStatus === 'Pending' && styles.activeFilterText]}>Upcoming</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterStatus === 'Overdue' && styles.activeFilterBtn]} 
                            onPress={() => setFilterStatus('Overdue')}>
                            <Text style={[styles.filterText, filterStatus === 'Overdue' && styles.activeFilterText]}>Overdue</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.filterBtn, filterStatus === 'Completed' && styles.activeFilterBtn]} 
                            onPress={() => setFilterStatus('Completed')}>
                            <Text style={[styles.filterText, filterStatus === 'Completed' && styles.activeFilterText]}>Completed</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>Vaccination Schedule ({filteredVaccines.length})</Text>

                    {loading ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <ActivityIndicator size="large" color="#0E6C6C" />
                            <Text style={{ marginTop: 10, color: '#666' }}>Scanning Vaccine Records...</Text>
                        </View>
                    ) : (
                        <>
                            {filteredVaccines.map(item => (
                                <View key={item.id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardTitleRow}>
                                            <View style={[styles.avatar, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                                                <Ionicons name="shield-checkmark" size={22} color={getStatusColor(item.status)} />
                                            </View>
                                            <View>
                                                <Text style={styles.childName}>{item.childName}</Text>
                                                <Text style={styles.wardText}>{item.age} • {item.ward}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.infoRow}>
                                        <View style={styles.infoIconBox}>
                                            <Ionicons name="medkit" size={16} color="#0E6C6C" />
                                        </View>
                                        <View style={styles.infoTextContainer}>
                                            <Text style={styles.infoLabel}>Vaccine Due</Text>
                                            <Text style={styles.infoValue}>{item.vaccine}</Text>
                                        </View>
                                        
                                        <View style={styles.infoIconBox}>
                                            <Ionicons name="calendar" size={16} color="#0E6C6C" />
                                        </View>
                                        <View style={styles.infoTextContainer}>
                                            <Text style={styles.infoLabel}>Date</Text>
                                            <Text style={[styles.infoValue, { color: item.status === 'Overdue' ? '#D32F2F' : '#333' }]}>
                                                {item.dueDate}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.footerRow}>
                                        <Text style={styles.ashaText}>Assigned ASHA: <Text style={{fontWeight:'700'}}>{item.asha}</Text></Text>
                                        <TouchableOpacity 
                                            style={styles.actionBtn}
                                            onPress={() => {
                                                router.push({
                                                    pathname: "/vaccine-card",
                                                    params: {
                                                        childId: item.id,
                                                        childName: item.childName,
                                                        dob: item.dobString || item.dob || "--",
                                                        readOnly: 'false'
                                                    }
                                                });
                                            }}
                                        >
                                            <Text style={styles.actionBtnText}>Update</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {filteredVaccines.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Ionicons name="shield-half" size={48} color="#CCC" />
                                    <Text style={styles.emptyText}>No vaccination records found.</Text>
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
    cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    childName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
    wardText: { fontSize: 13, color: '#666', fontWeight: '500' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '700' },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },

    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    infoIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F0F7F7', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    infoTextContainer: { flex: 1 },
    infoLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
    infoValue: { fontSize: 14, color: '#333', fontWeight: '700', marginTop: 2 },

    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
    ashaText: { fontSize: 13, color: '#555', fontWeight: '500' },
    actionBtn: { backgroundColor: '#0E6C6C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    actionBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },

    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { marginTop: 10, fontSize: 15, color: '#999', fontWeight: '500' },
});
