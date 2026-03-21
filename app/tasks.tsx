import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function TasksScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [priorityList, setPriorityList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            if (workerMobile) {
                fetchPriorityTasks();
            } else {
                fetchPriorityTasks(); // Generic fetch if no mobile provided strictly
            }
        }, [workerMobile])
    );

    const fetchPriorityTasks = async () => {
        setLoading(true);
        try {
            const taskData: any[] = [];
            const today = new Date().toISOString();

            // 1. Fetch pending vaccines globally
            const vcxQuery = query(collection(db, "vaccine_cards"), where("status", "==", "Pending"));
            const vcxSnap = await getDocs(vcxQuery);
            const pendingVaxMap: Record<string, any[]> = {};
            vcxSnap.forEach(doc => {
                const data = doc.data();
                if (!pendingVaxMap[data.childId]) pendingVaxMap[data.childId] = [];
                pendingVaxMap[data.childId].push(data);
            });

            // 2. Fetch assigned beneficiaries
            const membersQuery = workerMobile 
                ? query(collection(db, "household_members"), where("workerId", "==", workerMobile))
                : query(collection(db, "household_members"));
                
            const usersQuery = query(collection(db, "users"), where("role", "==", "Mother"));

            const hmSnap = await getDocs(membersQuery);
            const usersSnap = await getDocs(usersQuery);

            const processMember = (doc: any) => {
                const data = doc.data();
                if (workerMobile && data.workerId !== workerMobile && data.ashaId !== workerMobile) return;

                const isPregnant = data.isPregnant === true || data.pregnancyStatus === "Pregnant" || data.category === "Pregnant";
                const ageNum = parseInt(data.age);
                const isChild = data.isChild === true || data.category === "Child" || (!isNaN(ageNum) && ageNum <= 5);
                const isHighRisk = data.healthStatus === "High Risk" || data.status === "High Risk" || data.isHighRisk === true;

                // Task 1: High Risk Status
                if (isHighRisk) {
                    taskData.push({
                        id: `${doc.id}_highrisk`,
                        userId: doc.id,
                        name: data.name || "Unknown Patient",
                        houseId: data.houseId || "N/A",
                        title: "HIGH RISK PATIENT FOLLOW-UP",
                        urgency: 'critical',
                        icon: 'warning',
                        color: '#D32F2F',
                        type: 'HighRisk',
                        targetUrl: "/high-risk-detail",
                        passthrough: { id: doc.id, workerMobile: workerMobile }
                    });
                }

                // Task 2: Immunizations Due
                if (isChild) {
                    const pendingVax = pendingVaxMap[doc.id] || [];
                    if (pendingVax.length > 0) {
                        pendingVax.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
                        const nextVax = pendingVax[0];
                        
                        taskData.push({
                            id: `${doc.id}_vax`,
                            userId: doc.id,
                            name: data.name || "Child",
                            houseId: data.houseId || "N/A",
                            title: `Vaccine Due: ${nextVax.vaccineName}`,
                            urgency: nextVax.dueDate < today ? 'critical' : 'warning',
                            icon: 'medkit',
                            color: nextVax.dueDate < today ? '#D32F2F' : '#F57C00',
                            type: 'Vaccine',
                            targetUrl: "/vaccine-card",
                            passthrough: { childId: doc.id, childName: data.name, readOnly: 'false' }
                        });
                    }
                }

                // Task 3: ANC Checkups for Pregnant Women
                if (isPregnant) {
                    taskData.push({
                        id: `${doc.id}_anc`,
                        userId: doc.id,
                        name: data.name || "Mother",
                        houseId: data.houseId || "N/A",
                        title: "ANC Checkup Due",
                        urgency: 'warning',
                        icon: 'woman',
                        color: '#1F7A6B',
                        type: 'ANC',
                        targetUrl: "/patient-details",
                        passthrough: { userId: doc.id, workerMobile: workerMobile }
                    });
                }
            };

            hmSnap.forEach(processMember);
            usersSnap.forEach(processMember);

            // Deduplicate Tasks
            const uniqueTasks = Array.from(new Map(taskData.map(item => [item.id, item])).values());

            // Sort critical to top
            uniqueTasks.sort((a, b) => {
                const scoreA = a.urgency === 'critical' ? 2 : 1;
                const scoreB = b.urgency === 'critical' ? 2 : 1;
                return scoreB - scoreA;
            });

            setPriorityList(uniqueTasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Priority Field Tasks</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={styles.loadingText}>Analyzing Priority Queue...</Text>
                </View>
            ) : (
                <FlatList
                    data={priorityList}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.taskCard, item.urgency === 'critical' && styles.criticalCard]}
                            onPress={() => router.push({ pathname: item.targetUrl, params: item.passthrough })}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
                                <Ionicons name={item.icon || "calendar"} size={26} color={item.color} />
                            </View>
                            <View style={{flex: 1, marginLeft: 15}}>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.houseId}>House ID: {item.houseId}</Text>
                                <Text style={[styles.subText, { color: item.color }]}>{item.title}</Text>
                                {item.urgency === 'critical' && (
                                    <View style={styles.urgentBadge}>
                                        <Text style={styles.urgentText}>ACTION REQUIRED</Text>
                                    </View>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="checkmark-done-circle" size={64} color="#4CAF50" />
                            <Text style={styles.emptyText}>All caught up! No priority tasks due.</Text>
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
    headerTitle: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 10 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#666', marginTop: 15, fontSize: 16 },
    taskCard: { backgroundColor: "white", marginBottom: 15, padding: 18, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#eee' },
    criticalCard: { borderColor: '#FFCDD2', borderWidth: 2, backgroundColor: '#FFFAFA' },
    iconCircle: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: 17, fontWeight: "bold", color: '#333' },
    subText: { fontSize: 14, fontWeight: "bold", marginTop: 4 },
    houseId: { color: "#888", fontSize: 13, marginTop: 2 },
    urgentBadge: { backgroundColor: '#FFEBEE', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: '#FFCDD2' },
    urgentText: { color: '#D32F2F', fontSize: 10, fontWeight: 'bold' },
    empty: { alignItems: 'center', marginTop: 120 },
    emptyText: { textAlign: 'center', marginTop: 15, color: '#666', fontSize: 16 }
});
