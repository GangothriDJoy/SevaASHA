import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function NotificationsScreen() {
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const params = useLocalSearchParams();
    const { role } = params;
    const userRole = String(role || "All").trim();

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // 1. Fetch system notifications
                const qN = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
                const snapN = await getDocs(qN);
                const notifs = snapN.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((n: any) => n.targetRole === userRole || n.targetRole === "All" || !n.targetRole);

                // 2. Fetch supervisor broadcasts
                const qB = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"));
                const snapB = await getDocs(qB);
                const broadcasts = snapB.docs
                    .map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            title: "Supervisor Broadcast",
                            message: data.message,
                            type: "info",
                            targetRole: data.target,
                            createdAt: data.createdAt
                        };
                    })
                    .filter(b => b.targetRole === userRole || b.targetRole === "All" || !b.targetRole || userRole === "All");

                // 3. Merge and Sort
                const merged = [...notifs, ...broadcasts];
                merged.sort((a, b) => {
                    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                    return tB - tA;
                });

                setMessages(merged);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [userRole]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Government Updates</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20 }}
                    renderItem={({ item }) => (
                        <View style={styles.notifCard}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="megaphone" size={20} color="#1F7A6B" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <Text style={styles.msgText}>{item.message}</Text>
                                <Text style={styles.dateText}>
                                    {item.createdAt?.toDate().toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>No recent updates.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginLeft: 15 },
    notifCard: { backgroundColor: "white", padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E0F2F1", justifyContent: 'center', alignItems: 'center' },
    msgText: { fontSize: 14, color: "#333", fontWeight: "500", lineHeight: 20 },
    dateText: { fontSize: 11, color: "#999", marginTop: 5 },
    empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});