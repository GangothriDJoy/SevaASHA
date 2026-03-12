import { View, Text, SectionList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Linking, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, writeBatch } from "firebase/firestore";

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
                orderBy("houseId")
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

    const handleDeleteMember = async (memberId: string, name: string) => {
        console.log("DELETE BUTTON PRESSED for:", name, "ID:", memberId);

        if (!memberId) {
            Alert.alert("Error", "Cannot delete: Invalid Member ID.");
            return;
        }

        // Web's Alert API is limited; fall back to window.confirm so callbacks fire
        const proceed = Platform.OS === 'web'
            ? window.confirm(`Remove ${name} from this household?`)
            : await new Promise<boolean>(resolve => {
                Alert.alert(
                    "Delete Record",
                    `Are you sure you want to remove ${name} from this household?`,
                    [
                        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                        { text: "Delete", style: "destructive", onPress: () => resolve(true) }
                    ],
                    { cancelable: true }
                );
            });

        if (!proceed) {
            console.log("Deletion cancelled for", memberId);
            return;
        }

        try {
            setLoading(true);
            console.log("Attempting to delete member from Firestore:", memberId);
            await deleteDoc(doc(db, "household_members", String(memberId)));
            console.log("Successfully deleted member:", memberId);
            await fetchHouseholdData();
            if (Platform.OS !== 'web') {
                Alert.alert("Success", `${name} has been removed.`);
            }
        } catch (error) {
            console.error("Delete Member Error:", error);
            Alert.alert("Error", "Could not delete member from database. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHouse = (houseId: string) => {
        Alert.alert(
            "Delete Entire Household?",
            `This will permanently remove House ${houseId} and all members/visit history inside it.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Everything",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const batch = writeBatch(db);

                            // 1. Find and queue all members for deletion
                            const membersQ = query(
                                collection(db, "household_members"),
                                where("houseId", "==", houseId),
                                where("workerId", "==", workerMobile)
                            );
                            const membersSnap = await getDocs(membersQ);
                            membersSnap.forEach((d) => batch.delete(d.ref));

                            // 2. Find and queue all visit logs for deletion
                            const visitsQ = query(
                                collection(db, "household_visits"),
                                where("houseId", "==", houseId),
                                where("workerId", "==", workerMobile)
                            );
                            const visitsSnap = await getDocs(visitsQ);
                            visitsSnap.forEach((d) => batch.delete(d.ref));

                            // 3. Commit the batch to Firestore
                            await batch.commit();

                            // 4. Refresh the UI
                            await fetchHouseholdData();
                            Alert.alert("Success", `House ${houseId} has been removed.`);
                        } catch (error) {
                            console.error("Delete House Error:", error);
                            Alert.alert("Error", "Failed to delete household. Check your connection.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (!text.trim()) {
            setFilteredMembers(members);
            return;
        }

        const filtered = members.filter(section => {
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
                        <View style={styles.houseHeaderContainer}>
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
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="home" size={18} color="#1F7A6B" />
                                    <Text style={styles.houseHeaderText}> House ID: {section.houseId}</Text>
                                    <Text style={styles.memberCount}>({section.totalInHouse} Members)</Text>
                                    <Ionicons name="pencil" size={14} color="#666" style={{ marginLeft: 6 }} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleDeleteHouse(section.houseId)}
                                style={styles.deleteHouseButton}
                            >
                                <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                            </TouchableOpacity>
                        </View>
                    )}
                    renderItem={({ item }) => {
                        const chronicList = item.chronicConditions || [];
                        const hasPriorityChronic =
                            chronicList.includes("Diabetes") ||
                            chronicList.includes("Hypertension");

                        return (
                            <View style={[styles.card, hasPriorityChronic && styles.chronicCard]}>

                                {/* Member Info */}
                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={() =>
                                        router.push({
                                            pathname: "./member-profile",
                                            params: {
                                                memberId: item.id,
                                                name: item.name,
                                                houseId: item.houseId,
                                                isPregnant: String(item.isPregnant || false),
                                                isBedridden: String(item.isBedridden || false),
                                                chronicConditions: JSON.stringify(chronicList)
                                            }
                                        })
                                    }
                                >
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text style={styles.subText}>
                                        {item.relationToHead} • Age: {item.age}
                                    </Text>
                                </TouchableOpacity>

                                {/* Delete */}
                                <TouchableOpacity
                                    onPress={(e) => {
                                        // ensure parent row doesn't also handle this press
                                        e.stopPropagation?.();
                                        handleDeleteMember(item.id, item.name);
                                    }}
                                    style={styles.actionButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                                </TouchableOpacity>

                                {/* Call */}
                                <TouchableOpacity
                                    style={[styles.callButton, styles.actionButton]}
                                    onPress={(e) => {
                                        e.stopPropagation?.();
                                        makeCall(item.mobile || item.phone);
                                    }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="call" size={20} color="white" />
                                </TouchableOpacity>

                            </View>
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
    actionButton: { marginRight: 10, padding: 5 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { color: '#666', fontSize: 13, marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
    houseHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E0F2F1', borderRadius: 8, marginTop: 15, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#1F7A6B' },
    houseHeader: { flex: 1, padding: 10, flexDirection: 'row', alignItems: 'center' },
    deleteHouseButton: { padding: 10 },
    houseHeaderText: { fontWeight: 'bold', color: '#00695C', fontSize: 15 },
    memberCount: { color: '#666', fontSize: 12, marginLeft: 8 },
    statusRow: { flexDirection: 'row', marginTop: 8, gap: 10 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    statusText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    callButton: { backgroundColor: "#4CAF50", padding: 10, borderRadius: 20, elevation: 2 },
    chronicCard: {
        borderLeftWidth: 5,
        borderLeftColor: '#D32F2F',
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