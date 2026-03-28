import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig"; // Ensure this path correctly points to your Firebase setup
import { collection, getDocs } from "firebase/firestore";

export default function MyRecords() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<any[]>([]);

    // 1. Fetch everyone from the database when the screen loads
    useEffect(() => {
        const fetchAllPatients = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "household_members"));
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
    }, []);

    // 2. Filter logic for the search bar (searches by Name or House ID)
    const filteredPatients = patients.filter(patient => {
        const nameMatch = patient.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const houseMatch = patient.houseId?.toString().includes(searchQuery);
        return nameMatch || houseMatch;
    });

    // 3. UI Design for each person's card in the list
    const renderPatientCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            // WHEN TAPPED: Go to Patient Details and pass all this person's info along
            onPress={() => router.push({
                pathname: "/patient-details",
                params: { ...item }
            })}
        >
            <View style={styles.cardContent}>
                {/* Green Person Icon */}
                <View style={styles.iconCircle}>
                    <Ionicons name="person" size={24} color="#1F7A6B" />
                </View>

                {/* Person's Text Info */}
                <View style={styles.textContainer}>
                    <Text style={styles.nameText}>{item.name || "Unknown Name"}</Text>
                    <Text style={styles.subText}>House ID: {item.houseId || "N/A"} • Age: {item.age || "--"}</Text>

                    {/* Shows the pink tag only if they are pregnant */}
                    {(item.isPregnant === true || item.isPregnant === "true") && (
                        <Text style={styles.pregnantTag}>🤰 Pregnant</Text>
                    )}
                </View>
            </View>

            {/* Clickable Arrow Icon */}
            <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Top Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Beneficiary Records</Text>
            </View>

            {/* Search Bar Section */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by Name or House ID..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* The Scrollable List */}
            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={styles.loadingText}>Loading community records...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPatients}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPatientCard}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View style={styles.centerContent}>
                            <Ionicons name="folder-open-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No records found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

// Clean Styles matching your SevaASHA Theme
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    searchContainer: { padding: 20, paddingBottom: 10 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, height: 50, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', elevation: 1 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    loadingText: { color: '#666', marginTop: 15, fontSize: 16 },
    emptyText: { color: '#999', marginTop: 15, fontSize: 16 },
    card: { backgroundColor: 'white', padding: 15, marginBottom: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    cardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconCircle: { backgroundColor: '#E0F2F1', padding: 12, borderRadius: 25, marginRight: 15 },
    textContainer: { flex: 1 },
    nameText: { fontSize: 18, fontWeight: 'bold', color: '#222', textTransform: 'capitalize' },
    subText: { fontSize: 14, color: '#666', marginTop: 4 },
    pregnantTag: { color: '#D81B60', fontSize: 13, fontWeight: 'bold', marginTop: 6 }
});