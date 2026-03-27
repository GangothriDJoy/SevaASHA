import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function Attendance() {
    const [children, setChildren] = useState<any[]>([]);
    const [present, setPresent] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    // Generate today's date string (e.g., "2026-03-26")
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];

    useEffect(() => {
        const fetchKidsAndTodayData = async () => {
            try {
                // 1. Fetch all children
                const snap = await getDocs(collection(db, "household_members"));
                const list: any[] = [];

                snap.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    const age = parseInt(data.age || '0', 10);
                    const isMom = data.isPregnant === true || data.isPregnant === "true" || data.isPregnant === "Yes" || data.status === "Pregnant" || data.status === "Postnatal";

                    if (!isNaN(age) && age <= 6 && !isMom) {
                        list.push({ id: docSnap.id, ...data });
                    }
                });
                setChildren(list);

                // 2. Check if attendance was already marked today
                const todayDoc = await getDoc(doc(db, "daily_attendance", dateString));
                if (todayDoc.exists()) {
                    setPresent(todayDoc.data().presentIds || []);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchKidsAndTodayData();
    }, []);

    const togglePresence = (id: string) => {
        if (present.includes(id)) {
            setPresent(present.filter(childId => childId !== id));
        } else {
            setPresent([...present, id]);
        }
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            // Using setDoc with the dateString ensures we update today's record rather than creating duplicates
            await setDoc(doc(db, "daily_attendance", dateString), {
                date: dateString,
                displayDate: today.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
                presentCount: present.length,
                totalEnrolled: children.length,
                presentIds: present,
                timestamp: serverTimestamp()
            });
            Alert.alert("Success", "Today's attendance has been saved to the database!");
            router.back();
        } catch (e) {
            Alert.alert("Error", "Failed to save attendance records.");
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Daily Register</Text>
                </View>
                {/* Button to view past records */}
                <TouchableOpacity onPress={() => router.push("/attendance-records")} style={styles.historyBtn}>
                    <Ionicons name="time-outline" size={20} color="#1976D2" />
                    <Text style={styles.historyText}>Records</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.dateBanner}>
                <Ionicons name="calendar" size={20} color="#1976D2" />
                <Text style={styles.dateText}>Today: {today.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#1976D2" />
            ) : (
                <FlatList 
                    data={children} 
                    keyExtractor={i => i.id} 
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }} 
                    ListEmptyComponent={<Text style={styles.emptyText}>No enrolled children found.</Text>}
                    renderItem={({ item }) => {
                        const isPresent = present.includes(item.id);
                        return (
                            <TouchableOpacity 
                                activeOpacity={0.7}
                                onPress={() => togglePresence(item.id)} 
                                style={[styles.card, isPresent && styles.cardPresent]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.nameText, isPresent && { color: '#1565C0' }]}>{item.name}</Text>
                                    <Text style={styles.subText}>Age: {item.age} yrs</Text>
                                </View>
                                <Ionicons 
                                    name={isPresent ? "checkmark-circle" : "ellipse-outline"} 
                                    size={32} 
                                    color={isPresent ? "#1976D2" : "#CCC"} 
                                />
                            </TouchableOpacity>
                        );
                    }} 
                />
            )}

            <View style={styles.footer}>
                <TouchableOpacity onPress={saveAttendance} style={styles.saveBtn} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.saveBtnText}>SAVE ATTENDANCE ({present.length} Present)</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#1976D2', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { paddingRight: 15 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    historyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    historyText: { color: '#1976D2', fontWeight: 'bold', marginLeft: 4, fontSize: 13 },
    
    dateBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3F2FD', padding: 12, borderBottomWidth: 1, borderBottomColor: '#BBDEFB' },
    dateText: { color: '#1565C0', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
    
    card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 18, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'transparent', elevation: 1 },
    cardPresent: { backgroundColor: '#E3F2FD', borderColor: '#64B5F6' },
    nameText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 13, color: '#666', marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 15 },
    
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderTopColor: '#EEE', elevation: 10 },
    saveBtn: { backgroundColor: '#1976D2', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});