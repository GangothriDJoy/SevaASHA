import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function MyRecords() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<any[]>([]);

    useEffect(() => {
        const fetchAllPatients = async () => {
            try {
                // Securely fetch ONLY the beneficiaries assigned to this specific ASHA worker
                const patientQuery = workerMobile 
                    ? query(collection(db, "household_members"), where("workerId", "==", workerMobile))
                    : query(collection(db, "household_members")); // Fallback or global admin view
                
                const querySnapshot = await getDocs(patientQuery);
                const patientList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort alphabetically by name
                patientList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setPatients(patientList);
            } catch (error) {
                console.error("Error fetching records: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllPatients();
    }, [workerMobile]);

    // Fast local filter
    const filteredPatients = patients.filter(patient => {
        const nameMatch = patient.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const houseMatch = patient.houseId?.toString().includes(searchQuery);
        return nameMatch || houseMatch;
    });

    const renderPatientCard = ({ item }: { item: any }) => {
        const isPregnant = item.isPregnant === true || item.isPregnant === "true" || item.category === "Pregnant";
        const isHighRisk = item.healthStatus === "High Risk" || item.isHighRisk === true;
        const isChild = item.isChild === true || item.category === "Child" || (item.age && parseInt(item.age) <= 5);

        return (
            <TouchableOpacity
                style={[styles.card, isHighRisk && styles.highRiskCard]}
                activeOpacity={0.7}
                onPress={() => router.push({
                    pathname: "/patient-details",
                    params: { ...item }
                })}
            >
                <View style={styles.cardContent}>
                    <View style={[styles.iconCircle, isHighRisk && { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons 
                            name={isChild ? "happy" : (isPregnant ? "woman" : "person")} 
                            size={24} 
                            color={isHighRisk ? "#D32F2F" : "#1F7A6B"} 
                        />
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.nameText}>{item.name || "Unknown Patient"}</Text>
                        <Text style={styles.subText}>House ID: {item.houseId || "N/A"} • Age: {item.age || "--"}</Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {isPregnant && <Text style={styles.pregnantTag}>🤰 Pregnant</Text>}
                            {isChild && <Text style={styles.childTag}>👶 Child</Text>}
                            {isHighRisk && <Text style={styles.highRiskTag}>⚠️ High Risk</Text>}
                        </View>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Beneficiary Directory</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by Patient Name or House ID..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <Text style={styles.countText}>{filteredPatients.length} Active Records</Text>
            </View>

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={styles.loadingText}>Synchronizing secure records...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPatients}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPatientCard}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 30 }}
                    ListEmptyComponent={
                        <View style={styles.centerContent}>
                            <Ionicons name="folder-open-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No matching records found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    searchContainer: { padding: 15, paddingBottom: 10 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#eee', elevation: 1 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
    countText: { color: '#666', fontSize: 13, marginTop: 10, marginLeft: 5, fontWeight: '600' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
    loadingText: { color: '#666', marginTop: 15, fontSize: 16 },
    emptyText: { color: '#888', marginTop: 15, fontSize: 16 },
    card: { backgroundColor: 'white', padding: 16, marginBottom: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, borderWidth: 1, borderColor: '#eee' },
    highRiskCard: { borderColor: '#FFCDD2', borderWidth: 2, backgroundColor: '#FFFAFA' },
    cardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconCircle: { backgroundColor: '#E0F2F1', width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, marginRight: 15 },
    textContainer: { flex: 1 },
    nameText: { fontSize: 17, fontWeight: 'bold', color: '#222', textTransform: 'capitalize' },
    subText: { fontSize: 14, color: '#666', marginTop: 4 },
    pregnantTag: { color: '#D81B60', fontSize: 12, fontWeight: 'bold' },
    childTag: { color: '#1976D2', fontSize: 12, fontWeight: 'bold' },
    highRiskTag: { color: '#D32F2F', fontSize: 12, fontWeight: 'bold' }
});