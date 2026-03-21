import { View, Text, SectionList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Linking, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
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

    useFocusEffect(
        useCallback(() => {
            if (workerMobile) {
                fetchHouseholdData();
            } else {
                fetchHouseholdData(); // Global fetch fallback
            }
        }, [workerMobile])
    );

    const fetchHouseholdData = async () => {
        try {
            setLoading(true);
            const q = workerMobile 
                ? query(collection(db, "household_members"), where("workerId", "==", workerMobile), orderBy("houseId"))
                : query(collection(db, "household_members"), orderBy("houseId"));

            const querySnapshot = await getDocs(q);
            const list: any[] = [];
            querySnapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });

            // Group strictly into SectionList compliant format
            const grouped = list.reduce((acc: any[], current: any) => {
                const house = acc.find(item => item.houseId === current.houseId);
                if (house) {
                    house.data.push(current);
                } else {
                    acc.push({
                        id: current.houseId, // For unique keys
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
            console.error("Error fetching household records:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMember = async (memberId: string, name: string) => {
        if (!memberId) {
            Alert.alert("Execution Error", "Invalid Member Instance ID.");
            return;
        }

        const proceed = Platform.OS === 'web'
            ? window.confirm(`Permanently remove ${name} from this census registry?`)
            : await new Promise<boolean>(resolve => {
                Alert.alert(
                    "Secure Deletion",
                    `Are you strictly sure you want to sever ${name} from this household?`,
                    [
                        { text: "Abort", style: "cancel", onPress: () => resolve(false) },
                        { text: "Sever Record", style: "destructive", onPress: () => resolve(true) }
                    ]
                );
            });

        if (!proceed) return;

        try {
            setLoading(true);
            await deleteDoc(doc(db, "household_members", String(memberId)));
            await fetchHouseholdData(); // Re-sync structure natively
            if (Platform.OS !== 'web') Alert.alert("Record Severed", `${name} has been securely purged.`);
        } catch (error) {
            console.error("Delete Member Error:", error);
            Alert.alert("Operation Blocked", "Network timeout or permission rejection.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHouse = (houseId: string) => {
        Alert.alert(
            "Purge Entire Household?",
            `You are attempting to completely purge Household [${houseId}] and all its connected records/history permanently.`,
            [
                { text: "Abort", style: "cancel" },
                {
                    text: "Execute Purge",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const batch = writeBatch(db);

                            // Delete all connected members
                            const membersQ = workerMobile
                                ? query(collection(db, "household_members"), where("houseId", "==", houseId), where("workerId", "==", workerMobile))
                                : query(collection(db, "household_members"), where("houseId", "==", houseId));
                            const membersSnap = await getDocs(membersQ);
                            membersSnap.forEach((d) => batch.delete(d.ref));

                            // Delete all connected visit summaries
                            const visitsQ = workerMobile
                                ? query(collection(db, "household_visits"), where("houseId", "==", houseId), where("workerId", "==", workerMobile))
                                : query(collection(db, "household_visits"), where("houseId", "==", houseId));
                            const visitsSnap = await getDocs(visitsQ);
                            visitsSnap.forEach((d) => batch.delete(d.ref));

                            await batch.commit();
                            await fetchHouseholdData();
                            Alert.alert("Purge Successful", `Household [${houseId}] architecture has been completely wiped.`);
                        } catch (error) {
                            console.error("Delete House Error:", error);
                            Alert.alert("Operation Failed", "Could not purge database batch.");
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

    const makeCall = async (phoneNumber: string) => {
        if (!phoneNumber || phoneNumber.trim().length === 0) {
            Alert.alert("Invalid Routing", "This resident has no telemetric number recorded.");
            return;
        }
        try {
            const url = `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`;
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Unsupported", "Your device hardware cannot initiate calls natively.");
            }
        } catch (e) {
            Alert.alert("Execution Blocked", "Operation denied by OS.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Household Matrix</Text>
            </View>

            <View style={styles.searchSection}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    placeholder="Search explicitly by House ID / Resident Name..."
                    placeholderTextColor="#999"
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={styles.loadText}>Compiling Secure Matrix...</Text>
                </View>
            ) : (
                <SectionList
                    sections={filteredMembers}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }}
                    stickySectionHeadersEnabled={false}
                    ListEmptyComponent={
                        <View style={styles.centerBox}>
                            <Ionicons name="documents-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>Zero records matched your parameters.</Text>
                        </View>
                    }
                    renderSectionHeader={({ section }) => (
                        <View style={styles.houseHeaderContainer}>
                            <TouchableOpacity
                                style={styles.houseHeader}
                                activeOpacity={0.7}
                                onPress={() => router.push({
                                    pathname: "/household-survey",
                                    params: { mobile: workerMobile, houseId: section.houseId }
                                })}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={styles.heroBox}>
                                        <Ionicons name="home" size={18} color="white" />
                                    </View>
                                    <View>
                                        <Text style={styles.houseHeaderText}>Resident Core: {section.houseId}</Text>
                                        <Text style={styles.memberCount}>{section.data.length} Validated / {section.totalInHouse} Expected</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteHouse(section.houseId)} style={styles.deleteHouseButton}>
                                <Ionicons name="trash-bin" size={20} color="#D32F2F" />
                            </TouchableOpacity>
                        </View>
                    )}
                    renderItem={({ item }) => {
                        const chronicList = item.chronicConditions || [];
                        const hasPriorityChronic = chronicList.includes("Diabetes") || chronicList.includes("Hypertension");

                        return (
                            <View style={[styles.card, hasPriorityChronic && styles.chronicCard]}>
                                <TouchableOpacity
                                    style={{ flex: 1, paddingRight: 10 }}
                                    activeOpacity={0.6}
                                    onPress={() =>
                                        router.push({
                                            pathname: "/patient-details",
                                            params: {
                                                ...item,
                                                isPregnant: String(item.isPregnant || false),
                                                isBedridden: String(item.isBedridden || false),
                                                chronicConditions: Array.isArray(item.chronicConditions) ? item.chronicConditions.join(", ") : item.chronicConditions
                                            }
                                        })
                                    }
                                >
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text style={styles.subText}>{item.relationToHead || item.relation} • {item.age} Years Old</Text>

                                    <View style={styles.badgeRow}>
                                        {item.bloodPressure && item.bloodPressure.trim().length > 0 && (
                                            <View style={styles.miniBadge}><Text style={styles.badgeText}>🩺 BP: {item.bloodPressure}</Text></View>
                                        )}
                                        {item.sugarLevel && item.sugarLevel.trim().length > 0 && (
                                            <View style={styles.miniBadge}><Text style={styles.badgeText}>🩸 SGR: {item.sugarLevel}</Text></View>
                                        )}
                                        {item.isPregnant && (
                                            <View style={[styles.miniBadge, { backgroundColor: '#FCE4EC', borderColor: '#F8BBD0' }]}>
                                                <Text style={[styles.badgeText, { color: '#C2185B' }]}>🤰 PREG</Text>
                                            </View>
                                        )}
                                        {hasPriorityChronic && (
                                            <View style={[styles.miniBadge, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}>
                                                <Text style={[styles.badgeText, { color: '#D32F2F' }]}>⚠️ RISKS</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.actionColumn}>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => makeCall(item.mobile || item.phone)}>
                                        <Ionicons name="call" size={18} color="#2E7D32" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDeleteMember(item.id, item.name)}>
                                        <Ionicons name="close" size={18} color="#D32F2F" />
                                    </TouchableOpacity>
                                </View>
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
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 10 },
    searchSection: { flexDirection: 'row', backgroundColor: 'white', margin: 15, borderRadius: 12, alignItems: 'center', paddingHorizontal: 15, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 50, fontSize: 16, color: '#333' },
    centerBox: { alignItems: 'center', marginTop: 100 },
    loadText: { color: '#666', marginTop: 15, fontSize: 16, fontWeight: '500' },
    emptyText: { color: '#999', marginTop: 15, fontSize: 16, fontStyle: 'italic' },
    
    houseHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E0F2F1', borderRadius: 12, marginTop: 15, marginBottom: 10, borderWidth: 1, borderColor: '#B2DFDB' },
    houseHeader: { flex: 1, padding: 12, flexDirection: 'row', alignItems: 'center' },
    heroBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1F7A6B', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    houseHeaderText: { fontWeight: 'bold', color: '#004D40', fontSize: 16 },
    memberCount: { color: '#00695C', fontSize: 12, marginTop: 2 },
    deleteHouseButton: { padding: 15, paddingLeft: 10 },

    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#eee', marginLeft: 15 },
    chronicCard: { borderLeftWidth: 4, borderLeftColor: '#D32F2F', backgroundColor: '#FFFAFA' },
    name: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    subText: { color: '#666', fontSize: 13, marginTop: 4 },
    
    badgeRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', gap: 6 },
    miniBadge: { backgroundColor: '#F0F4F3', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E0EAE8' },
    badgeText: { fontSize: 10, color: '#1F7A6B', fontWeight: 'bold' },

    actionColumn: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }
});