
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, useWindowDimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';

export default function HighRiskTracker() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [allCases, setAllCases] = useState<any[]>([]);
    const [filteredCases, setFilteredCases] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState('All');
    const [sentAlerts, setSentAlerts] = useState<Set<string>>(new Set());

    const isLaptop = width > 768;
    const filters = ['All', 'Hypertension', 'Diabetes', 'Anemia', 'Thyroid', 'Heart Disease', 'Teenage Mother'];

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
        else Alert.alert(title, message);
    };

    const fetchHighRiskData = async () => {
        try {
            setLoading(true);
            const list: any[] = [];
            
            // 1. Querying formally recorded high-risk vitals
            const q = query(
                collection(db, "high_risk"), 
                where("healthIssues", "==", "High Risk"),
                orderBy("recordedAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data) {
                    list.push({ id: doc.id, ...data });
                }
            });

            // 2. Fetch Beneficiaries (Mothers) to catch Gestational Diabetes, etc.
            const benQ = query(collection(db, "beneficiaries"), where("role", "==", "Mother"));
            const benSnapshot = await getDocs(benQ);
            
            benSnapshot.forEach((doc) => {
                const data = doc.data();
                const healthStr = (data.healthIssues || "").toLowerCase();
                
                // Exclude "none" or empty.
                if(healthStr && healthStr !== "none" && healthStr !== "normal" && healthStr !== "-select-") {
                     
                     // Build synthetic risk factors
                     const isTeenage = data.age ? parseInt(data.age) < 20 : false;
                     const rf = {
                         hypertension: healthStr.includes("bp") || healthStr.includes("hypertension"),
                         diabetes: healthStr.includes("diabetes") || healthStr.includes("sugar"),
                         anemia: healthStr.includes("anemia"),
                         teenageMother: isTeenage || healthStr.includes("teen"),
                     };
                     
                     list.push({
                         id: doc.id + "_ben", 
                         beneficiaryId: doc.id,
                         beneficiaryName: data.fullName || data.name || "Unknown Beneficiary",
                         bloodPressure: rf.hypertension ? "High" : "--",
                         sugarLevel: rf.diabetes ? "High" : "--",
                         hemoglobin: rf.anemia ? "Low" : "--",
                         healthIssues: data.healthIssues,
                         riskFactors: rf,
                         recordedAt: data.createdAt ? new Date(data.createdAt) : new Date(), 
                         recordedBy: "Registration Form"
                     });
                }
            });

            // 3. Fetch health_records (Historical)
            const hrQ = query(collection(db, "health_records"));
            const hrSnapshot = await getDocs(hrQ);
            
            hrSnapshot.forEach((doc) => {
                const data = doc.data();
                const bp = data.bloodPressure || "";
                const bpLevels = bp.split("/");
                const sys = parseInt(bpLevels[0]) || 0;
                const dia = parseInt(bpLevels[1]) || 0;
                
                const sugar = parseInt(data.sugarLevel) || 0;
                const hb = parseFloat(data.hemoglobin) || 0;
                
                const hasHighBp = sys >= 140 || dia >= 90 || parseInt(bp) >= 140;
                const hasHighSugar = sugar >= 140;
                const hasLowHb = hb > 0 && hb < 11.0;
                
                if (hasHighBp || hasHighSugar || hasLowHb) {
                     const rf = {
                         hypertension: hasHighBp,
                         diabetes: hasHighSugar,
                         anemia: hasLowHb,
                         teenageMother: false
                     };
                     
                     list.push({
                         id: doc.id + "_hr", 
                         beneficiaryId: data.beneficiaryId || doc.id,
                         beneficiaryName: data.beneficiaryName || "Unknown",
                         bloodPressure: bp || "--",
                         sugarLevel: data.sugarLevel || "--",
                         hemoglobin: data.hemoglobin || "--",
                         healthIssues: "Historical Vitals",
                         riskFactors: rf,
                         recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(data.createdAt || Date.now()), 
                         recordedBy: data.recordedBy || "Unknown"
                     });
                }
            });

            // 4. Fetch household_members (General Population)
            const hmQ = query(collection(db, "household_members"));
            const hmSnapshot = await getDocs(hmQ);
            
            hmSnapshot.forEach((doc) => {
                const data = doc.data();
                
                const bp = data.bloodPressure || "";
                const bpLevels = bp.split("/");
                const sys = parseInt(bpLevels[0]) || 0;
                const dia = parseInt(bpLevels[1]) || 0;
                const hasHighBpVitals = sys >= 140 || dia >= 90 || parseInt(bp) >= 140; 
                
                const sugar = parseInt(data.sugarLevel) || 0;
                const hasHighSugarVitals = sugar >= 140; 
                
                const conditions = data.chronicConditions || [];
                const hasHypertension = conditions.includes("Hypertension") || hasHighBpVitals;
                const hasDiabetes = conditions.includes("Diabetes") || hasHighSugarVitals;
                const hasThyroid = conditions.includes("Thyroid");
                const hasHeartDisease = conditions.includes("Heart Disease");
                const hasAnemia = conditions.includes("Anemia");
                
                const isHighRisk = hasHypertension || hasDiabetes || hasThyroid || hasHeartDisease || hasAnemia;
                
                if (isHighRisk) {
                     const rf = {
                         hypertension: hasHypertension,
                         diabetes: hasDiabetes,
                         anemia: hasAnemia,
                         thyroid: hasThyroid,
                         heartDisease: hasHeartDisease,
                         teenageMother: false
                     };
                     
                     list.push({
                         id: doc.id + "_hm", 
                         beneficiaryId: doc.id,
                         beneficiaryName: data.name || "Unknown Member",
                         bloodPressure: data.bloodPressure || "--",
                         sugarLevel: data.sugarLevel || "--",
                         hemoglobin: "--",
                         healthIssues: conditions.join(', ') || ((hasHighBpVitals || hasHighSugarVitals) ? "High Vitals" : ""),
                         riskFactors: rf,
                         recordedAt: data.updatedAt ? new Date(data.updatedAt) : (data.createdAt ? new Date(data.createdAt) : new Date()), 
                         recordedBy: data.workerId || "General Checkup"
                     });
                }
            });

            // Sort merged list by Date descending
            list.sort((a, b) => {
                const getTime = (val: any) => {
                    if (!val) return 0;
                    if (val.seconds) return val.seconds * 1000;
                    if (val.toMillis) return val.toMillis();
                    return new Date(val).getTime();
                };
                return getTime(b.recordedAt) - getTime(a.recordedAt);
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

    // Listen to Alerts
    useEffect(() => {
        const q = query(
            collection(db, 'alerts'),
            where('type', '==', 'High Risk Review'),
            where('status', '==', 'Pending') 
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const active = new Set<string>();
            snapshot.forEach(doc => {
                active.add(doc.data().beneficiaryId);
            });
            setSentAlerts(active);
        });
        return () => unsubscribe();
    }, []);

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
                if (activeFilter === 'Thyroid') return rf.thyroid === true;
                if (activeFilter === 'Heart Disease') return rf.heartDisease === true;
                if (activeFilter === 'Teenage Mother') return rf.teenageMother === true;

                return false;
            });
            setFilteredCases(filtered);
        }
    }, [activeFilter, allCases]);

    const renderItem = ({ item }: any) => {
        const isAlertPending = sentAlerts.has(item.beneficiaryId);
        
        return (
            <View style={styles.card}>
                <View style={styles.cardMain}>
                    <View style={styles.badgeColumn}>
                        <View style={[styles.indicator, { backgroundColor: item.riskFactors?.hypertension || item.riskFactors?.heartDisease || item.riskFactors?.teenageMother ? '#D32F2F' : '#E67E22' }]} />
                    </View>
                    <View style={styles.info}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text style={styles.name}>{item.beneficiaryName || "Unknown Beneficiary"}</Text>
                            {isAlertPending && (
                                <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 10, backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10}}>
                                    <Ionicons name="paper-plane" size={10} color="#4CAF50" />
                                    <Text style={{fontSize: 10, color: '#4CAF50', marginLeft: 4, fontWeight: 'bold'}}>Alert Sent</Text>
                                </View>
                            )}
                        </View>
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
                            <Text style={[styles.vitalValue, { color: '#D32F2F' }]}>{(item.healthIssues === "High Risk" || item.riskFactors?.hypertension || item.riskFactors?.diabetes || item.riskFactors?.anemia || item.riskFactors?.teenageMother || item.riskFactors?.thyroid || item.riskFactors?.heartDisease) ? "High" : "Normal"}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => router.push({ 
                        pathname: '/high-risk-detail' as any, 
                        params: { 
                            id: item.id,
                            beneficiaryId: item.beneficiaryId || item.id,
                            beneficiaryName: item.beneficiaryName,
                            bloodPressure: item.bloodPressure || "--",
                            hemoglobin: item.hemoglobin || "--",
                            sugarLevel: item.sugarLevel || "--",
                            recordedBy: item.recordedBy || "Unknown",
                            riskFactorsRaw: JSON.stringify(item.riskFactors || {})
                        } 
                    })}
                    >
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

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
    container: { flex: 1, backgroundColor: '#F8F9FA', alignItems: 'center', marginTop: 15 },
    content: { flex: 1, width: '100%', padding: 15 },
    laptopContent: { maxWidth: 900 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingTop: Platform.OS === 'ios' ? 40 : 10 },
    title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15, color: '#333' },

    filterBar: { marginBottom: 20, flexDirection: 'row', paddingBottom: 5 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eee', marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
    activeChip: { backgroundColor: '#E67E22' },
    filterText: { color: '#666', fontWeight: '600' },
    activeFilterText: { color: 'white' },

    card: {
        backgroundColor: 'white', borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, overflow: 'hidden',
        minWidth: Platform.OS === 'web' ? 400 : '100%',
    },
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
