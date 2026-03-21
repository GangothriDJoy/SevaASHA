import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, query, where, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
import DateTimePicker from '@react-native-community/datetimepicker';

const CHRONIC_OPTIONS = ["Diabetes", "Hypertension", "Thyroid", "Heart Disease"];

// Helper function to calculate pregnancy month from LMP date
const calculatePregnancyMonth = (lmpDateString: string | null): number | null => {
    if (!lmpDateString) return null;
    const lmpDate = new Date(lmpDateString);
    const today = new Date();

    const diffTime = Math.abs(today.getTime() - lmpDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let month = Math.ceil(diffDays / 30);

    if (month > 10) month = 10;
    if (month < 0) month = 0;

    return month;
};

export default function AddNew() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const workerMobile = String(params.mobile || "").trim();
    const workerRole = String(params.role || "ASHA Worker").trim();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [houseId, setHouseId] = useState("");
    const [existingResidents, setExistingResidents] = useState<any[]>([]);

    const [showDatePickerMap, setShowDatePickerMap] = useState<{ [key: number]: boolean }>({});
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);

    const [formData, setFormData] = useState({
        members: [] as any[]
    });

    const fetchHouseData = async () => {
        if (!houseId.trim()) {
            Alert.alert("Required", "Please enter a House ID.");
            return;
        }
        setLoading(true);
        try {
            const q = query(
                collection(db, "household_members"),
                where("houseId", "==", houseId.trim())
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExistingResidents(list);
        } catch (error) {
            console.error("Error fetching house:", error);
            Alert.alert("Error", "Could not fetch household data.");
        } finally {
            setLoading(false);
        }
    };

    const generateBlankMember = () => ({
        id: "",
        name: "",
        age: "",
        gender: "",
        relation: "",
        mobile: "",
        aadhaar: "",
        maritalStatus: "",
        weight: "",
        bloodPressure: "",
        sugarLevel: "",
        cholesterol: "",
        chronicConditions: [],
        isPregnant: false,
        lactating: false,
        isBedridden: false,
        lmpDate: null,
        pregnancyMonth: null
    });

    const handleProceedToAddEdit = () => {
        const blankTemplate = generateBlankMember();

        const formattedExisting = existingResidents.map(res => ({
            ...blankTemplate,
            ...res,
            chronicConditions: res.chronicConditions || [],
            pregnancyMonth: res.lmpDate ? calculatePregnancyMonth(res.lmpDate) : null
        }));

        setFormData({ members: [...formattedExisting, generateBlankMember()] });
        setStep(2);
        setAttemptedSubmit(false);
    };

    const updateMember = (index: number, field: string, value: any) => {
        const updated = [...formData.members];

        if (field === 'mobile') {
            const cleaned = value.replace(/\D/g, '');
            value = cleaned.substring(0, 10);
        }

        updated[index][field] = value;
        setFormData({ members: updated });
    };

    const updatePregnancyLMP = (index: number, selectedDate: Date) => {
        const isoDate = selectedDate.toISOString();
        const calculatedMonth = calculatePregnancyMonth(isoDate);

        const updated = [...formData.members];
        updated[index]['lmpDate'] = isoDate;
        updated[index]['pregnancyMonth'] = calculatedMonth;
        if (isoDate) updated[index]['lactating'] = false;

        setFormData({ members: updated });
    };

    const toggleCondition = (index: number, condition: string) => {
        const updated = [...formData.members];
        const conditions = updated[index].chronicConditions || [];
        if (conditions.includes(condition)) {
            updated[index].chronicConditions = conditions.filter((c: string) => c !== condition);
        } else {
            updated[index].chronicConditions = [...conditions, condition];
        }
        setFormData({ members: updated });
    };

    const removeMemberSlot = (index: number) => {
        const memberToDelete = formData.members[index];

        const confirmDelete = async () => {
            try {
                if (memberToDelete.id) {
                    setLoading(true);
                    await deleteDoc(doc(db, "household_members", memberToDelete.id));
                    setLoading(false);
                }

                const updated = formData.members.filter((_, i) => i !== index);
                setFormData({ members: updated });

                if (updated.length === 0) {
                    setStep(1);
                    fetchHouseData();
                }
            } catch (error) {
                console.error("Error deleting member:", error);
                Alert.alert("Error", "Could not delete this member from the database.");
                setLoading(false);
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`Are you sure you want to permanently remove ${memberToDelete.name || "this member"}?`);
            if (confirmed) confirmDelete();
        } else {
            Alert.alert(
                "Delete Member",
                `Are you sure you want to permanently remove ${memberToDelete.name || "this member"}?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: confirmDelete }
                ]
            );
        }
    };

    const proceedToSummary = () => {
        setAttemptedSubmit(true);

        const mandatoryFields = ['name', 'age', 'gender', 'relation', 'mobile', 'weight', 'bloodPressure', 'sugarLevel'];

        for (let i = 0; i < formData.members.length; i++) {
            const m = formData.members[i];
            const memberName = m.name.trim() || `Member ${i + 1}`;

            const hasEmptyField = mandatoryFields.some(field => {
                const value = m[field];
                return typeof value === 'string' ? !value.trim() : (value === null || value === undefined);
            });

            if (hasEmptyField) {
                Alert.alert("Required", `Please provide Name, Age, Gender, Relation, Mobile, Weight, BP, Sugar for ${memberName}.`);
                return;
            }

            if (m.mobile.length !== 10) {
                Alert.alert("Invalid Mobile", `Mobile Number for ${memberName} must be 10 digits.`);
                return;
            }

            if (m.isPregnant && !m.lmpDate) {
                Alert.alert("Data Missing", `Please select the LMP date for ${memberName} to calculate pregnancy month.`);
                return;
            }
        }

        setStep(3);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const savePromises = formData.members.map((member) => {
                const customId = member.id || `${houseId.trim()}_${member.name.trim()}`.toLowerCase().replace(/\s+/g, '_');
                const memberRef = doc(db, "household_members", customId);

                return setDoc(memberRef, {
                    ...member,
                    id: customId,
                    houseId: houseId.trim(),
                    workerId: workerMobile,
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            });

            await Promise.all(savePromises);

            await addDoc(collection(db, "household_visits"), {
                houseId: houseId.trim(),
                workerId: workerMobile,
                members: formData.members,
                createdAt: serverTimestamp(),
            });

            router.replace({ pathname: "/dashboard", params: { mobile: workerMobile, role: workerRole } });
        } catch (error) {
            console.error("Save Error:", error);
            Alert.alert("Error", "Could not save household data.");
        } finally {
            setLoading(false);
        }
    };

    const pregnantMembers = formData.members.filter(m => m.isPregnant);
    const breastfeedingMembers = formData.members.filter(m => m.lactating);
    const bedriddenMembers = formData.members.filter(m => m.isBedridden);
    const diseasedMembers = formData.members.filter(m => (m.chronicConditions?.length > 0));

    const toggleDatePicker = (index: number, forceOpen: boolean = false) => {
        if (forceOpen) {
            setShowDatePickerMap(prev => ({ ...prev, [index]: true }));
        } else {
            setShowDatePickerMap(prev => ({ ...prev, [index]: !prev[index] }));
        }
    };

    const hasError = (value: any) => {
        return attemptedSubmit && (typeof value === 'string' ? !value.trim() : (value === null || value === undefined));
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Household Update (Step {step}/3)</Text>
            </View>

            <View style={styles.form}>
                {step === 1 && (
                    <View>
                        <Text style={styles.label}>Enter House ID</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. 12/401" value={houseId} onChangeText={setHouseId} />
                            <TouchableOpacity style={styles.searchButton} onPress={fetchHouseData} disabled={loading}>
                                {loading ? <ActivityIndicator color="white" /> : <Ionicons name="search" size={20} color="white" />}
                            </TouchableOpacity>
                        </View>
                        {existingResidents.length > 0 && (
                            <View style={styles.residentBox}>
                                <Text style={styles.sectionTitle}>Existing Members:</Text>
                                {existingResidents.map((res, idx) => (
                                    <View key={idx} style={styles.residentItem}>
                                        <Text style={{ fontSize: 16 }}>👤 {res.name} (Age: {res.age})</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <TouchableOpacity style={styles.submitButton} onPress={handleProceedToAddEdit} disabled={!houseId.trim()}>
                            <Text style={styles.submitText}>{existingResidents.length > 0 ? "EDIT & ADD NEW MEMBER" : "CREATE NEW HOUSEHOLD"}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.sectionTitle}>Review & Add Members</Text>

                        {formData.members.map((member, index) => {
                            const isNew = !member.id;
                            const currentMonth = calculatePregnancyMonth(member.lmpDate);

                            return (
                                <View key={index} style={[styles.card, isNew && styles.newCard]}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>{isNew ? "✨ New Member" : `Edit: ${member.name}`}</Text>
                                        <TouchableOpacity onPress={() => removeMemberSlot(index)}>
                                            {loading ? <ActivityIndicator size="small" color="#D32F2F" /> : <Ionicons name="trash" size={20} color="#D32F2F" />}
                                        </TouchableOpacity>
                                    </View>

                                    <TextInput
                                        style={[styles.input, hasError(member.name) && styles.inputError]}
                                        placeholder="Full Name *"
                                        value={member.name}
                                        onChangeText={(val) => updateMember(index, 'name', val)}
                                    />

                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TextInput
                                            style={[styles.input, { flex: 1 }, hasError(member.age) && styles.inputError]}
                                            placeholder="Age *"
                                            keyboardType="numeric"
                                            value={member.age}
                                            onChangeText={(val) => updateMember(index, 'age', val)}
                                        />
                                        <TextInput
                                            style={[styles.input, { flex: 1 }, hasError(member.gender) && styles.inputError]}
                                            placeholder="Gender (M/F) *"
                                            value={member.gender}
                                            onChangeText={(val) => updateMember(index, 'gender', val)}
                                        />
                                    </View>

                                    <TextInput
                                        style={[styles.input, hasError(member.relation) && styles.inputError]}
                                        placeholder="Relation to Head *"
                                        value={member.relation}
                                        onChangeText={(val) => updateMember(index, 'relation', val)}
                                    />
                                    <TextInput
                                        style={[styles.input, (hasError(member.mobile) || (attemptedSubmit && member.mobile.length !== 10)) && styles.inputError]}
                                        placeholder="Mobile *"
                                        maxLength={10}
                                        keyboardType="phone-pad"
                                        value={member.mobile}
                                        onChangeText={(val) => updateMember(index, 'mobile', val)}
                                    />

                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TextInput
                                            style={[styles.input, { flex: 1 }, hasError(member.weight) && styles.inputError]}
                                            placeholder="Weight (kg) *"
                                            keyboardType="numeric"
                                            value={member.weight}
                                            onChangeText={(val) => updateMember(index, 'weight', val)}
                                        />
                                        <TextInput
                                            style={[styles.input, { flex: 1 }, hasError(member.bloodPressure) && styles.inputError]}
                                            placeholder="BP (120/80) *"
                                            value={member.bloodPressure}
                                            onChangeText={(val) => updateMember(index, 'bloodPressure', val)}
                                        />
                                    </View>
                                    <TextInput
                                        style={[styles.input, hasError(member.sugarLevel) && styles.inputError]}
                                        placeholder="Sugar (mg/dL) *"
                                        keyboardType="numeric"
                                        value={member.sugarLevel}
                                        onChangeText={(val) => updateMember(index, 'sugarLevel', val)}
                                    />

                                    <Text style={styles.label}>Health Status:</Text>
                                    <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, member.isPregnant && styles.toggleActivePregnant]}
                                            onPress={() => {
                                                const newPregnantState = !member.isPregnant;
                                                updateMember(index, 'isPregnant', newPregnantState);

                                                if (newPregnantState) {
                                                    toggleDatePicker(index, true);
                                                    updateMember(index, 'lactating', false);
                                                } else {
                                                    updateMember(index, 'lmpDate', null);
                                                    updateMember(index, 'pregnancyMonth', null);
                                                }
                                            }}
                                        >
                                            <Text style={member.isPregnant ? styles.toggleTextActive : styles.toggleTextInactive}>🤰 Pregnant</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.toggleBtn, member.lactating && styles.toggleActiveLactating]}
                                            onPress={() => {
                                                const newLactatingState = !member.lactating;
                                                if (newLactatingState) {
                                                    updateMember(index, 'isPregnant', false);
                                                    updateMember(index, 'lmpDate', null);
                                                    updateMember(index, 'pregnancyMonth', null);
                                                }
                                                updateMember(index, 'lactating', newLactatingState);
                                            }}
                                        >
                                            <Text style={member.lactating ? styles.toggleTextActive : styles.toggleTextInactive}>🍼 Breastfeeding</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.toggleBtn, member.isBedridden && styles.toggleActiveBedridden]}
                                            onPress={() => updateMember(index, 'isBedridden', !member.isBedridden)}
                                        >
                                            <Text style={member.isBedridden ? styles.toggleTextActive : styles.toggleTextInactive}>🛏️ Bedridden</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {member.isPregnant && (
                                        <View style={[styles.dateDatePickerCardBlock, (attemptedSubmit && !member.lmpDate) && styles.inputError]}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={[styles.label, { color: '#8E24AA', marginBottom: 0 }]}>Month Calculation (based on LMP)</Text>

                                                {Platform.OS !== 'web' && (
                                                    <TouchableOpacity onPress={() => toggleDatePicker(index)} style={styles.dateEditBtn}>
                                                        <Text style={{ color: 'white', fontSize: 12 }}>
                                                            {showDatePickerMap[index] && Platform.OS === 'ios' ? "Done" : (member.lmpDate ? "Change Date" : "Select Date")}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            {member.lmpDate && (
                                                <View style={styles.calculationResultBox}>
                                                    <Text style={styles.resultText}>LMP: <Text style={{ fontWeight: 'normal' }}>{new Date(member.lmpDate).toLocaleDateString()}</Text></Text>
                                                    <View style={styles.monthPill}>
                                                        <Text style={styles.monthNumber}>{currentMonth || "?"}</Text>
                                                        <Text style={styles.monthLabel}>Month</Text>
                                                    </View>
                                                </View>
                                            )}

                                            {!member.lmpDate && Platform.OS !== 'web' && (
                                                <Text style={styles.warningText}>⚠️ Select Last Menstrual Period date to calculate month.</Text>
                                            )}

                                            {Platform.OS === 'web' ? (
                                                <TextInput
                                                    style={[styles.input, { marginTop: 15, marginBottom: 5, padding: 10 }]}
                                                    {...({ type: 'date' } as any)}
                                                    value={member.lmpDate ? member.lmpDate.split('T')[0] : ''}
                                                    onChangeText={(text) => {
                                                        if (text) {
                                                            updatePregnancyLMP(index, new Date(text));
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                showDatePickerMap[index] && (
                                                    <DateTimePicker
                                                        value={member.lmpDate ? new Date(member.lmpDate) : new Date()}
                                                        mode="date"
                                                        maximumDate={new Date()}
                                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                        onChange={(e, date) => {
                                                            if (Platform.OS === 'android') {
                                                                setShowDatePickerMap(prev => ({ ...prev, [index]: false }));
                                                            }
                                                            if (e.type === "dismissed") {
                                                                if (!member.lmpDate) updateMember(index, 'isPregnant', false);
                                                                return;
                                                            }
                                                            if (date) {
                                                                updatePregnancyLMP(index, date);
                                                            }
                                                        }}
                                                    />
                                                )
                                            )}
                                        </View>
                                    )}

                                    <Text style={styles.label}>Chronic Diseases:</Text>
                                    <View style={styles.pillContainer}>
                                        {CHRONIC_OPTIONS.map(cond => (
                                            <TouchableOpacity key={cond} style={[styles.pill, member.chronicConditions?.includes(cond) && styles.pillActive]} onPress={() => toggleCondition(index, cond)}>
                                                <Text style={member.chronicConditions?.includes(cond) ? styles.pillTextActive : styles.pillTextInactive}>{cond}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            );
                        })}

                        <TouchableOpacity style={styles.addMoreBtn} onPress={() => setFormData({ members: [...formData.members, generateBlankMember()] })}>
                            <Text style={styles.addMoreText}>+ ADD ANOTHER PERSON</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.submitButton} onPress={proceedToSummary}><Text style={styles.submitText}>NEXT: HEALTH SUMMARY</Text></TouchableOpacity>
                    </View>
                )}

                {step === 3 && (
                    <View>
                        <Text style={styles.sectionTitle}>Household Health Summary</Text>
                        <Text style={{ color: '#666', marginBottom: 20 }}>Please review before saving.</Text>

                        <View style={[styles.summaryBox, { borderColor: '#E91E63' }]}>
                            <Text style={[styles.summaryTitle, { color: '#C2185B' }]}>🤰 Pregnant Women ({pregnantMembers.length})</Text>
                            {pregnantMembers.length === 0 ? <Text style={styles.summaryNone}>None.</Text> :
                                pregnantMembers.map((m, idx) => (
                                    <View key={idx} style={styles.summaryItem}>
                                        <Text style={styles.summaryName}>• {m.name} (Age: {m.age})</Text>
                                        <Text style={styles.summaryHealthDetail}>
                                            Current: <Text style={{ fontWeight: 'bold', color: '#E91E63' }}>Month {calculatePregnancyMonth(m.lmpDate)}</Text> (LMP: {new Date(m.lmpDate).toLocaleDateString()})
                                        </Text>
                                    </View>
                                ))}
                        </View>

                        <View style={[styles.summaryBox, { borderColor: '#0288D1' }]}>
                            <Text style={[styles.summaryTitle, { color: '#01579B' }]}>🍼 Breastfeeding Mothers ({breastfeedingMembers.length})</Text>
                            {breastfeedingMembers.length === 0 ? <Text style={styles.summaryNone}>None.</Text> :
                                breastfeedingMembers.map((m, idx) => (
                                    <Text key={idx} style={styles.summaryName}>• {m.name} (Age: {m.age})</Text>
                                ))}
                        </View>

                        <View style={[styles.summaryBox, { borderColor: '#D32F2F' }]}>
                            <Text style={[styles.summaryTitle, { color: '#B71C1C' }]}>🩺 Chronic Diseases ({diseasedMembers.length})</Text>
                            {diseasedMembers.length === 0 ? <Text style={styles.summaryNone}>None.</Text> :
                                diseasedMembers.map((m, idx) => (
                                    <View key={idx} style={styles.summaryItem}>
                                        <Text style={styles.summaryName}>• {m.name}</Text>
                                        <Text style={styles.summaryHealthDetail}>{m.chronicConditions?.join(", ")}</Text>
                                    </View>
                                ))}
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>SAVE ALL RECORDS</Text>}
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
    form: { padding: 15 },
    label: { fontWeight: "bold", marginBottom: 5, color: "#444", fontSize: 13 },
    input: { backgroundColor: "white", padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: "#ddd", fontSize: 14 },
    inputError: { borderColor: '#D32F2F', borderWidth: 2 },
    searchButton: { backgroundColor: "#1F7A6B", justifyContent: 'center', paddingHorizontal: 20, borderRadius: 10, height: 50 },
    submitButton: { backgroundColor: "#1F7A6B", padding: 18, borderRadius: 10, alignItems: "center", marginTop: 15 },
    saveBtn: { backgroundColor: "#2E7D32", padding: 18, borderRadius: 10, alignItems: "center", marginTop: 25 },
    submitText: { color: "white", fontWeight: "bold", fontSize: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F7A6B', marginBottom: 15 },
    residentBox: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
    residentItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    card: { backgroundColor: "white", padding: 15, borderRadius: 12, marginBottom: 20, elevation: 2, borderWidth: 1, borderColor: "#eee" },
    newCard: { borderColor: '#1F7A6B', borderWidth: 2, backgroundColor: '#FAFAFA' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
    cardTitle: { fontWeight: 'bold', fontSize: 15, color: '#333' },
    toggleBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: 'white', marginRight: 5 },
    toggleActivePregnant: { backgroundColor: '#FCE4EC', borderColor: '#F06292' },
    toggleActiveLactating: { backgroundColor: '#E1F5FE', borderColor: '#4FC3F7' },
    toggleActiveBedridden: { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' },
    toggleTextActive: { fontWeight: 'bold', color: '#333', fontSize: 12 },
    toggleTextInactive: { color: '#777', fontSize: 12 },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
    pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', backgroundColor: 'white' },
    pillActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
    pillTextActive: { color: 'white', fontWeight: '500', fontSize: 11 },
    pillTextInactive: { color: '#D32F2F', fontSize: 11 },
    addMoreBtn: { backgroundColor: '#E0F2F1', borderWidth: 1, borderColor: '#1F7A6B', padding: 15, borderRadius: 10, alignItems: "center", marginBottom: 10 },
    addMoreText: { color: '#1F7A6B', fontWeight: 'bold', fontSize: 14 },
    summaryBox: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderLeftWidth: 5 },
    summaryTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
    summaryNone: { color: '#999', fontStyle: 'italic', fontSize: 13 },
    summaryItem: { marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 5 },
    summaryName: { fontSize: 14, fontWeight: '500', color: '#444' },
    summaryHealthDetail: { color: '#777', fontSize: 12, paddingLeft: 12, marginTop: 2 },
    dateDatePickerCardBlock: { backgroundColor: '#F3E5F5', padding: 12, borderRadius: 10, marginVertical: 10, borderWidth: 1, borderColor: '#CE93D8' },
    dateEditBtn: { backgroundColor: '#8E24AA', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15 },
    calculationResultBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, backgroundColor: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E1BEE7' },
    resultText: { fontSize: 13, color: '#333', fontWeight: 'bold' },
    warningText: { color: '#C62828', fontSize: 12, fontStyle: 'italic', marginTop: 8 },
    monthPill: { backgroundColor: '#8E24AA', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    monthNumber: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    monthLabel: { fontSize: 9, color: 'white', marginTop: -2 }
});