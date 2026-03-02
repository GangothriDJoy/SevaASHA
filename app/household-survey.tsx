import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import DateTimePicker from '@react-native-community/datetimepicker';

// 1. Define TypeScript Interfaces
interface Member {
    name: string;
    age: string;
    gender: string;
    relation: string;
    bloodPressure: string;
    sugarLevel: string;
    cholesterol: string;
    status: "General" | "Pregnant" | "Infant" | "Child";
}

interface HouseholdFormData {
    houseNumber: string;
    totalMembers: string;
    members: Member[];
    summary: {
        disabledCount: string;
        bedriddenCount: string;
        isPregnant: boolean;
        lmpDate: string;
        isBreastfeeding: boolean;
        chronicConditions: string[];
    };
}

export default function AddNew() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState<HouseholdFormData>({
        houseNumber: "",
        totalMembers: "",
        members: [],
        summary: {
            disabledCount: "0",
            bedriddenCount: "0",
            isPregnant: false,
            lmpDate: new Date().toISOString(),
            isBreastfeeding: false,
            chronicConditions: []
        }
    });

    const workerMobile = String(params.mobile || "").trim();
    const workerRole = String(params.role || "ASHA Worker").trim();
    const workerName = String(params.name || "").trim();

    const loadPreviousHouseData = async (houseNo: string) => {
        if (!houseNo.trim()) return;
        try {
            const visitsQuery = query(
                collection(db, "household_visits"),
                where("houseId", "==", houseNo.trim()),
                orderBy("createdAt", "desc"),
                limit(1)
            );
            const visitsSnapshot = await getDocs(visitsQuery);

            if (visitsSnapshot.empty) {
                return;
            }

            const visitDoc: any = visitsSnapshot.docs[0].data();
            const previousMembers: Member[] = (visitDoc.members || []) as Member[];
            const previousSummary = visitDoc.summary || {};

            setFormData(prev => ({
                ...prev,
                houseNumber: visitDoc.houseId || houseNo,
                totalMembers: String(visitDoc.totalMembers || previousMembers.length || prev.totalMembers),
                members: previousMembers.length ? previousMembers : prev.members,
                summary: {
                    ...prev.summary,
                    ...previousSummary,
                    lmpDate: previousSummary.lmpDate || prev.summary.lmpDate,
                    chronicConditions: previousSummary.chronicConditions || prev.summary.chronicConditions || []
                }
            }));
            setStep(1.5);
            Alert.alert(
                "Previous Visit Loaded",
                "Last saved household data has been pre-filled. Update only what has changed (BP, Sugar, pregnancy status)."
            );
        } catch (error) {
            console.error("Error loading previous house data", error);
        }
    };

    const checkExistingHouse = async (houseNo: string) => {
        if (!houseNo.trim()) return;
        setLoading(true);
        try {
            const q = query(collection(db, "household_visits"), where("houseId", "==", houseNo.trim()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                await loadPreviousHouseData(houseNo);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // If we came from "View House", auto-load that house's last visit
    useEffect(() => {
        const initialHouseId = String(params.houseId || "").trim();
        if (initialHouseId) {
            setFormData(prev => ({ ...prev, houseNumber: initialHouseId }));
            loadPreviousHouseData(initialHouseId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.houseId]);

    const prepareMembers = () => {
        const count = parseInt(formData.totalMembers);
        if (isNaN(count) || count <= 0) {
            Alert.alert("Invalid", "Please enter a valid number of members.");
            return;
        }
        const initialMembers: Member[] = Array.from({ length: count }, (_, i) => ({
            name: "",
            age: "",
            gender: "Female",
            relation: i === 0 ? "Head of House" : "",
            bloodPressure: "",
            sugarLevel: "",
            cholesterol: "",
            status: "General"
        }));
        setFormData({ ...formData, members: initialMembers });
        setStep(1.5);
    };

    const updateMember = (index: number, field: keyof Member, value: string) => {
        const updatedMembers = [...formData.members];
        (updatedMembers[index] as any)[field] = value;
        setFormData({ ...formData, members: updatedMembers });
    };

    const toggleChronicCondition = (condition: string) => {
        let current = [...formData.summary.chronicConditions];
        if (current.includes(condition)) {
            current = current.filter(c => c !== condition);
        } else {
            current.push(condition);
        }
        setFormData({...formData, summary: {...formData.summary, chronicConditions: current}});
    };

    const getPregnancyMonthLabel = () => {
        if (!formData.summary.isPregnant || !formData.summary.lmpDate) {
            return "";
        }
        const lmp = new Date(formData.summary.lmpDate);
        const now = new Date();
        if (isNaN(lmp.getTime()) || now.getTime() <= lmp.getTime()) {
            return "";
        }
        const diffInMs = now.getTime() - lmp.getTime();
        const weeks = diffInMs / (1000 * 60 * 60 * 24 * 7);
        const month = Math.max(1, Math.floor(weeks / 4));
        return `Current pregnancy month: ${month}`;
    };

// ... inside AddNew component, before handleSaveSurvey

    const goToStepTwo = () => {
        // Check every member in the current list
        for (let i = 0; i < formData.members.length; i++) {
            const m = formData.members[i];
            const label = i === 0 ? "Head of House" : `Member ${i + 1}`;

            // Strict check: No empty strings or just spaces
            if (!m.name.trim() || !m.age.trim() || !m.bloodPressure.trim() || !m.sugarLevel.trim()) {
                Alert.alert(
                    "Incomplete Member Details",
                    `Please fill all mandatory fields (Name, Age, BP, and Sugar) for ${label} before proceeding.`
                );
                return; // 🛑 Stops the user from going to Step 2
            }
        }
        // Only runs if all fields are filled
        setStep(2);
    };


    const handleSaveSurvey = async () => {
        console.log("1. Save Button Clicked");
        // 1. Strict Household Check
        if (!formData.houseNumber || formData.houseNumber.trim().length < 1) {
            Alert.alert("Required", "House Number is mandatory.");
            return; // 🛑 Stops everything here
        }

        // 2. Strict Member Loop
        for (let i = 0; i < formData.members.length; i++) {
            const m = formData.members[i];
            const label = i === 0 ? "Head of House" : `Member ${i + 1}`;

            // This check looks for empty strings OR just spaces
            const isNameMissing = !m.name || m.name.trim() === "";
            const isAgeMissing = !m.age || m.age.trim() === "";
            const isBPMissing = !m.bloodPressure || m.bloodPressure.trim() === "";
            const isSugarMissing = !m.sugarLevel || m.sugarLevel.trim() === "";

            if (isNameMissing || isAgeMissing || isBPMissing || isSugarMissing) {
                Alert.alert(
                    "Incomplete Member Data",
                    `Section for ${label} is missing required health metrics. Please fill Name, Age, BP, and Sugar.`
                );
                setStep(1.5); // 🚀 Forces the app back to the Member Details screen
                setLoading(false);
                return; // 🛑 HARD STOP: Does not reach Firebase
            }
        }

        // 3. Strict Pregnancy Check
        if (formData.summary.isPregnant && (!formData.summary.lmpDate)) {
            Alert.alert("Required", "LMP Date is mandatory for pregnancy tracking.");
            setStep(2);
            return; // 🛑 HARD STOP
        }

        // --- ONLY IF ALL ABOVE PASSES, IT REACHES HERE ---
        setLoading(true);
        try {
            console.log("2. Attempting Firebase Save...");
            console.log("Validation passed. Saving to Firebase...");
            const savePromises = formData.members.map((member) => {
                return addDoc(collection(db, "household_members"), {
                    ...member,
                    relationToHead: member.relation,
                    totalMembers: formData.totalMembers,
                    houseId: formData.houseNumber.trim(),
                    workerId: workerMobile,
                    isPregnant: member.status === "Pregnant",
                    isBedridden: false,
                    chronicConditions: formData.summary.chronicConditions,
                    createdAt: serverTimestamp(),
                });
            });

            await Promise.all(savePromises);

            await addDoc(collection(db, "household_visits"), {
                houseId: formData.houseNumber.trim(),
                workerId: workerMobile,
                totalMembers: formData.totalMembers,
                members: formData.members,
                summary: formData.summary,
                createdAt: serverTimestamp(),
            });
            console.log("3. Firebase Save SUCCESS");
            setLoading(false);
            router.replace({
                pathname: "/dashboard",
                params: { mobile: workerMobile, role: workerRole, name: workerName }
            });
        } catch (error:any) {
            console.error("Firebase Error:", error);
            Alert.alert("Error", "Save failed. Check your internet.\");");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 1 ? setStep(step === 1.5 ? 1 : 1.5) : router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Household Survey (Step {step})</Text>
            </View>

            <View style={styles.form}>
                {step === 1 && (
                    <View>
                        <Text style={styles.label}>House Number / ID *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 12/401"
                            value={formData.houseNumber}
                            onChangeText={(val) => setFormData({...formData, houseNumber: val})}
                            onBlur={() => checkExistingHouse(formData.houseNumber)}
                        />
                        <Text style={styles.label}>Total Members *</Text>
                        <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 5" onChangeText={(val) => setFormData({...formData, totalMembers: val})} />
                        <TouchableOpacity style={styles.submitButton} onPress={prepareMembers}>
                            <Text style={styles.submitText}>NEXT: MEMBER DETAILS</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 1.5 && (
                    <View>
                        <Text style={styles.sectionTitle}>Individual Member Details</Text>
                        {formData.members.map((member, index) => (
                            <View key={index} style={styles.memberCard}>
                                <Text style={styles.memberTitle}>{index === 0 ? "Head of House" : `Member ${index + 1}`} *</Text>
                                <TextInput style={styles.input} placeholder="Full Name *" value={member.name} onChangeText={(val) => updateMember(index, 'name', val)} />
                                <TextInput style={styles.input} placeholder="Age *" keyboardType="numeric" value={member.age} onChangeText={(val) => updateMember(index, 'age', val)} />
                                <TextInput style={styles.input} placeholder="Relation *" value={member.relation} editable={index !== 0} onChangeText={(val) => updateMember(index, 'relation', val)} />

                                <Text style={styles.label}>Health Metrics (Mandatory) *</Text>
                                <TextInput style={styles.input} placeholder="Blood Pressure (e.g. 120/80) *" value={member.bloodPressure} onChangeText={(val) => updateMember(index, 'bloodPressure', val)} />
                                <TextInput style={styles.input} placeholder="Sugar Level (mg/dL) *" keyboardType="numeric" value={member.sugarLevel} onChangeText={(val) => updateMember(index, 'sugarLevel', val)} />
                            </View>
                        ))}
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={goToStepTwo} // ✅ Only call the validation function
                        >
                            <Text style={styles.submitText}>NEXT: HOUSE SUMMARY</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.sectionTitle}>Household Health Summary</Text>
                        <Text style={styles.label}>How many are disabled?</Text>
                        <TextInput style={styles.input} keyboardType="numeric" placeholder="0" onChangeText={(val) => setFormData({...formData, summary: {...formData.summary, disabledCount: val}})} />

                        <TouchableOpacity style={[styles.input, formData.summary.isPregnant && styles.activeToggle]} onPress={() => setFormData({...formData, summary: {...formData.summary, isPregnant: !formData.summary.isPregnant}})}>
                            <Text>Pregnant Women? {formData.summary.isPregnant ? "✅ Yes" : "❌ No"}</Text>
                        </TouchableOpacity>

                        {formData.summary.isPregnant && (
                            <View style={styles.datePickerContainer}>
                                <Text style={styles.label}>Select LMP Date *</Text>
                                <DateTimePicker
                                    value={new Date(formData.summary.lmpDate)}
                                    mode="date"
                                    maximumDate={new Date()}
                                    onChange={(event, date) => { if(date) setFormData({...formData, summary: {...formData.summary, lmpDate: date.toISOString()}})}}
                                />
                                {getPregnancyMonthLabel().length > 0 && (
                                    <Text style={styles.pregnancyMonthLabel}>{getPregnancyMonthLabel()}</Text>
                                )}
                            </View>
                        )}

                        <Text style={styles.label}>Chronic Conditions:</Text>
                        <View style={styles.checklist}>
                            {["Diabetes", "Hypertension", "Thyroid", "Heart Disease"].map(item => (
                                <TouchableOpacity key={item} style={[styles.checkItem, formData.summary.chronicConditions.includes(item) && styles.activeCheck]} onPress={() => toggleChronicCondition(item)}>
                                    <Text style={formData.summary.chronicConditions.includes(item) && {color: 'white'}}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* --- FINAL SAVE AND EXIT BUTTON --- */}
                        <TouchableOpacity style={styles.saveExitButton} onPress={handleSaveSurvey} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> :
                                <View style={styles.buttonContent}>
                                    <Ionicons name="checkmark-circle" size={20} color="white" />
                                    <Text style={styles.saveExitText}> SAVE AND EXIT SURVEY</Text>
                                </View>
                            }
                        </TouchableOpacity>
                        <Text style={styles.helperText}>* All starred fields are required to exit.</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 18, fontWeight: "bold", marginLeft: 15 },
    form: { padding: 20 },
    label: { fontWeight: "bold", marginBottom: 5, color: "#333" },
    input: { backgroundColor: "white", padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: "#ddd", justifyContent: 'center' },
    activeToggle: { borderColor: "#1F7A6B", borderWidth: 2 },
    memberCard: { backgroundColor: "#E0F2F1", padding: 15, borderRadius: 12, marginBottom: 20, borderLeftWidth: 5, borderLeftColor: "#1F7A6B" },
    memberTitle: { fontWeight: 'bold', color: '#1F7A6B', marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F7A6B', marginBottom: 15 },
    datePickerContainer: { backgroundColor: 'white', padding: 10, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#1F7A6B', alignItems: 'center' },
    checklist: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    checkItem: { padding: 10, backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 10, marginBottom: 10 },
    activeCheck: { backgroundColor: '#1F7A6B', borderColor: '#1F7A6B' },
    pregnancyMonthLabel: { marginTop: 8, fontStyle: 'italic', color: '#00695C' },
    submitButton: { backgroundColor: "#1F7A6B", padding: 18, borderRadius: 10, alignItems: "center", marginTop: 10 },
    submitText: { color: "white", fontWeight: "bold", fontSize: 16 },
    saveExitButton: { backgroundColor: "#1F7A6B", padding: 18, borderRadius: 12, alignItems: "center", marginTop: 25, elevation: 4 },
    buttonContent: { flexDirection: 'row', alignItems: 'center' },
    saveExitText: { color: "white", fontWeight: "bold", fontSize: 18 },
    helperText: { textAlign: 'center', color: '#666', fontSize: 12, marginTop: 10, fontStyle: 'italic' }
});