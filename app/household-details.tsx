import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Linking, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

export default function HouseholdDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const houseId = params.houseId as string;
    const workerMobile = String(params.mobile || "").trim();

    const [existingMembers, setExistingMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHousehold = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, "household_members"),
                where("houseId", "==", houseId)
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExistingMembers(list);
        } catch (error) {
            console.error("Error fetching household members:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch all members belonging to this House ID
    useEffect(() => {
        if (houseId) {
            fetchHousehold();
        }
    }, [houseId]);

    const handleDeleteMember = async (memberId: string, name: string) => {
        if (!memberId) {
            Alert.alert("Error", "Cannot delete: Invalid Member ID.");
            return;
        }

        const proceed = Platform.OS === 'web'
            ? window.confirm(`Remove ${name} from this household?`)
            : await new Promise<boolean>(resolve => {
                Alert.alert(
                    "Delete Record",
                    `Are you sure you want to remove ${name} from this household?`,
                    [
                        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                        { text: "Delete", style: "destructive", onPress: () => resolve(true) }
                    ]
                );
            });

        if (!proceed) return;

        try {
            setLoading(true);
            await deleteDoc(doc(db, "household_members", String(memberId)));
            await fetchHousehold();
            if (Platform.OS !== 'web') {
                Alert.alert("Success", `${name} has been removed.`);
            }
        } catch (error) {
            console.error("Delete Member Error:", error);
            Alert.alert("Error", "Could not delete member.");
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
            {/* Header section */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Household Details</Text>
            </View>

            <ScrollView style={{ flex: 1 }}>
                {/* 1. Show the House ID clearly */}
                <View style={styles.houseIdCard}>
                    <Ionicons name="home" size={24} color="#1F7A6B" />
                    <Text style={styles.houseIdText}>House ID: {houseId}</Text>
                </View>

                {/* 2. List of everyone currently living in the house */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Residents ({existingMembers.length})</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 20 }} />
                    ) : existingMembers.length === 0 ? (
                        <Text style={styles.noMembersText}>No members found in this household.</Text>
                    ) : (
                        existingMembers.map((member, index) => {
                            const chronicList = member.chronicConditions || [];
                            const hasPriorityChronic = chronicList.includes("Diabetes") || chronicList.includes("Hypertension");

                            return (
                                <View key={index} style={[styles.card, hasPriorityChronic && styles.chronicCard]}>
                                    <TouchableOpacity
                                        style={{ flex: 1, paddingRight: 10 }}
                                        activeOpacity={0.6}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/patient-details",
                                                params: {
                                                    ...member,
                                                    isPregnant: String(member.isPregnant || false),
                                                    isBedridden: String(member.isBedridden || false),
                                                    chronicConditions: Array.isArray(member.chronicConditions) ? member.chronicConditions.join(", ") : member.chronicConditions
                                                }
                                            })
                                        }
                                    >
                                        <Text style={styles.memberName}>{member.name}</Text>
                                        <Text style={styles.memberSubText}>{member.relationToHead || member.relation || "Member"} • {member.age} Years Old</Text>
                                        
                                        {/* Badges from old code */}
                                        <View style={styles.badgeRow}>
                                            {member.bloodPressure && member.bloodPressure.trim().length > 0 && (
                                                <View style={styles.miniBadge}><Text style={styles.badgeText}>🩺 BP: {member.bloodPressure}</Text></View>
                                            )}
                                            {member.sugarLevel && member.sugarLevel.trim().length > 0 && (
                                                <View style={styles.miniBadge}><Text style={styles.badgeText}>🩸 SGR: {member.sugarLevel}</Text></View>
                                            )}
                                            {member.isPregnant && (
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

                                    {/* Actions from old code */}
                                    <View style={styles.actionColumn}>
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => makeCall(member.mobile || member.phone)}>
                                            <Ionicons name="call" size={18} color="#2E7D32" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDeleteMember(member.id, member.name)}>
                                            <Ionicons name="close" size={18} color="#D32F2F" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* 3. Add Extra Beneficiary Button */}
                <TouchableOpacity
                    style={styles.addMemberBtn}
                    onPress={() => router.push({
                        pathname: "/add-new",
                        params: {
                            houseId: houseId,
                            mobile: workerMobile,
                            mode: "add-extra"
                        }
                    })}
                >
                    <Ionicons name="person-add" size={20} color="#1F7A6B" />
                    <Text style={styles.addMemberText}>+ Add New Member to this House</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    houseIdCard: { backgroundColor: 'white', margin: 20, padding: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    houseIdText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 10 },
    section: { paddingHorizontal: 20 },
    sectionTitle: { marginBottom: 10, color: '#666', fontWeight: 'bold', fontSize: 16 },
    
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#eee' },
    chronicCard: { borderLeftWidth: 4, borderLeftColor: '#D32F2F', backgroundColor: '#FFFAFA' },
    memberName: { fontWeight: 'bold', fontSize: 16, color: '#222' },
    memberSubText: { fontSize: 13, color: '#666', marginTop: 4 },
    
    noMembersText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
    
    badgeRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', gap: 6 },
    miniBadge: { backgroundColor: '#F0F4F3', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E0EAE8' },
    badgeText: { fontSize: 10, color: '#1F7A6B', fontWeight: 'bold' },

    actionColumn: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

    addMemberBtn: { margin: 20, backgroundColor: '#E0F2F1', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#1F7A6B', borderStyle: 'dashed', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    addMemberText: { color: '#1F7A6B', fontWeight: 'bold', marginLeft: 10, fontSize: 16 }
});