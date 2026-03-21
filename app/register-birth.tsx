import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { IMMUNIZATION_SCHEDULE } from '@/constants/immunizationSchedule';

export default function RegisterBirth() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.workerMobile || "");
    const [saving, setSaving] = useState(false);

    const [childName, setChildName] = useState('');
    const [gender, setGender] = useState('Male');
    const [dobString, setDobString] = useState(''); // YYYY-MM-DD
    const [parentName, setParentName] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');

    const handleRegister = async () => {
        if (!childName || !dobString || !parentName || !mobile) {
            Alert.alert("Missing Fields", "Please fill all required fields including Date of Birth.");
            return;
        }

        // Basic date parse
        const dobDate = new Date(dobString);
        if (isNaN(dobDate.getTime())) {
            Alert.alert("Invalid Date", "Please enter a valid format YYYY-MM-DD");
            return;
        }

        setSaving(true);
        try {
            // 1. Create Beneficiary Record
            const beneficiaryRef = await addDoc(collection(db, 'beneficiaries'), {
                name: childName,
                role: "Child",
                category: "Child",
                isChild: true,
                gender: gender,
                dobString: dobString,
                parentName: parentName,
                mobile: mobile,
                address: address,
                vaccinationStatus: "Pending", // Master status wrapper
                workerId: workerMobile,
                ashaId: workerMobile,
                createdAt: serverTimestamp()
            });

            // 2. Create Digital Vaccine Card records using the IMMUNIZATION_SCHEDULE
            const batchPromises = IMMUNIZATION_SCHEDULE.map(vax => {
                // dueDate = dobDate + vax.dueDays
                const due = new Date(dobDate.getTime() + vax.dueDays * 24 * 60 * 60 * 1000);
                return addDoc(collection(db, 'vaccine_cards'), {
                    childId: beneficiaryRef.id,
                    childName: childName,
                    parentMobile: mobile,
                    vaccineId: vax.id,
                    vaccineName: vax.name,
                    dueDate: due.toISOString(), // Store as ISO string for querying simplicity
                    status: "Pending", // 'Pending' | 'Completed'
                    dateGiven: null
                });
            });

            await Promise.all(batchPromises);

            if (Platform.OS === 'web') {
                window.alert("Birth Registered and Digital Vaccine Card created successfully.");
                router.back();
            } else {
                Alert.alert("Success", "Birth Registered and Digital Vaccine Card created successfully.", [{ text: "OK", onPress: () => router.back() }]);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to register birth.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Register New Birth</Text>
            </View>

            <View style={styles.formCard}>
                <Text style={styles.infoText}>Registering a birth will automatically generate a digital National Immunization Schedule card for the infant.</Text>

                <Text style={styles.label}>Child Name *</Text>
                <TextInput style={styles.input} placeholder="e.g. Baby of Anjali" value={childName} onChangeText={setChildName} />

                <Text style={styles.label}>Date of Birth (YYYY-MM-DD) *</Text>
                <TextInput style={styles.input} placeholder="e.g. 2026-03-21" value={dobString} onChangeText={setDobString} />

                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderRow}>
                    <TouchableOpacity style={[styles.genderBtn, gender === 'Male' && styles.genderActive]} onPress={() => setGender('Male')}>
                        <Text style={[styles.genderText, gender === 'Male' && { color: 'white' }]}>Male</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.genderBtn, gender === 'Female' && styles.genderActive]} onPress={() => setGender('Female')}>
                        <Text style={[styles.genderText, gender === 'Female' && { color: 'white' }]}>Female</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Parent/Mother Name *</Text>
                <TextInput style={styles.input} placeholder="Mother's Name" value={parentName} onChangeText={setParentName} />

                <Text style={styles.label}>Mobile Number *</Text>
                <TextInput style={styles.input} placeholder="10-digit number" keyboardType="numeric" value={mobile} onChangeText={setMobile} />

                <Text style={styles.label}>Address</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="House / Village details" multiline numberOfLines={3} value={address} onChangeText={setAddress} />

                <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={saving}>
                    {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Register & Create Vaccine Card</Text>}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7FB' },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1976D2', padding: 20, paddingTop: Platform.OS === 'ios' ? 40 : 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    formCard: { backgroundColor: 'white', margin: 15, padding: 20, borderRadius: 15, elevation: 2 },
    infoText: { color: '#666', marginBottom: 20, fontSize: 13, lineHeight: 18, backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, fontSize: 15, backgroundColor: '#FAFAFA' },
    textArea: { height: 80, textAlignVertical: 'top' },
    genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    genderBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#1976D2', alignItems: 'center', borderRadius: 8, marginHorizontal: 5 },
    genderActive: { backgroundColor: '#1976D2' },
    genderText: { color: '#1976D2', fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#1976D2', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
