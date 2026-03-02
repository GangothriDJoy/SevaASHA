import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

export default function MyRecords() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // This is the worker's mobile number we sent from the Dashboard
    const workerMobile = params.mobile;

    useEffect(() => {
        if (workerMobile) {
            fetchRecords();
        }
    }, [workerMobile]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, "beneficiaries"),
                where("workerId", "==", workerMobile),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            const list: any[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setBeneficiaries(list);
        } catch (error) {
            console.error("Error fetching records: ", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>My Records</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={beneficiaries}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20 }}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            {/* MAIN CARD AREA: Navigates to Health Entry */}
                            <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={() => router.push({
                                    pathname: "/health-entry",
                                    params: {
                                        patientId: item.id,
                                        patientName: item.fullName
                                    }
                                })}
                            >
                                <View>
                                    <Text style={styles.name}>{item.fullName}</Text>
                                    <Text style={styles.subText}>Mob: {item.mobile}</Text>
                                </View>
                            </TouchableOpacity>

                            {/* ACTION BUTTONS */}
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="fitness-outline" size={24} color="#1F7A6B" style={{ marginRight: 15 }} />

                                <TouchableOpacity onPress={() => router.push({ pathname: "/add-new", params: { editId: item.id } })}>
                                    <Ionicons name="create-outline" size={24} color="#1F7A6B" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 22, fontWeight: "bold", marginLeft: 15 },
    card: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2
    },
    name: { fontSize: 16, fontWeight: 'bold' },
    subText: { color: '#666', fontSize: 12 },
});