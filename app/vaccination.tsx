import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, FlatList } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function VaccinationTracking() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [activeTab, setActiveTab] = useState<'Children' | 'Pregnant'>('Children');
    const [childrenList, setChildrenList] = useState<any[]>([]);
    const [pregnantList, setPregnantList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchVaccinationTargets();
    }, [workerMobile]);

    const fetchVaccinationTargets = async () => {
        setLoading(true);
        try {
            const q = workerMobile
                ? query(collection(db, "household_members"), where("workerId", "==", workerMobile))
                : query(collection(db, "household_members"));

            const snapshot = await getDocs(q);

            const children: any[] = [];
            const pregnant: any[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                const ageNum = parseInt(data.age);

                if (!isNaN(ageNum) && ageNum <= 5) {
                    children.push({ id: doc.id, ...data });
                }

                if (data.isPregnant === true || data.isPregnant === "true") {
                    pregnant.push({ id: doc.id, ...data });
                }
            });

            setChildrenList(children);
            setPregnantList(pregnant);
        } catch (error) {
            console.error("Error fetching vaccination targets:", error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredData = () => {
        const sourceList = activeTab === 'Children' ? childrenList : pregnantList;
        if (!searchQuery.trim()) return sourceList;

        return sourceList.filter(item =>
            (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.houseId && String(item.houseId).toLowerCase().includes(searchQuery.toLowerCase()))
        );
    };

    const renderCard = ({ item }: { item: any }) => {
        const isChild = activeTab === 'Children';
        const isLowWeight = isChild && parseFloat(item.weight) < 10 && parseInt(item.age) >= 1;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    router.push({
                        pathname: "/vaccination-details",
                        params: {
                            childId: item.id,
                            name: item.name,
                            age: item.age,
                            houseId: item.houseId,
                            type: activeTab
                        }
                    });
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.avatarCircle}>
                        <Ionicons name={isChild ? "happy" : "woman"} size={24} color="#1F7A6B" />
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.nameText}>{item.name}</Text>
                        <Text style={styles.subText}>House: {item.houseId} • {isChild ? `Age: ${item.age} Years` : `Status: Pregnant`}</Text>
                    </View>
                    {isLowWeight && (
                        <View style={styles.miniAlert}>
                            <Ionicons name="warning" size={14} color="white" />
                            <Text style={styles.miniAlertText}>Underweight</Text>
                        </View>
                    )}
                </View>

                <View style={styles.vaccineDetails}>
                    <View>
                        <Text style={styles.vaccineLabel}>Vaccination Plan:</Text>
                        <Text style={styles.vaccineName}>
                            {isChild ? "View Child Health Card" : "View Maternal TT Schedule"}
                        </Text>
                    </View>
                    {/* Replaced button with a clean arrow icon for better UX */}
                    <Ionicons name="chevron-forward" size={20} color="#1F7A6B" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Immunization Tracker</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Children' && styles.activeTab]}
                    onPress={() => setActiveTab('Children')}
                >
                    <Text style={[styles.tabText, activeTab === 'Children' && styles.activeTabText]}>Children (0-5y)</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{childrenList.length}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Pregnant' && styles.activeTab]}
                    onPress={() => setActiveTab('Pregnant')}
                >
                    <Text style={[styles.tabText, activeTab === 'Pregnant' && styles.activeTabText]}>Pregnant Women</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{pregnantList.length}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.searchSection}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    placeholder="Search by name or house ID"
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={getFilteredData()}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    renderItem={renderCard}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            No {activeTab === 'Children' ? 'children' : 'pregnant women'} found.
                        </Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 15 },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
    tab: { flex: 1, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#1F7A6B' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
    activeTabText: { color: '#1F7A6B', fontWeight: 'bold' },
    countBadge: { backgroundColor: '#E0F2F1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8 },
    countText: { color: '#1F7A6B', fontSize: 11, fontWeight: 'bold' },
    searchSection: { flexDirection: 'row', backgroundColor: 'white', margin: 15, borderRadius: 10, alignItems: 'center', paddingHorizontal: 15, elevation: 1, borderWidth: 1, borderColor: '#eee' },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 45, fontSize: 15 },
    listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 10 },
    avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardInfo: { flex: 1 },
    nameText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 13, color: '#666', marginTop: 2 },
    miniAlert: { backgroundColor: '#D32F2F', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    miniAlertText: { color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    vaccineDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    vaccineLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
    vaccineName: { fontSize: 14, fontWeight: 'bold', color: '#1F7A6B', textDecorationLine: 'underline' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 15 }
});