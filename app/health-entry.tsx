import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";

export default function HealthEntry() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Catch the worker's mobile and patient details smoothly
    const workerMobile = String(params.mobile || "").trim();
    const patientId = String(params.patientId || params.id || "").trim(); 
    const patientName = String(params.patientName || params.name || "Unknown Patient").trim();

    const [loading, setLoading] = useState(false);
    const [weight, setWeight] = useState("");
    const [bp, setBp] = useState("");
    const [hb, setHb] = useState("");
    const [fhr, setFhr] = useState("");
    const [sugar, setSugar] = useState("");

    const handleSave = async () => {
        // Enforce basic clinical validations
        if (!weight || !bp || !hb || !sugar) {
            Alert.alert("Missing Diagnostics", "Please fill in Weight, BP, Hemoglobin, and Sugar levels to execute a valid clinical entry.");
            return;
        }

        const bpRegex = /^\d{2,3}\/\d{2,3}$/;
        if (!bpRegex.test(bp)) {
            Alert.alert("Invalid Input", "Blood Pressure must strictly be formatted as Systolic/Diastolic (e.g. 120/80)");
            return;
        }

        if (!patientId) {
            Alert.alert("System Error", "Cannot mount records: Target Patient ID is disconnected from routing state.");
            return;
        }

        setLoading(true);
        try {
            // 1. Save to the deeply nested 'vitals' sub-collection to natively trigger the global collectionGroup("vitals") fetchers
            await addDoc(collection(db, "household_members", patientId, "vitals"), {
                weight: parseFloat(weight) || 0,
                bloodPressure: bp,
                hemoglobin: parseFloat(hb) || 0,
                sugarLevel: parseFloat(sugar) || 0,
                fetalHeartRate: fhr ? parseFloat(fhr) : null, // FHR is optional unless pregnant
                recordedBy: workerMobile,
                workerId: workerMobile, // For safe querying
                recordedAt: serverTimestamp(),
                patientId: patientId,
                patientName: patientName
            });

            // 2. Synchronize the overarching Household Profile so directory lists immediately show updated BP/Sugar
            const memberRef = doc(db, "household_members", patientId);
            await setDoc(memberRef, {
                bloodPressure: bp,
                sugarLevel: sugar,
                hemoglobin: hb,
                lastPushedVitals: serverTimestamp()
            }, { merge: true }); // Securely merge avoiding profile wipes

            Alert.alert(
                "Telemetry Secured", 
                "Health vitals synchronized with global cloud. Your backend logging ledger and monthly incentive tracker have instantly updated.",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error) {
            console.error("Vitals Persistence Error:", error);
            Alert.alert("Network Operation Failed", "Could not synchronize telemetry records. Check connectivity.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Clinical Vitals Entry</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.profileBanner}>
                    <View style={styles.iconRing}>
                        <Ionicons name="fitness" size={28} color="#1F7A6B" />
                    </View>
                    <View>
                        <Text style={styles.patientName}>{patientName}</Text>
                        <Text style={styles.patientId}>ID: {patientId || "Unknown"}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardHeader}>Core Diagnostics</Text>

                    <Text style={styles.label}>Weight (kg) *</Text>
                    <TextInput
                        keyboardType="decimal-pad"
                        style={styles.input}
                        placeholder="Ex: 65.5"
                        placeholderTextColor="#999"
                        value={weight}
                        onChangeText={setWeight}
                    />

                    <Text style={styles.label}>Blood Pressure (Systolic/Diastolic) *</Text>
                    <TextInput
                        placeholder="Ex: 120/80"
                        placeholderTextColor="#999"
                        style={styles.input}
                        value={bp}
                        onChangeText={setBp}
                    />

                    <Text style={styles.label}>Random Blood Sugar / RBS (mg/dL) *</Text>
                    <TextInput
                        keyboardType="decimal-pad"
                        style={styles.input}
                        placeholder="Ex: 110"
                        placeholderTextColor="#999"
                        value={sugar}
                        onChangeText={setSugar}
                    />

                    <Text style={styles.label}>Hemoglobin (g/dL) *</Text>
                    <TextInput
                        keyboardType="decimal-pad"
                        style={styles.input}
                        placeholder="Ex: 11.5"
                        placeholderTextColor="#999"
                        value={hb}
                        onChangeText={setHb}
                    />

                    <View style={styles.divider} />

                    <Text style={styles.cardHeader}>Maternal Tracking (If Applicable)</Text>
                    <Text style={styles.label}>Fetal Heart Rate (bpm)</Text>
                    <TextInput
                        keyboardType="decimal-pad"
                        style={styles.input}
                        placeholder="Ex: 140"
                        placeholderTextColor="#999"
                        value={fhr}
                        onChangeText={setFhr}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, loading && {backgroundColor: '#81C784'}]}
                    activeOpacity={0.8}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="cloud-upload" size={22} color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.saveText}>ENCRYPT TRANSACTIONS</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <Text style={styles.helperText}>* Marks mandatory telemetry fields required for ASHA incentives.</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 10 },
    content: { padding: 20, paddingBottom: 40 },
    
    profileBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#B2DFDB' },
    iconRing: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2 },
    patientName: { fontSize: 18, color: "#004D40", fontWeight: "bold" },
    patientId: { fontSize: 13, color: "#00695C", marginTop: 2 },
    
    card: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#eee' },
    cardHeader: { fontSize: 18, fontWeight: 'bold', color: '#1F7A6B', marginBottom: 15 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
    
    label: { fontWeight: "bold", color: "#444", marginBottom: 8, fontSize: 14 },
    input: { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#ddd", padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 20, color: '#333' },
    
    saveButton: { backgroundColor: "#2E7D32", padding: 20, borderRadius: 12, marginTop: 25, alignItems: "center", elevation: 4 },
    saveText: { color: "white", fontWeight: "bold", fontSize: 16, letterSpacing: 0.5 },
    helperText: { textAlign: 'center', color: '#888', fontSize: 13, marginTop: 15, fontStyle: 'italic' }
});
