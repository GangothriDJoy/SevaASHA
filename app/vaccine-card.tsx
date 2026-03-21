import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { IMMUNIZATION_SCHEDULE } from '@/constants/immunizationSchedule';

export default function VaccineCard() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const childId = String(params.childId || "");
    const childName = String(params.childName || "Child");
    const dob = String(params.dob || "--");
    const isReadOnly = params.readOnly === 'true';

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [vaccines, setVaccines] = useState<any[]>([]);

    const fetchVaccines = async () => {
        if (!childId) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, "vaccine_cards"),
                where("childId", "==", childId)
            );
            const snapshot = await getDocs(q);
            const list: any[] = [];
            snapshot.forEach(doc => {
                list.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort by due date natively since we might not have a composite index for where+orderBy
            list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            
            setVaccines(list);
        } catch (error) {
            console.error("Error fetching vaccine card:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVaccines();
    }, [childId]);

    const handleGenerateCard = async () => {
        let parsedDate = new Date(dob);
        if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date(); // Fallback if DOB is invalid
        }

        setGenerating(true);
        try {
            const batchPromises = IMMUNIZATION_SCHEDULE.map(vax => {
                const due = new Date(parsedDate.getTime() + vax.dueDays * 24 * 60 * 60 * 1000);
                return addDoc(collection(db, 'vaccine_cards'), {
                    childId: childId,
                    childName: childName,
                    vaccineId: vax.id,
                    vaccineName: vax.name,
                    dueDate: due.toISOString(),
                    status: "Pending",
                    dateGiven: null
                });
            });

            await Promise.all(batchPromises);
            
            if (Platform.OS === 'web') window.alert("Cards Generated Successfully!");
            else Alert.alert("Success", "Digital Vaccine Tracker initialized!");
            
            fetchVaccines(); // Refresh the list to show newly generated cards
        } catch (error) {
            console.error("Error generating cards:", error);
            if (Platform.OS !== 'web') Alert.alert("Error", "Could not generate vaccine cards.");
        } finally {
            setGenerating(false);
        }
    };

    const markAsGiven = async (docId: string, vaccineName: string) => {
        try {
            await updateDoc(doc(db, "vaccine_cards", docId), {
                status: "Completed",
                dateGiven: serverTimestamp()
            });
            
            // Optimistic UI update
            setVaccines(prev => prev.map(v => 
                v.id === docId ? { ...v, status: "Completed", dateGiven: new Date() } : v
            ));

            if (Platform.OS === 'web') {
                window.alert(`${vaccineName} marked as given.`);
            }
        } catch (error) {
            console.error("Error updating vaccine:", error);
            if (Platform.OS !== 'web') Alert.alert("Error", "Could not update vaccine status.");
        }
    };

    const renderVaccine = ({ item }: { item: any }) => {
        const isCompleted = item.status === "Completed";
        const dueDate = new Date(item.dueDate);
        const today = new Date();
        const isOverdue = !isCompleted && dueDate < today;
        const isDueSoon = !isCompleted && !isOverdue && (dueDate.getTime() - today.getTime()) < (7 * 24 * 60 * 60 * 1000); // within 7 days

        let statusColor = "#666";
        let statusText = "Upcoming";
        let iconName: any = "time-outline";

        if (isCompleted) {
            statusColor = "#2E7D32"; // Green
            statusText = "Completed";
            iconName = "checkmark-circle";
        } else if (isOverdue) {
            statusColor = "#D32F2F"; // Red
            statusText = "Overdue";
            iconName = "alert-circle";
        } else if (isDueSoon) {
            statusColor = "#F57C00"; // Orange
            statusText = "Due Soon";
            iconName = "warning";
        }

        return (
            <View style={[styles.vaxCard, isOverdue && styles.vaxOverdueCard]}>
                <View style={styles.vaxHeader}>
                    <View>
                        <Text style={styles.vaxName}>{item.vaccineName}</Text>
                        <Text style={styles.dueDateText}>Due: {dueDate.toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                        <Ionicons name={iconName} size={14} color={statusColor} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                </View>

                {!isCompleted && (
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: isOverdue ? '#D32F2F' : '#1976D2' }]}
                        onPress={() => {
                            if (Platform.OS === 'web') {
                                if (window.confirm(`Mark ${item.vaccineName} as given today?`)) markAsGiven(item.id, item.vaccineName);
                            } else {
                                Alert.alert("Confirm Vaccination", `Mark ${item.vaccineName} as given today?`, [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Confirm", onPress: () => markAsGiven(item.id, item.vaccineName) }
                                ]);
                            }
                        }}
                    >
                        <Ionicons name="medical" size={16} color="white" />
                        <Text style={styles.actionBtnText}>Mark as Given Today</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Digital Vaccine Card</Text>
                    <Text style={styles.headerSubtitle}>{childName} (DOB: {dob})</Text>
                </View>
            </View>

            {!isReadOnly && (
                <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#1F7A6B', marginHorizontal: 15, marginBottom: 15 }]}
                    onPress={() => router.push({ pathname: "/health-entry", params: { memberId: childId, name: childName } })}
                >
                    <Ionicons name="add-circle" size={20} color="white" />
                    <Text style={[styles.actionBtnText, {marginLeft: 8}]}>Add General Health Record</Text>
                </TouchableOpacity>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={vaccines}
                    keyExtractor={item => item.id}
                    renderItem={renderVaccine}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text" size={48} color="#CCC" />
                            <Text style={styles.emptyText}>No digital vaccine card found.</Text>
                            <Text style={styles.emptySubtext}>This child might have been registered before the digital card rollout.</Text>
                            
                            {!isReadOnly && (
                                <TouchableOpacity 
                                    style={[styles.actionBtn, { backgroundColor: '#1976D2', marginTop: 25, paddingHorizontal: 20 }]}
                                    onPress={handleGenerateCard}
                                    disabled={generating}
                                >
                                    {generating ? <ActivityIndicator color="white" /> : (
                                        <>
                                            <Ionicons name="flash" size={18} color="white" />
                                            <Text style={styles.actionBtnText}>Generate Digital Tracker</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7FB' },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1976D2', padding: 20, paddingTop: Platform.OS === 'ios' ? 40 : 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    headerSubtitle: { fontSize: 13, color: '#E3F2FD', marginTop: 2 },
    listContent: { padding: 15, paddingBottom: 40 },
    vaxCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
    vaxOverdueCard: { borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFFAFA' },
    vaxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    vaxName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    dueDateText: { fontSize: 13, color: '#666', marginTop: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    actionBtn: { flexDirection: 'row', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
    actionBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 15 },
    emptySubtext: { fontSize: 14, color: '#999', marginTop: 5, textAlign: 'center', paddingHorizontal: 20 }
});
