import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router"; //
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function HealthEntry() {
    const router = useRouter();
    const params = useLocalSearchParams(); //

    // Catch the worker's mobile and patient details
    const workerMobile = String(params.mobile || "").trim(); // This is the workerId
    const { patientId, patientName } = params;

    const [loading, setLoading] = useState(false);
    const [weight, setWeight] = useState("");
    const [bp, setBp] = useState("");
    const [hb, setHb] = useState("");
    const [fhr, setFhr] = useState("");

    const handleSave = async () => {
        if (!weight || !bp || !hb) {
            Alert.alert("Missing Info", "Please fill in Weight, BP, and Hemoglobin.");
            return;
        }

        setLoading(true);
        try {
            // Save to a sub-collection so it shows up in Visit Log
            await addDoc(collection(db, "beneficiaries", String(patientId), "vitals"), {
                weight,
                bloodPressure: bp,
                hemoglobin: hb,
                fetalHeartRate: fhr,
                recordedBy: workerMobile, // This ensures the Visit Log can find it!
                recordedAt: serverTimestamp(),
                patientName: patientName // Helpful for displaying in the log
            });

            Alert.alert("Success", "Health vitals updated!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not save health records.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Health Entry</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.patientName}>Recording for: {patientName || "Lakshmi Devi"}</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>Weight (kg)</Text>
                    <TextInput
                        keyboardType="numeric"
                        style={styles.input}
                        placeholder="e.g. 65.5"
                        value={weight}
                        onChangeText={setWeight} //
                    />

                    <Text style={styles.label}>BP (Systolic/Diastolic)</Text>
                    <TextInput
                        placeholder="e.g. 120/80"
                        style={styles.input}
                        value={bp}
                        onChangeText={setBp} //
                    />

                    <Text style={styles.label}>Hemoglobin (g/dL)</Text>
                    <TextInput
                        keyboardType="numeric"
                        style={styles.input}
                        placeholder="e.g. 11.5"
                        value={hb}
                        onChangeText={setHb} //
                    />

                    <Text style={styles.label}>Fetal Heart Rate (bpm)</Text>
                    <TextInput
                        keyboardType="numeric"
                        style={styles.input}
                        placeholder="e.g. 140"
                        value={fhr}
                        onChangeText={setFhr} //
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, loading && {backgroundColor: '#ccc'}]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>SUBMIT RECORDS</Text>}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 15 },
    content: { padding: 20 },
    patientName: { fontSize: 18, marginBottom: 20, color: "#333", fontWeight: "bold" },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 2 },
    label: { fontWeight: "600", color: "#555", marginBottom: 5 },
    input: { borderBottomWidth: 1, borderBottomColor: "#ccc", paddingVertical: 10, fontSize: 16, marginBottom: 25 },
    saveButton: { backgroundColor: "#4CAF50", padding: 18, borderRadius: 10, marginTop: 20, alignItems: "center" },
    saveText: { color: "white", fontWeight: "bold", fontSize: 16 }
});