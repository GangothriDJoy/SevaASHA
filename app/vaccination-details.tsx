import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

export default function VaccinationDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { childId, name, age, type, houseId } = params;

    const [loading, setLoading] = useState(true);
    const [completedVax, setCompletedVax] = useState<string[]>([]);

    const childSchedule = [
        { id: "bcg", name: "BCG", period: "At Birth", minMonths: 0 },
        { id: "opv0", name: "OPV 0", period: "At Birth", minMonths: 0 },
        { id: "hepb0", name: "Hep B-0", period: "At Birth", minMonths: 0 },
        { id: "penta1", name: "Pentavalent 1", period: "6 Weeks", minMonths: 1.5 },
        { id: "penta2", name: "Pentavalent 2", period: "10 Weeks", minMonths: 2.5 },
        { id: "penta3", name: "Pentavalent 3", period: "14 Weeks", minMonths: 3.5 },
        { id: "mr1", name: "Measles/Rubella 1", period: "9 Months", minMonths: 9 },
        { id: "vitA1", name: "Vitamin A (1st dose)", period: "9 Months", minMonths: 9 },
    ];

    const motherSchedule = [
        { id: "tt1", name: "TT-1 (Tetanus)", period: "Early Pregnancy", minMonths: 0 },
        { id: "tt2", name: "TT-2", period: "4 weeks after TT-1", minMonths: 1 },
    ];

    const activeSchedule = type === 'Children' ? childSchedule : motherSchedule;
    const currentAgeMonths = parseFloat(age as string) * 12 || 0;

    useEffect(() => {
        const fetchVaxData = async () => {
            try {
                if (!childId) return;
                const docRef = doc(db, "household_members", String(childId));
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().vaccinations) {
                    setCompletedVax(snap.data().vaccinations);
                }
            } catch (e) {
                console.error("Error fetching vax:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchVaxData();
    }, [childId]);

    const markAsDone = async (vaxId: string, vaxName: string) => {
        try {
            const docRef = doc(db, "household_members", String(childId));
            await updateDoc(docRef, { vaccinations: arrayUnion(vaxId) });
            setCompletedVax(prev => [...prev, vaxId]);
            const msg = `${vaxName} recorded successfully.`;
            Platform.OS === 'web' ? alert(msg) : Alert.alert("Success", msg);
        } catch (e) {
            Alert.alert("Error", "Failed to update record.");
        }
    };

    // FIXED: Summary function that works on Web and Mobile
    const showSummary = () => {
        const total = activeSchedule.length;
        const done = completedVax.length;
        const pending = activeSchedule
            .filter(v => !completedVax.includes(v.id))
            .map(v => v.name)
            .join(", ");

        const summaryText = `Patient: ${name}\nHouse: ${houseId}\nStatus: ${done}/${total} Done\nPending: ${pending || "None"}`;

        if (Platform.OS === 'web') {
            alert(summaryText);
        } else {
            Alert.alert("Immunization Summary", summaryText);
        }
    };

    if (loading) return <ActivityIndicator size="large" color="#1F7A6B" style={{ flex: 1, marginTop: 100 }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Digital Health Card</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Statistics Box */}
                <View style={styles.statCard}>
                    <View>
                        <Text style={styles.statName}>{name}</Text>
                        <Text style={styles.statDetail}>ID: {houseId} • {type === 'Children' ? `Age: ${age}y` : 'Maternal'}</Text>
                    </View>
                    <TouchableOpacity style={styles.miniReportBtn} onPress={showSummary}>
                        <Ionicons name="stats-chart" size={18} color="white" />
                        <Text style={styles.miniReportText}>Report</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Vaccination Checklist</Text>

                {activeSchedule.map((vax) => {
                    const isDone = completedVax.includes(vax.id);
                    const isDue = type === 'Children' ? (currentAgeMonths >= vax.minMonths) : true;

                    return (
                        <View key={vax.id} style={[styles.vaxCard, isDone && styles.doneCard]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.vaxName}>{vax.name}</Text>
                                <Text style={styles.vaxPeriod}>{vax.period}</Text>
                                {!isDone && isDue && <Text style={styles.dueText}>DUE NOW</Text>}
                            </View>

                            {isDone ? (
                                <Ionicons name="checkmark-circle" size={28} color="#2E7D32" />
                            ) : (
                                <TouchableOpacity style={styles.markBtn} onPress={() => markAsDone(vax.id, vax.name)}>
                                    <Text style={styles.markBtnText}>DONE</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginLeft: 15 },
    statCard: { backgroundColor: "white", padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statDetail: { fontSize: 13, color: '#666', marginTop: 4 },
    miniReportBtn: { backgroundColor: '#1F7A6B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
    miniReportText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
    sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 15, color: "#555" },
    vaxCard: { backgroundColor: "white", padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    doneCard: { backgroundColor: "#E8F5E9", borderColor: "#A5D6A7" },
    vaxName: { fontSize: 15, fontWeight: "bold", color: "#333" },
    vaxPeriod: { fontSize: 12, color: "#888" },
    dueText: { color: "#D32F2F", fontWeight: "bold", fontSize: 10, marginTop: 4 },
    markBtn: { backgroundColor: "#1F7A6B", paddingVertical: 6, paddingHorizontal: 15, borderRadius: 6 },
    markBtnText: { color: "white", fontWeight: "bold", fontSize: 11 }
});