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
    mobile: string;
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

export default function HouseholdSurvey() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [showDatePicker, setShowDatePicker] = useState(false);

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

            if (visitsSnapshot.empty) return;

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
                "Previous Record Found",
                "Last saved household data has been securely loaded. Please update only what has changed during this visit."
            );
        } catch (error) {
            console.error("Error loading past house data", error);
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

    useEffect(() => {
        const initialHouseId = String(params.houseId || "").trim();
        if (initialHouseId) {
            setFormData(prev => ({ ...prev, houseNumber: initialHouseId }));
            loadPreviousHouseData(initialHouseId);
        }
    }, [params.houseId]);

    const prepareMembers = () => {
        const count = parseInt(formData.totalMembers);
        if (isNaN(count) || count <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid number of members.");
            return;
        }
        const currentMembers = [...formData.members];
        let updatedMembersList: Member[] = [];
        if (count > currentMembers.length) {
            const additionalNeeded = count - currentMembers.length;
            const newSlots = Array.from({ length: additionalNeeded }, (_, i) => ({
                name: "",
                age: "",
                mobile: "",
                gender: "",
                relation: i === 0 && currentMembers.length === 0 ? "Head of House" : "",
                bloodPressure: "",
                sugarLevel: "",
                cholesterol: "",
                status: "General" as "General"
            }));
            updatedMembersList = [...currentMembers, ...newSlots];
        } else {
            updatedMembersList = currentMembers.slice(0, count);
        }
        setFormData({ ...formData, members: updatedMembersList });
        setStep(1.5);
    };

    const updateMember = (index: number, field: keyof Member, value: string) => {
        const updatedMembers = [...formData.members];
        if (field === 'mobile') value = value.replace(/[^0-9]/g, '');
        (updatedMembers[index] as any)[field] = value;
        
        // Auto-flag pregnancy category natively if they're females of potential age or specifically declared
        if (field === 'gender' || field === 'age') {
            const pAge = parseInt(updatedMembers[index].age);
            const pGen = updatedMembers[index].gender.toLowerCase();
            if (pGen.startsWith('f') && pAge > 12 && pAge < 50) {
                // Keep general track, specific toggle at Step 2 explicitly asserts it
            }
        }
        setFormData({ ...formData, members: updatedMembers });
    };

    const toggleChronicCondition = (condition: string) => {
        let current = [...formData.summary.chronicConditions];
        if (current.includes(condition)) {
            current = current.filter(c => c !== condition);
        } else {
            current.push(condition);
        }
        setFormData({ ...formData, summary: { ...formData.summary, chronicConditions: current } });
    };

    const getPregnancyMonthLabel = () => {
        if (!formData.summary.isPregnant || !formData.summary.lmpDate) return "";
        const lmp = new Date(formData.summary.lmpDate);
        const now = new Date();
        if (isNaN(lmp.getTime()) || now.getTime() <= lmp.getTime()) return "";
        const weeks = (now.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24 * 7);
        return `Current Approx Month: ${Math.max(1, Math.floor(weeks / 4.3))}`;
    };

    const removeMemberSlot = (index: number) => {
        const updatedMembers = formData.members.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            members: updatedMembers,
            totalMembers: String(updatedMembers.length)
        }));
    };

    const goToStepTwo = () => {
        for (let i = 0; i < formData.members.length; i++) {
            const m = formData.members[i];
            const label = i === 0 ? "Head of House" : `Member ${i + 1}`;
            if (!m.name.trim() || !m.age.trim() || !m.gender.trim() || !m.bloodPressure.trim() || !m.sugarLevel.trim()) {
                Alert.alert(
                    "Incomplete Profile",
                    `Required metrics (Name, Age, Gender, BP, Sugar) missing for ${label}. Please fill before generating summary.`
                );
                return;
            }
        }
        setStep(2);
    };

    const handleSaveSurvey = async () => {
        if (!formData.houseNumber || formData.houseNumber.trim().length < 1) {
            Alert.alert("Missing ID", "House ID / Number is mandatory.");
            return;
        }

        if (formData.summary.isPregnant && (!formData.summary.lmpDate)) {
            Alert.alert("Required", "LMP Date is legally mandated for pregnancy routing entries.");
            return;
        }

        setLoading(true);
        try {
            // Write distinct entries for global analytical cross-referencing
            const savePromises = formData.members.map((member) => {
                const isPregnantMember = formData.summary.isPregnant && (member.gender.toLowerCase().startsWith('f'));
                return addDoc(collection(db, "household_members"), {
                    ...member,
                    relationToHead: member.relation,
                    totalMembers: formData.totalMembers,
                    houseId: formData.houseNumber.trim(),
                    workerId: workerMobile,
                    isPregnant: isPregnantMember,
                    isBedridden: parseInt(formData.summary.bedriddenCount) > 0,
                    chronicConditions: formData.summary.chronicConditions,
                    createdAt: serverTimestamp(),
                });
            });

            await Promise.all(savePromises);

            // Save the raw visit summary wrapper securely
            await addDoc(collection(db, "household_visits"), {
                houseId: formData.houseNumber.trim(),
                workerId: workerMobile,
                totalMembers: formData.totalMembers,
                members: formData.members,
                summary: formData.summary,
                createdAt: serverTimestamp(),
            });
            
            Alert.alert("Visit Archived", "Household ledger securely synchronized to the central cloud.");
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/");
            }
        } catch (error) {
            console.error("Save Verification Error:", error);
            Alert.alert("Sync Blocked", "Failed to finalize database injection. Ensure active internet connectivity.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 1 ? setStep(step === 1.5 ? 1 : 1.5) : router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Household Survey</Text>
            </View>

            <View style={styles.stepperBox}>
                <Text style={styles.stepperText}>Step {step === 1.5 ? "2" : (step === 2 ? "3" : "1")} of 3</Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: step === 1 ? '33%' : (step === 1.5 ? '66%' : '100%') }]} />
                </View>
            </View>

            <View style={styles.form}>
                {step === 1 && (
                    <View>
                        <View style={styles.instructionBanner}>
                            <Ionicons name="information-circle" size={24} color="#00695C" />
                            <Text style={styles.instructionText}>Enter House ID to instantly pull last known census data.</Text>
                        </View>
                        <Text style={styles.label}>House ID / Address Code *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 12/401"
                            placeholderTextColor="#999"
                            value={formData.houseNumber}
                            onChangeText={(val) => setFormData({ ...formData, houseNumber: val })}
                            onBlur={() => checkExistingHouse(formData.houseNumber)}
                        />
                        <Text style={styles.label}>Current Resident Count *</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric" 
                            placeholder="Ex: 5" 
                            placeholderTextColor="#999"
                            value={formData.totalMembers} 
                            onChangeText={(val) => setFormData({ ...formData, totalMembers: val })} 
                        />
                        <TouchableOpacity style={[styles.submitButton, loading && { opacity: 0.7 }]} onPress={prepareMembers} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>NEXT: MEMBER VITALS</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {step === 1.5 && (
                    <View>
                        <Text style={styles.sectionTitle}>Individual Health Metrics</Text>
                        {formData.members.map((member, index) => (
                            <View key={index} style={styles.memberCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="person-circle" size={24} color="#1F7A6B" style={{ marginRight: 8 }}/>
                                        <Text style={styles.memberTitle}>{index === 0 ? "Head of Household" : `Resident #${index + 1}`}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeMemberSlot(index)}>
                                        <Ionicons name="close-circle" size={24} color="#D32F2F" />
                                    </TouchableOpacity>
                                </View>

                                <TextInput style={styles.input} placeholder="Full Legal Name *" placeholderTextColor="#888" value={member.name} onChangeText={(val) => updateMember(index, 'name', val)} />
                                
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="Age *" placeholderTextColor="#888" keyboardType="numeric" value={member.age} onChangeText={(val) => updateMember(index, 'age', val)} />
                                    <TextInput style={[styles.input, { flex: 1.2 }]} placeholder="Gender (M/F/O) *" placeholderTextColor="#888" value={member.gender} onChangeText={(val) => updateMember(index, 'gender', val)} />
                                </View>

                                <TextInput style={styles.input} placeholder="Relation to Head *" placeholderTextColor="#888" value={member.relation} editable={index !== 0} onChangeText={(val) => updateMember(index, 'relation', val)} />
                                <TextInput style={styles.input} placeholder="Mobile Number" placeholderTextColor="#888" keyboardType="phone-pad" maxLength={10} value={member.mobile || ""} onChangeText={(val) => updateMember(index, 'mobile', val)} />
                                
                                <View style={styles.divider} />
                                <Text style={styles.labelSm}>Live Clinical Readings *</Text>
                                
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                                    <View style={{ flex: 1 }}>
                                        <TextInput style={styles.input} placeholder="BP (120/80)" placeholderTextColor="#888" value={member.bloodPressure} onChangeText={(val) => updateMember(index, 'bloodPressure', val)} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <TextInput style={styles.input} placeholder="Sugar (mg/dL)" placeholderTextColor="#888" keyboardType="numeric" value={member.sugarLevel} onChangeText={(val) => updateMember(index, 'sugarLevel', val)} />
                                    </View>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.submitButton} onPress={goToStepTwo}>
                            <Text style={styles.submitText}>NEXT: AGGREGATE SUMMARY</Text>
                        </TouchableOpacity>
                        <Text style={styles.helperText}>* Required parameters to ensure valid profiling.</Text>
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.sectionTitle}>Advanced Diagnostics Survey</Text>
                        
                        <View style={styles.cardBlock}>
                            <Text style={styles.label}>Are there physically disabled residents?</Text>
                            <TextInput style={styles.inputDark} keyboardType="numeric" placeholder="0" value={formData.summary.disabledCount} onChangeText={(val) => setFormData({ ...formData, summary: { ...formData.summary, disabledCount: val } })} />

                            <Text style={styles.label}>Are there bedridden terminal residents?</Text>
                            <TextInput style={styles.inputDark} keyboardType="numeric" placeholder="0" value={formData.summary.bedriddenCount} onChangeText={(val) => setFormData({ ...formData, summary: { ...formData.summary, bedriddenCount: val } })} />
                        </View>

                        <Text style={styles.label}>Are there active pregnancies detected?</Text>
                        <TouchableOpacity style={[styles.toggleBtn, formData.summary.isPregnant && styles.activeToggle]} onPress={() => setFormData({ ...formData, summary: { ...formData.summary, isPregnant: !formData.summary.isPregnant } })}>
                            <Text style={[styles.toggleText, formData.summary.isPregnant && { color: "white" }]}>
                                {formData.summary.isPregnant ? "✅ Confirmed Pregnant Match" : "❌ No Active Pregnancies"}
                            </Text>
                        </TouchableOpacity>

                        {formData.summary.isPregnant && (
                            <View style={styles.datePickerContainer}>
                                <Text style={styles.label}>Last Menstrual Period (LMP) Origin *</Text>
                                
                                {Platform.OS === 'android' ? (
                                    <>
                                        <TouchableOpacity style={styles.androidDateBtn} onPress={() => setShowDatePicker(true)}>
                                            <Ionicons name="calendar" size={20} color="#1F7A6B" />
                                            <Text style={{ marginLeft: 10, fontSize: 16 }}>{new Date(formData.summary.lmpDate).toLocaleDateString()}</Text>
                                        </TouchableOpacity>
                                        {showDatePicker && (
                                            <DateTimePicker
                                                value={new Date(formData.summary.lmpDate)}
                                                mode="date"
                                                maximumDate={new Date()}
                                                onChange={(event, date) => { 
                                                    setShowDatePicker(false);
                                                    if (date) setFormData({ ...formData, summary: { ...formData.summary, lmpDate: date.toISOString() } });
                                                }}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <DateTimePicker
                                        value={new Date(formData.summary.lmpDate)}
                                        mode="date"
                                        display="spinner"
                                        maximumDate={new Date()}
                                        onChange={(event, date) => { if (date) setFormData({ ...formData, summary: { ...formData.summary, lmpDate: date.toISOString() } }) }}
                                    />
                                )}

                                {getPregnancyMonthLabel().length > 0 && (
                                    <View style={styles.tagPill}>
                                        <Text style={styles.pregnancyMonthLabel}>{getPregnancyMonthLabel()}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <Text style={styles.label}>Select observed chronic flags:</Text>
                        <View style={styles.checklist}>
                            {["Diabetes", "Hypertension", "Thyroid", "Heart Disease", "Tuberculosis"].map(item => (
                                <TouchableOpacity key={item} style={[styles.checkItem, formData.summary.chronicConditions.includes(item) && styles.activeCheck]} onPress={() => toggleChronicCondition(item)}>
                                    <Text style={formData.summary.chronicConditions.includes(item) ? { color: 'white', fontWeight: 'bold' } : { color: '#444'}}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.saveExitButton} onPress={handleSaveSurvey} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> :
                                <View style={styles.buttonContent}>
                                    <Ionicons name="cloud-upload" size={22} color="white" />
                                    <Text style={styles.saveExitText}> ENCRYPT & DISPATCH CENSUS</Text>
                                </View>
                            }
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 10 },
    stepperBox: { padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    stepperText: { textAlign: 'center', color: '#666', fontWeight: 'bold', fontSize: 13, marginBottom: 8, textTransform: 'uppercase' },
    progressBar: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, width: '100%' },
    progressFill: { height: 6, backgroundColor: '#1F7A6B', borderRadius: 3 },
    form: { padding: 20 },
    instructionBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#B2DFDB' },
    instructionText: { color: '#004D40', marginLeft: 10, flex: 1, fontSize: 13, fontWeight: '500' },
    label: { fontWeight: "bold", marginBottom: 8, color: "#333", fontSize: 15 },
    labelSm: { fontWeight: "bold", marginBottom: 5, color: "#666", fontSize: 13, textTransform: 'uppercase' },
    input: { backgroundColor: "white", padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: "#ddd", fontSize: 16, color: '#222' },
    inputDark: { backgroundColor: "#f9f9f9", padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: "#ccc", fontSize: 16 },
    cardBlock: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
    toggleBtn: { backgroundColor: "white", padding: 18, borderRadius: 12, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: "#ccc" },
    activeToggle: { backgroundColor: "#1F7A6B", borderColor: "#004D40" },
    toggleText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    memberCard: { backgroundColor: "white", padding: 20, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#ddd', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
    memberTitle: { fontWeight: 'bold', color: '#1F7A6B', fontSize: 16 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 20 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    datePickerContainer: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#1F7A6B', alignItems: 'center' },
    androidDateBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F0F4F8', width: '100%', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#CFD8DC' },
    tagPill: { backgroundColor: '#E8F5E9', paddingHorizontal: 15, verticalAlign: 'middle', paddingVertical: 8, borderRadius: 20, marginTop: 15 },
    checklist: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    checkItem: { padding: 12, paddingHorizontal: 16, backgroundColor: 'white', borderRadius: 25, borderWidth: 1, borderColor: '#ccc', marginRight: 10, marginBottom: 10 },
    activeCheck: { backgroundColor: '#D32F2F', borderColor: '#B71C1C' },
    pregnancyMonthLabel: { fontStyle: 'italic', fontWeight: 'bold', color: '#2E7D32' },
    submitButton: { backgroundColor: "#1F7A6B", padding: 18, borderRadius: 12, alignItems: "center", marginTop: 10, elevation: 3 },
    submitText: { color: "white", fontWeight: "bold", fontSize: 16, letterSpacing: 0.5 },
    saveExitButton: { backgroundColor: "#00695C", padding: 20, borderRadius: 15, alignItems: "center", marginTop: 20, elevation: 5 },
    buttonContent: { flexDirection: 'row', alignItems: 'center' },
    saveExitText: { color: "white", fontWeight: "bold", fontSize: 16, marginLeft: 10, letterSpacing: 0.5 },
    helperText: { textAlign: 'center', color: '#888', fontSize: 12, marginTop: 15, fontStyle: 'italic' }
});