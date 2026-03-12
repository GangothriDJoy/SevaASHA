import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, useWindowDimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs , orderBy} from 'firebase/firestore';

export default function HighRiskTracker() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [allCases, setAllCases] = useState<any[]>([]);
    const [filteredCases, setFilteredCases] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState('All');

    const isLaptop = width > 768;
    const filters = ['All', 'Hypertension', 'Diabetes', 'Anemia', 'Pre-term'];

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
        else Alert.alert(title, message);
    };

    const fetchHighRiskData = async () => {
        try {
            setLoading(true);
            // Querying all vitals flagged as high risk
            const q = query(
                collection(db, "high_risk"), // Use the new flat collection name
                where("healthIssues", "==", "High Risk"),
                orderBy("recordedAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            const list: any[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data) {
                    list.push({ id: doc.id, ...data });
                }
            });
            setAllCases(list);
            setFilteredCases(list);
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to load high-risk records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHighRiskData(); }, []);

    // Filter Logic
    useEffect(() => {
        if (activeFilter === 'All') {
            setFilteredCases(allCases);
        } else {
            const filtered = allCases.filter(item => {
                // We look inside the riskFactors object we saved in HealthEntry
                const rf = item.riskFactors || {};

                if (activeFilter === 'Hypertension') return rf.hypertension === true;
                if (activeFilter === 'Diabetes') return rf.diabetes === true;
                if (activeFilter === 'Anemia') return rf.anemia === true;

                return false;
            });
            setFilteredCases(filtered);
        }
    }, [activeFilter, allCases]);

    const renderItem = ({ item }: any) => (
        <View style={styles.card}>
            <View style={styles.cardMain}>
                <View style={styles.badgeColumn}>
                    <View style={[styles.indicator, { backgroundColor: item.riskFactors?.hypertension ? '#D32F2F' : '#E67E22' }]} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.beneficiaryName || "Unknown Beneficiary"}</Text>
                    <Text style={styles.subText}>ASHA ID: {item.recordedBy} • Date: {item.recordedAt?.seconds ? item.recordedAt.toDate().toLocaleDateString() : "Recent"}</Text>

                    <View style={styles.vitalsRow}>
                        <View style={styles.vitalTag}>
                            <Text style={styles.vitalLabel}>BP</Text>
                            <Text style={styles.vitalValue}>{item.bloodPressure || "--"}</Text>
                        </View>
                        <View style={styles.vitalTag}>
                            <Text style={styles.vitalLabel}>HB</Text>
                            <Text style={styles.vitalValue}>{item.hemoglobin || "--"}</Text>
                        </View>
                        <View style={styles.vitalTag}>
                            <Text style={styles.vitalLabel}>Sugar</Text>
                            <Text style={styles.vitalValue}>{item.sugarLevel || "--"}</Text>
                        </View>
                        <View style={styles.vitalTag}>
                            <Text style={styles.vitalLabel}>Risk</Text>
                            <Text style={[styles.vitalValue, {color: '#D32F2F'}]}>{item.healthIssues === "High Risk" ? "High" : "Normal"}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => showAlert("Case Detail", `Instructions sent to worker for ${item.beneficiaryName}`)}
                >
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.content, isLaptop && styles.laptopContent]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={28} color="#E67E22" />
                    </TouchableOpacity>
                    <Text style={styles.title}>High Risk Tracker</Text>
                </View>

                {/* Filter Bar */}
                <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                        {filters.map(f => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.filterChip, activeFilter === f && styles.activeChip]}
                                onPress={() => setActiveFilter(f)}
                            >
                                <Text style={[styles.filterText, activeFilter === f && styles.activeFilterText]}>{f}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#E67E22" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        key={isLaptop ? 'laptop' : 'mobile'} // Forces fresh layout when resizing window
                        numColumns={isLaptop ? 2 : 1}
                        columnWrapperStyle={isLaptop ? { gap: 15, paddingHorizontal: 10 } : null}
                        data={filteredCases}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={<Text style={styles.empty}>No {activeFilter} cases found.</Text>}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA', alignItems: 'center' , marginTop: 15},
    content: { flex: 1, width: '100%', padding: 15 },
    laptopContent: { maxWidth: 900 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingTop: Platform.OS === 'ios' ? 40 : 10 },
    title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15, color: '#333' },

    filterBar: { marginBottom: 20, flexDirection: 'row' , paddingBottom: 5},
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eee', marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
    activeChip: { backgroundColor: '#E67E22' },
    filterText: { color: '#666', fontWeight: '600' },
    activeFilterText: { color: 'white' },

    card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, overflow: 'hidden',
        minWidth: Platform.OS === 'web' ? 400 : '100%', },
    cardMain: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    badgeColumn: { marginRight: 15 },
    indicator: { width: 6, height: 60, borderRadius: 3 },
    info: { flex: 1 },
    name: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
    subText: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },

    vitalsRow: { flexDirection: 'row', marginTop: 10, gap: 10 },
    vitalTag: { backgroundColor: '#FDF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center', minWidth: 60 },
    vitalLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase' },
    vitalValue: { fontSize: 13, fontWeight: '700', color: '#333' },

    detailsBtn: { padding: 10 },
    empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});