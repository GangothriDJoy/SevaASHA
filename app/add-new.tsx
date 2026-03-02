import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import DateTimePicker from '@react-native-community/datetimepicker';

const CHRONIC_OPTIONS = ["Diabetes", "Hypertension", "Thyroid", "Heart Disease"];

export default function AddNew() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        houseNumber: "",
        totalMembers: "",
        members: [] as Array<{
            name: string;
            age: string;
            gender: string;
            relation: string;
            bloodPressure: string;
            sugarLevel: string;
            cholesterol: string;
            chronicConditions: string[];
        }>,
        summary: {
            disabledCount: "0",
            bedriddenCount: "0",
            isPregnant: false,
            lmpDate: new Date().toISOString(),
            isBreastfeeding: false,
            chronicConditions: [] as string[]
        }
    });

    const workerMobile = String(params.mobile || "").trim();
    const workerRole = String(params.role || "ASHA Worker").trim();
    const workerName = String(params.name || "").trim();

    const loadPreviousHouseData = async (houseNo: string) => {
        if (!houseNo || !houseNo.trim()) return;
        setLoading(true);
        try {
            const visitsQuery = query(
                collection(db, "household_visits"),
                where("houseId", "==", houseNo.trim())
            );
            const visitsSnapshot = await getDocs(visitsQuery);
            if (visitsSnapshot.empty) {
                setLoading(false);
                return;
            }
            const sorted = visitsSnapshot.docs.sort((a, b) => {
                const ta = (a.data() as any).createdAt?.toMillis?.() ?? 0;
                const tb = (b.data() as any).createdAt?.toMillis?.() ?? 0;
                return tb - ta;
            });
            const visitDoc = sorted[0].data() as any;
            const previousMembers = Array.isArray(visitDoc.members) ? visitDoc.members : [];
            const previousSummary = visitDoc.summary || {};
            const houseChronic = previousSummary.chronicConditions || [];

            const mappedMembers = previousMembers.map((m: any, index: number) => ({
                name: m.name || "",
                age: m.age || "",
                gender: m.gender || "Female",
                relation: index === 0 ? "Head of House" : (m.relation || m.relationToHead || ""),
                bloodPressure: m.bloodPressure || "",
                sugarLevel: m.sugarLevel || "",
                cholesterol: m.cholesterol || "",
                chronicConditions: Array.isArray(m.chronicConditions) ? m.chronicConditions : (houseChronic.length ? [...houseChronic] : [])
            }));

            setFormData(prev => ({
                ...prev,
                houseNumber: visitDoc.houseId || houseNo,
                totalMembers: String(visitDoc.totalMembers || mappedMembers.length || prev.totalMembers),
                members: mappedMembers.length ? mappedMembers : prev.members,
                summary: {
                    ...prev.summary,
                    disabledCount: String(previousSummary.disabledCount ?? prev.summary.disabledCount),
                    bedriddenCount: String(previousSummary.bedriddenCount ?? prev.summary.bedriddenCount),
                    isPregnant: !!previousSummary.isPregnant,
                    lmpDate: previousSummary.lmpDate || prev.summary.lmpDate,
                    isBreastfeeding: !!previousSummary.isBreastfeeding,
                    chronicConditions: previousSummary.chronicConditions || prev.summary.chronicConditions || []
                }
            }));
            setStep(1.5);
            Alert.alert(
                "Previous Month Loaded",
                "Last saved data pre-filled. Update BP, Sugar, and add any new diseases for members."
            );
        } catch (e) {
            console.error("Error loading previous house data for AddNew", e);
        } finally {
            setLoading(false);
        }
    };

    const checkExistingHouse = async (houseNo: string) => {
        if (!houseNo || !houseNo.trim()) return;
        try {
            const q = query(
                collection(db, "household_visits"),
                where("houseId", "==", houseNo.trim())
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                await loadPreviousHouseData(houseNo);
            }
        } catch (e) {
            console.error("Error checking existing house in AddNew", e);
        }
    };

    useEffect(() => {
        const houseId = String(params.houseId || "").trim();
        if (houseId) {
            setFormData(prev => ({ ...prev, houseNumber: houseId }));
            loadPreviousHouseData(houseId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.houseId]);

    const prepareMembers = () => {
        const count = parseInt(formData.totalMembers);
        if (isNaN(count) || count <= 0) {
            Alert.alert("Invalid", "Please enter a valid number of members.");
            return;
        }
        const updatedMembers = [...formData.members];
        if (updatedMembers.length < count) {
            const additionalNeeded = count - updatedMembers.length;
            const newMembers = Array.from({ length: additionalNeeded }, (_, i) => ({
                name: "", age: "", gender: "Female",
                relation: "",
                bloodPressure: "", sugarLevel: "", cholesterol: "",
                chronicConditions: [] as string[]
            }));
            setFormData({ ...formData, members: [...updatedMembers, ...newMembers] });
        } else if (updatedMembers.length > count) {
            // If they decrease the number, trim the list
            setFormData({ ...formData, members: updatedMembers.slice(0, count) });
        }

        setStep(1.5);
        const initialMembers = Array.from({ length: count }, (_, i) => ({
            name: "", age: "", gender: "Female",
            relation: i === 0 ? "Head of House" : "",
            bloodPressure: "", sugarLevel: "", cholesterol: "",
            chronicConditions: [] as string[]
        }));
        setFormData({ ...formData, members: initialMembers });
        setStep(1.5);
    };

    const updateMember = (index: number, field: string, value: string | string[]) => {
        const updatedMembers = [...formData.members];
        (updatedMembers[index] as any)[field] = value;
        setFormData({ ...formData, members: updatedMembers });
    };

    const toggleMemberChronic = (memberIndex: number, condition: string) => {
        const updatedMembers = [...formData.members];
        const arr = updatedMembers[memberIndex].chronicConditions || [];
        const next = arr.includes(condition) ? arr.filter(c => c !== condition) : [...arr, condition];
        updatedMembers[memberIndex] = { ...updatedMembers[memberIndex], chronicConditions: next };
        setFormData({ ...formData, members: updatedMembers });
    };

    const toggleChronicCondition = (condition: string) => {
        const current = [...formData.summary.chronicConditions];
        const next = current.includes(condition) ? current.filter(c => c !== condition) : [...current, condition];
        setFormData({ ...formData, summary: { ...formData.summary, chronicConditions: next } });
    };

    const handleSave = async () => {
        const incomplete = formData.members.some(m => !m.name || !m.age);
        if (incomplete) {
            Alert.alert("Invalid", "Please fill in all member details (Name, Age).");
            return;
        }
        const hasChronic = formData.members.some(m => (m.chronicConditions || []).length > 0);
        const missingHealth = formData.members.some(m => {
            const chronic = m.chronicConditions || [];
            const needsBpSugar = chronic.includes("Diabetes") || chronic.includes("Hypertension");
            return needsBpSugar && (!m.bloodPressure?.trim() || !m.sugarLevel?.trim());
        });
        if (hasChronic && missingHealth) {
            Alert.alert("Required", "Members with Diabetes/Hypertension must have BP and Sugar filled.");
            return;
        }
        if (formData.summary.isPregnant && !formData.summary.lmpDate) {
            Alert.alert("Required", "LMP Date is required when pregnancy is marked.");
            return;
        }

        setLoading(true);
        try {
            const savePromises = formData.members.map((member) =>
                addDoc(collection(db, "household_members"), {
                    ...member,
                    relationToHead: member.relation,
                    totalMembers: formData.totalMembers,
                    houseId: formData.houseNumber.trim(),
                    workerId: workerMobile,
                    isPregnant: false,
                    isBedridden: false,
                    chronicConditions: member.chronicConditions || formData.summary.chronicConditions,
                    createdAt: serverTimestamp(),
                })
            );
            await Promise.all(savePromises);
            await addDoc(collection(db, "household_visits"), {
                houseId: formData.houseNumber.trim(),
                workerId: workerMobile,
                totalMembers: formData.totalMembers,
                members: formData.members,
                summary: formData.summary,
                createdAt: serverTimestamp(),
            });
            setLoading(false);
            router.replace({
                pathname: "/dashboard",
                params: { mobile: workerMobile, role: workerRole, name: workerName }
            });
        } catch (error) {
            Alert.alert("Error", "Could not save survey.");
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 1 ? setStep(step === 1.5 ? 1 : 1.5) : router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Add New / Monthly Update (Step {step})</Text>
            </View>

            <View style={styles.form}>
                {step === 1 && (
                    <View>
                        <Text style={styles.label}>House Number / ID (Door Number)</Text>
                        <Text style={styles.helperText}>Enter existing House ID and tap outside to load previous month&apos;s data.</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 12/401"
                            value={formData.houseNumber}
                            onChangeText={(val) => setFormData({...formData, houseNumber: val})}
                            onBlur={() => checkExistingHouse(formData.houseNumber)}
                            editable={!loading}
                        />
                        {loading && <ActivityIndicator size="small" color="#1F7A6B" style={{ marginVertical: 8 }} />}

                        <Text style={styles.label}>Total Members in House</Text>
                        <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 5" value={formData.totalMembers} onChangeText={(val) => setFormData({...formData, totalMembers: val})} editable={!loading} />

                        <TouchableOpacity style={styles.submitButton} onPress={prepareMembers} disabled={loading}>
                            <Text style={styles.submitText}>NEXT: MEMBER DETAILS</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 1.5 && (
                    <View>
                        <Text style={styles.sectionTitle}>Individual Member Details</Text>
                        <Text style={styles.helperText}>Update health status (BP, Sugar) for members with chronic conditions. Add new diseases per member if needed.</Text>
                        {formData.members.map((member, index) => {
                            const chronic = member.chronicConditions || [];
                            const hasChronic = chronic.length > 0;
                            return (
                                <View key={index} style={[styles.memberCard, hasChronic && styles.chronicCard]}>
                                    <Text style={styles.memberTitle}>
                                        {index === 0 ? "Head of the House" : `Member ${index + 1}`}
                                        {hasChronic && <Text style={styles.chronicBadge}> • Chronic</Text>}
                                    </Text>
                                    <TextInput style={styles.input} placeholder="Full Name *" value={member.name} onChangeText={(val) => updateMember(index, 'name', val)} />
                                    <TextInput style={styles.input} placeholder="Age *" keyboardType="numeric" value={member.age} onChangeText={(val) => updateMember(index, 'age', val)} />
                                    <TextInput style={styles.input} placeholder="Relation" value={member.relation} editable={index !== 0} onChangeText={(val) => updateMember(index, 'relation', val)} />
                                    <Text style={styles.label}>Blood Pressure (e.g. 120/80)</Text>
                                    <TextInput style={styles.input} placeholder="BP" value={member.bloodPressure} onChangeText={(val) => updateMember(index, 'bloodPressure', val)} />
                                    <Text style={styles.label}>Sugar Level (mg/dL)</Text>
                                    <TextInput style={styles.input} placeholder="Sugar" keyboardType="numeric" value={member.sugarLevel} onChangeText={(val) => updateMember(index, 'sugarLevel', val)} />
                                    <Text style={styles.label}>Chronic Conditions (this member)</Text>
                                    <View style={styles.checklist}>
                                        {CHRONIC_OPTIONS.map((item) => (
                                            <TouchableOpacity
                                                key={item}
                                                style={[styles.checkItem, chronic.includes(item) && styles.activeCheck]}
                                                onPress={() => toggleMemberChronic(index, item)}
                                            >
                                                <Text style={chronic.includes(item) ? { color: 'white' } : {}}>{item}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            );
                        })}
                        <TouchableOpacity style={styles.submitButton} onPress={() => setStep(2)}>
                            <Text style={styles.submitText}>NEXT: HOUSE SUMMARY</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.sectionTitle}>Household Health Summary</Text>
                        <Text style={styles.label}>How many are disabled?</Text>
                        <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={formData.summary.disabledCount} onChangeText={(val) => setFormData({...formData, summary: {...formData.summary, disabledCount: val}})} />

                        <Text style={styles.label}>How many are bedridden?</Text>
                        <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={formData.summary.bedriddenCount} onChangeText={(val) => setFormData({...formData, summary: {...formData.summary, bedriddenCount: val}})} />

                        <TouchableOpacity style={[styles.input, formData.summary.isPregnant && styles.activeToggle]} onPress={() => setFormData({...formData, summary: {...formData.summary, isPregnant: !formData.summary.isPregnant}})}>
                            <Text>Pregnant Women in House? {formData.summary.isPregnant ? "✅ Yes" : "❌ No"}</Text>
                        </TouchableOpacity>

                        {formData.summary.isPregnant && (
                            <View style={styles.datePickerContainer}>
                                <Text style={styles.label}>Select LMP Date (Required)</Text>
                                <DateTimePicker
                                    value={new Date(formData.summary.lmpDate)}
                                    mode="date"
                                    maximumDate={new Date()}
                                    onChange={(event, selectedDate) => {
                                        // ✅ Only update if a date was actually selected (prevents crash on 'Cancel')
                                        if (selectedDate) {
                                            setFormData({
                                                ...formData,
                                                summary: { ...formData.summary, lmpDate: selectedDate.toISOString() }
                                            });
                                        }
                                    }}
                                />
                            </View>
                        )}

                        <TouchableOpacity style={[styles.input, formData.summary.isBreastfeeding && styles.activeToggle]} onPress={() => setFormData({...formData, summary: {...formData.summary, isBreastfeeding: !formData.summary.isBreastfeeding}})}>
                            <Text>Breastfeeding Mothers? {formData.summary.isBreastfeeding ? "✅ Yes" : "❌ No"}</Text>
                        </TouchableOpacity>

                        <Text style={styles.label}>Chronic Conditions (Checklist):</Text>
                        <View style={styles.checklist}>
                            {["Diabetes", "Hypertension", "Thyroid", "Heart Disease"].map(item => (
                                <TouchableOpacity key={item} style={[styles.checkItem, formData.summary.chronicConditions.includes(item) && styles.activeCheck]} onPress={() => toggleChronicCondition(item)}>
                                    <Text style={formData.summary.chronicConditions.includes(item) && {color: 'white'}}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.submitButton} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>FINISH & SAVE SURVEY</Text>}
                        </TouchableOpacity>
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
    chronicCard: { borderWidth: 1.5, borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
    chronicBadge: { color: '#D32F2F', fontSize: 12, fontWeight: '600' },
    helperText: { color: '#666', fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
    submitButton: { backgroundColor: "#1F7A6B", padding: 18, borderRadius: 10, alignItems: "center", marginTop: 10 },
    submitText: { color: "white", fontWeight: "bold", fontSize: 16 }
});