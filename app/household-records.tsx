import { View, Text, SectionList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";

export default function HouseholdRecords() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [members, setMembers] = useState<any[]>([]);
    const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (workerMobile) {
            fetchHouseholdData();
        }
    }, [workerMobile]);

    const fetchHouseholdData = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, "household_members"),
                where("workerId", "==", workerMobile),
                orderBy("houseId", "asc")
            );

            const querySnapshot = await getDocs(q);
            const list: any[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });

            const grouped = list.reduce((acc: any[], current: any) => {
                const house = acc.find(item => item.houseId === current.houseId);
                if (house) {
                    house.data.push(current);
                } else {
                    acc.push({
                        houseId: current.houseId,
                        totalInHouse: current.totalMembers || "N/A",
                        data: [current]
                    });
                }
                return acc;
            }, []);

            setMembers(grouped);
            setFilteredMembers(grouped);
        } catch (error) {
            console.error("Error fetching household records: ", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMember = (memberId: string, name: string) => {
        Alert.alert(
            "Delete Record",
            `Are you sure you want to remove ${name} from this household?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "household_members", memberId));
                            fetchHouseholdData();
                        } catch (error) {
                            Alert.alert("Error", "Could not delete member.");
                        }
                    }
                }
            ]
        );
    };

    // ✅ FIXED: Logic to filter by House ID or Name
    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (!text.trim()) {
            setFilteredMembers(members);
            return;
        }

        const filtered = members.filter(section => {
            // Safe access using optional chaining to prevent crash
            const houseIdMatch = String(section.houseId || "").toLowerCase().includes(text.toLowerCase());
            const memberMatch = section.data.some((m: any) =>
                String(m.name || "").toLowerCase().includes(text.toLowerCase())
            );
            return houseIdMatch || memberMatch;
        });
        setFilteredMembers(filtered);
    };

    const makeCall = (phoneNumber: string) => {
        if (phoneNumber && phoneNumber.trim().length > 0) {
            Linking.openURL(`tel:${phoneNumber}`);
        } else {
            Alert.alert("No Number", "No phone number was recorded for this family member.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Household Records</Text>
            </View>

            <View style={styles.searchSection}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    placeholder="Search by House ID or Name"
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 50 }} />
            ) : (
                <SectionList
                    sections={filteredMembers}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20 }}
                    stickySectionHeadersEnabled={true}
                    ListEmptyComponent={<Text style={styles.emptyText}>No matching records found.</Text>}
                    renderSectionHeader={({ section }) => (
                        <TouchableOpacity
                            style={styles.houseHeader}
                            onPress={() => router.push({
                                pathname: "/add-new",
                                params: {
                                    mobile: workerMobile,
                                    houseId: section.houseId,
                                    role: params.role,
                                    name: params.name
                                }
                            })}
                        >
                            <Ionicons name="home" size={18} color="#1F7A6B" />
                            <Text style={styles.houseHeaderText}> House ID: {section.houseId}</Text>
                            <Text style={styles.memberCount}>({section.totalInHouse} Members)</Text>
                        </TouchableOpacity>
                    )}
                    renderItem={({ item }) => {
                        const chronicList = item.chronicConditions || [];
                        const hasPriorityChronic =
                            chronicList.includes("Diabetes") || chronicList.includes("Hypertension");

                        return (
                            <TouchableOpacity
                                onPress={() => router.push({
                                    pathname: "./member-profile",
                                    params: {
                                        memberId: item.id,
                                        name: item.name,
                                        houseId: item.houseId,
                                        isPregnant: String(item.isPregnant || false),
                                        isBedridden: String(item.isBedridden || false),
                                        chronicConditions: JSON.stringify(chronicList)
                                    }
                                })}
                                onLongPress={() => handleDeleteMember(item.id, item.name)}
                                delayLongPress={500}
                            >
                                <View style={[styles.card, hasPriorityChronic && styles.chronicCard]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.name}>{item.name}</Text>
                                        <Text style={styles.subText}>{item.relationToHead} • Age: {item.age}</Text>
                                        <View style={styles.statusRow}>
                                            {item.isPregnant && (
                                                <View style={styles.statusBadge}>
                                                    <Ionicons name="woman" size={14} color="#D32F2F" />
                                                    <Text style={[styles.statusText, {color: '#D32F2F'}]}>Pregnant</Text>
                                                </View>
                                            )}
                                            {item.isBedridden && (
                                                <View style={styles.statusBadge}>
                                                    <Ionicons name="bed" size={14} color="#1F7A6B" />
                                                    <Text style={[styles.statusText, {color: '#1F7A6B'}]}>Bedridden</Text>
                                                </View>
                                            )}
                                        </View>
                                        {hasPriorityChronic && (
                                            <Text style={styles.chronicLabel}>
                                                Chronic: {chronicList.join(", ")}
                                            </Text>
                                        )}
                                    </View>
                                    <TouchableOpacity style={styles.callButton} onPress={() => makeCall(item.mobile || item.phone)}>
                                        <Ionicons name="call" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 15 },
    searchSection: { flexDirection: 'row', backgroundColor: 'white', margin: 15, borderRadius: 10, alignItems: 'center', paddingHorizontal: 15, elevation: 2 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 50, fontSize: 16 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { color: '#666', fontSize: 13, marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
    houseHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', padding: 10, borderRadius: 8, marginTop: 15, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#1F7A6B' },
    houseHeaderText: { fontWeight: 'bold', color: '#00695C', fontSize: 15 },
    memberCount: { color: '#666', fontSize: 12, marginLeft: 8 },
    statusRow: { flexDirection: 'row', marginTop: 8, gap: 10 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    statusText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    callButton: { backgroundColor: "#4CAF50", padding: 10, borderRadius: 20, elevation: 2 },
        chronicCard: {
            borderLeftWidth: 5,
            borderLeftColor: '#D32F2F', // Red indicator for chronic
            backgroundColor: '#FFF8F8',
        },
        chronicLabel: {
            marginTop: 5,
            fontSize: 12,
            fontWeight: 'bold',
            color: '#D32F2F',
            fontStyle: 'italic',
        },
});