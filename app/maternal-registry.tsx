import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Linking } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function MaternalRegistry() {
    const [expectingMothers, setExpectingMothers] = useState<any[]>([]);
    const [mothersWithChildren, setMothersWithChildren] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'Expecting' | 'Mothers'>('Expecting');
    const router = useRouter();

    const params = useLocalSearchParams();
    const workerMobile = String(params.workerMobile || "").trim();
    const titleParam = String(params.title || "").trim();
    const isPregnancyOnly = titleParam === "Total Pregnancies";

    useEffect(() => {
        // If this page is launched strictly for Pregnancies, lock the active tab natively.
        if (isPregnancyOnly) setActiveTab('Expecting');
        
        let benList: any[] = [];
        let hmList: any[] = [];
        let usersList: any[] = [];
        
        const trySetMothers = () => {
             let combined = [...benList, ...hmList, ...usersList];
             if (workerMobile) {
                 combined = combined.filter((m: any) => m.workerId === workerMobile || m.ashaId === workerMobile);
             }

             const expecting: any[] = [];
             const withChildren: any[] = [];
             
             // Deduplicate by ID
             const uniqueMothers = Array.from(new Map(combined.map(item => [item.id, item])).values());
             
             uniqueMothers.forEach((m: any) => {
                 const isPregnant = m.isPregnant === true || m.pregnancyStatus === "Pregnant" || m.category === "Pregnant";
                 const hasChildren = m.hasChildren === "Yes" || (m.childrenDetails && Array.isArray(m.childrenDetails) && m.childrenDetails.length > 0);
                 
                 if (isPregnant) expecting.push(m);
                 if (hasChildren) withChildren.push(m);
             });

             setExpectingMothers(expecting);
             setMothersWithChildren(withChildren);
        };

        const qBen = query(collection(db, "beneficiaries"));
        const unsubBen = onSnapshot(qBen, (snap) => {
            benList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            trySetMothers();
        });

        const qHm = query(collection(db, "household_members"));
        const unsubHm = onSnapshot(qHm, (snap) => {
            hmList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            trySetMothers();
        });

        const qUsers = query(collection(db, "users"), where("role", "==", "Mother"));
        const unsubUsers = onSnapshot(qUsers, (snap) => {
            usersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            trySetMothers();
        });

        return () => { unsubBen(); unsubHm(); unsubUsers(); };
    }, [workerMobile, isPregnancyOnly]);

    const activeList = activeTab === 'Expecting' ? expectingMothers : mothersWithChildren;
    const filtered = activeList.filter(m => {
        const nameStr = String(m.fullName || m.name || (m.firstName ? m.firstName + " " + (m.lastName || "") : "") || "");
        return nameStr.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back() } else { router.replace('/') } }} style={{ paddingRight: 15, paddingVertical: 10 }}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isPregnancyOnly ? "Total Pregnancies" : "Maternal Registry"}</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Expecting' && styles.activeTab]}
                    onPress={() => setActiveTab('Expecting')}
                >
                    <Text style={[styles.tabText, activeTab === 'Expecting' && styles.activeTabText]}>Expecting Mothers</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{expectingMothers.length}</Text>
                    </View>
                </TouchableOpacity>

                {!isPregnancyOnly && (
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Mothers' && styles.activeTab]}
                        onPress={() => setActiveTab('Mothers')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Mothers' && styles.activeTabText]}>Mothers</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{mothersWithChildren.length}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput placeholder="Search by name..." style={styles.input} value={search} onChangeText={setSearch} />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 40, color: '#999'}}>No {activeTab === 'Expecting' ? 'expecting mothers' : 'mothers with children'} found</Text>}
                renderItem={({ item }) => {
                    const bp = item.bloodPressure || "";
                    const sys = parseInt(bp.split("/")[0]) || 0;
                    const dia = parseInt(bp.split("/")[1]) || 0;
                    const hasHighBp = sys >= 140 || dia >= 90 || parseInt(bp) >= 140;
                    const sugar = parseInt(item.sugarLevel) || 0;
                    const hasHighSugar = sugar >= 140;
                    const conditions = item.chronicConditions || [];
                    
                    const isHighRisk = item.riskStatus === 'High' || 
                                       (item.healthIssues && item.healthIssues !== 'None') ||
                                       hasHighBp || 
                                       hasHighSugar || 
                                       conditions.length > 0;

                    return (
                        <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: "/patient-details", params: { userId: item.id, readOnly: workerMobile ? 'false' : 'true' } })}>
                            <View style={styles.info}>
                                <Text style={styles.name}>{item.fullName || item.name || (item.firstName ? item.firstName + ' ' + (item.lastName || "") : "")}</Text>
                                <Text style={styles.subText}>
                                    {activeTab === 'Expecting' 
                                        ? `LMP: ${item.lmp || 'Not Set'} • Age: ${item.age || 'N/A'}` 
                                        : `Children: ${item.noOfChildren || (item.childrenDetails?.length) || '1'} • Mobile: ${item.mobile || item.userMobile || 'N/A'}`}
                                </Text>
                                <View style={[styles.badge, { backgroundColor: isHighRisk ? '#FFEBEE' : '#E8F5E9' }]}>
                                    <Text style={{ color: isHighRisk ? '#D32F2F' : '#2E7D32', fontSize: 12, fontWeight: 'bold' }}>
                                        {isHighRisk ? '⚠️ HIGH RISK' : '✅ STABLE'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                style={{ padding: 10, backgroundColor: '#E8F2F0', borderRadius: 20 }}
                                onPress={() => Linking.openURL(`tel:${item.mobile || item.userMobile}`)}
                            >
                                <Ionicons name="call" size={24} color="#1F7A6B" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 15 },
    searchBar: { flexDirection: 'row', backgroundColor: 'white', margin: 15, padding: 12, borderRadius: 10, elevation: 2, alignItems: 'center' },
    input: { flex: 1, marginLeft: 10 },
    card: { backgroundColor: 'white', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#1F7A6B' },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { color: '#666', fontSize: 13, marginTop: 4 },
    info: {
        flex: 1
    },
    workerInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, marginTop: 8 },

    tabContainer: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
    tab: { flex: 1, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#1F7A6B' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
    activeTabText: { color: '#1F7A6B', fontWeight: 'bold' },
    countBadge: { backgroundColor: '#E0F2F1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
    countText: { color: '#1F7A6B', fontSize: 11, fontWeight: 'bold' },
});