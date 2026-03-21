import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Linking, Alert } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

export default function HouseholdDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const houseId = String(params.houseId || "").trim();
    const workerMobile = String(params.mobile || "").trim();

    const [existingMembers, setExistingMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            if (houseId) fetchHousehold();
        }, [houseId, workerMobile])
    );

    const fetchHousehold = async () => {
        setLoading(true);
        try {
            // Secure fetch uniquely bridging House ID to the specific Worker ID 
            // preventing global overlap collisions between identical village house numbers.
            const q = workerMobile
                ? query(collection(db, "household_members"), where("houseId", "==", houseId), where("workerId", "==", workerMobile))
                : query(collection(db, "household_members"), where("houseId", "==", houseId));

            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort members so Head of Household / elder members appear at top
            list.sort((a, b) => {
                const ageA = parseInt(a.age) || 0;
                const ageB = parseInt(b.age) || 0;
                return ageB - ageA;
            });

            setExistingMembers(list);
        } catch (error) {
            console.error("Error fetching household members:", error);
            Alert.alert("Execution Blocked", "Failed to retrieve secure household matrix.");
        } finally {
            setLoading(false);
        }
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
                <Text style={styles.headerTitle}>Household Matrix</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <View style={styles.houseIdCard}>
                    <View style={styles.houseIconRing}>
                        <Ionicons name="home" size={26} color="#1F7A6B" />
                    </View>
                    <View>
                        <Text style={styles.houseIdText}>Core: {houseId || "Undefined"}</Text>
                        <Text style={styles.houseIdSub}>Protected Registry Node</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Validated Residents ({existingMembers.length})</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 40 }} />
                    ) : existingMembers.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Ionicons name="folder-open-outline" size={48} color="#ccc" />
                            <Text style={styles.noMembersText}>Zero members assigned to this architecture.</Text>
                        </View>
                    ) : (
                        existingMembers.map((item, index) => {
                            const chronicList = item.chronicConditions || [];
                            const hasPriorityChronic = chronicList.includes("Diabetes") || chronicList.includes("Hypertension");

                            return (
                                <View key={item.id || index} style={[styles.memberCard, hasPriorityChronic && styles.chronicCard]}>
                                    <TouchableOpacity
                                        style={{ flex: 1 }}
                                        activeOpacity={0.6}
                                        onPress={() => router.push({
                                            pathname: "/patient-details",
                                            params: {
                                                ...item,
                                                isPregnant: String(item.isPregnant || false),
                                                isBedridden: String(item.isBedridden || false),
                                                chronicConditions: Array.isArray(item.chronicConditions) ? item.chronicConditions.join(", ") : item.chronicConditions
                                            }
                                        })}
                                    >
                                        <Text style={styles.memberName}>{item.name}</Text>
                                        <Text style={styles.memberSubText}>{item.relationToHead || item.relation || "Resident"} • {item.age} Years Old</Text>
                                        
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

                                    <TouchableOpacity 
                                        style={styles.callActionButton}
                                        onPress={() => makeCall(item.mobile || item.phone)}
                                    >
                                        <Ionicons name="call" size={18} color="#1F7A6B" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </View>

                <TouchableOpacity
                    style={styles.addMemberBtn}
                    activeOpacity={0.7}
                    onPress={() => router.push({
                        pathname: "/add-new",
                        params: {
                            houseId: houseId,
                            mobile: workerMobile,
                            mode: "add-extra"
                        }
                    })}
                >
                    <Ionicons name="person-add" size={20} color="white" />
                    <Text style={styles.addMemberText}>APPEND NEW RESIDENT</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
    
    houseIdCard: { backgroundColor: 'white', margin: 20, padding: 20, borderRadius: 15, flexDirection: 'row', alignItems: 'center', elevation: 3, borderWidth: 1, borderColor: '#eee' },
    houseIconRing: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    houseIdText: { fontSize: 18, fontWeight: 'bold', color: '#004D40' },
    houseIdSub: { color: '#00695C', fontSize: 13, marginTop: 2 },
    
    section: { paddingHorizontal: 20 },
    sectionTitle: { marginBottom: 15, color: '#1F7A6B', fontWeight: 'bold', fontSize: 16 },
    
    memberCard: { backgroundColor: 'white', padding: 18, borderRadius: 12, marginBottom: 12, elevation: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    chronicCard: { borderLeftWidth: 5, borderLeftColor: '#D32F2F', backgroundColor: '#FFFAFA' },
    memberName: { fontWeight: 'bold', fontSize: 16, color: '#222' },
    memberSubText: { fontSize: 13, color: '#666', marginTop: 4 },
    noMembersText: { color: '#999', fontStyle: 'italic', marginTop: 10, fontSize: 15 },
    
    badgeRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap', gap: 6 },
    miniBadge: { backgroundColor: '#F0F4F3', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E0EAE8' },
    badgeText: { fontSize: 10, color: '#1F7A6B', fontWeight: 'bold' },

    callActionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    
    addMemberBtn: { margin: 20, marginTop: 30, backgroundColor: '#2E7D32', padding: 18, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    addMemberText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 15, letterSpacing: 0.5 }
});
