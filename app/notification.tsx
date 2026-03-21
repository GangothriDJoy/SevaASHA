import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, orderBy, getDocs, updateDoc, doc, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function NotificationsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();
    const userRole = String(params.role || "").trim(); // For role-based global broadcasts

    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchAllNotifications();
        }, [workerMobile, userRole])
    );

    const fetchAllNotifications = async () => {
        try {
            setLoading(true);
            const compositeFeed: any[] = [];

            // 1. Fetch Central Broadcasts (Global Alerts)
            const alertsQuery = query(collection(db, "alerts"), orderBy("createdAt", "desc"));
            const alertsSnap = await getDocs(alertsQuery);
            alertsSnap.forEach(snapDoc => {
                const data = snapDoc.data();
                // If it's targeted for "All" or matches this worker's precise role
                if (data.target === "All" || data.target === (userRole || "ASHA")) {
                    compositeFeed.push({
                        id: snapDoc.id,
                        isGlobal: true,
                        type: 'broadcast',
                        title: "Central Broadcast",
                        message: data.message,
                        createdAt: data.createdAt,
                        read: true // Global broadcasts don't use individual read receipts
                    });
                }
            });

            // 2. Fetch Personal / System Notifications
            const notifQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
            const notifSnap = await getDocs(notifQuery);
            notifSnap.forEach(snapDoc => {
                const data = snapDoc.data();
                // Filter notifications if they support targeted user IDs or global
                if (!workerMobile || data.target === "All" || data.targetId === workerMobile || data.userId === workerMobile) {
                    compositeFeed.push({
                        id: snapDoc.id,
                        isGlobal: false,
                        type: data.type || "info", // "alert", "success", "info"
                        title: data.title || "Update",
                        message: data.message,
                        createdAt: data.createdAt,
                        read: data.read || false,
                        sender: data.sender || "System"
                    });
                }
            });

            // 3. Fallback to generic fetch if both returned empty and user bypassed with no ID (for generalized preview)
            if (compositeFeed.length === 0 && !workerMobile) {
                const fallbackQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
                const fallbackSnap = await getDocs(fallbackQuery);
                fallbackSnap.forEach(snapDoc => {
                    compositeFeed.push({ id: snapDoc.id, isGlobal: false, ...snapDoc.data() });
                });
            }

            // Sort everything sequentially
            compositeFeed.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });

            setMessages(compositeFeed);
        } catch (e) {
            console.error("Error fetching notifications:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAllNotifications();
    };

    const markAsRead = async (notif: any) => {
        if (notif.isGlobal || notif.read) return;

        try {
            await updateDoc(doc(db, "notifications", notif.id), { read: true });
            
            // Optimistically update local array
            setMessages(prev => 
                prev.map(msg => msg.id === notif.id ? { ...msg, read: true } : msg)
            );
        } catch (e) {
            console.error("Failed to mark as read:", e);
        }
    };

    const getRelativeTime = (timestamp: any) => {
        if (!timestamp) return "Just now";
        const now = new Date();
        const past = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} mins ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${Math.floor(diffHours / 24)} days ago`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 10 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Inbox & Alerts</Text>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={{ marginTop: 10, color: '#666' }}>Fetching secure updates...</Text>
                </View>
            ) : (
                <FlatList
                    data={messages}
                    keyExtractor={(item, index) => `${item.id}_${index}`}
                    contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#1F7A6B"]} />}
                    renderItem={({ item }) => {
                        let iconName = "notifications";
                        let iconColor = "#1F7A6B";
                        
                        if (item.isGlobal || item.type === "broadcast") { iconName = "megaphone"; iconColor = "#E65100"; }
                        else if (item.type === "alert") { iconName = "warning"; iconColor = "#D32F2F"; }
                        else if (item.type === "success") { iconName = "checkmark-circle"; iconColor = "#2E7D32"; }

                        return (
                            <TouchableOpacity 
                                style={[styles.notifCard, !item.read && !item.isGlobal && styles.unreadCard]}
                                activeOpacity={0.7}
                                onPress={() => markAsRead(item)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
                                    <Ionicons name={iconName as any} size={22} color={iconColor} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Text style={[styles.msgTitle, { color: iconColor }]} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.dateText}>{getRelativeTime(item.createdAt)}</Text>
                                    </View>
                                    <Text style={[styles.msgText, !item.read && !item.isGlobal && { fontWeight: 'bold', color: '#111' }]}>
                                        {item.message}
                                    </Text>
                                </View>
                                {!item.read && !item.isGlobal && (
                                    <View style={styles.unreadDot} />
                                )}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No recent updates or alerts.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginLeft: 10 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notifCard: { backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#eee' },
    unreadCard: { backgroundColor: '#E0F2F1', borderColor: '#B2DFDB', elevation: 2 },
    iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    msgTitle: { fontSize: 13, fontWeight: "bold", marginBottom: 4, flex: 1, marginRight: 10 },
    msgText: { fontSize: 14, color: "#444", lineHeight: 20 },
    dateText: { fontSize: 11, color: "#888" },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1F7A6B', marginLeft: 10 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { textAlign: 'center', marginTop: 15, color: '#888', fontSize: 16 }
});
