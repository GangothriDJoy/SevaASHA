import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, ScrollView, Dimensions, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function HealthEntry() {
    const { memberId, name } = useLocalSearchParams();
    const router = useRouter();

    const [bpLeft, setBpLeft] = useState('');
    const [bpRight, setBpRight] = useState('');
    const [bloodSugar, setBloodSugar] = useState('');
    const [weight, setWeight] = useState('');
    const [hemoglobin, setHemoglobin] = useState('');
    const [isTeenageMother, setIsTeenageMother] = useState(false);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!memberId) {
            const msg = "Invalid member ID. Cannot save record.";
            isWeb ? window.alert(msg) : Alert.alert("Error", msg);
            return;
        }

        // Basic validation
        if (!bpLeft && !bpRight && !bloodSugar && !weight && !hemoglobin) {
            const msg = "Please enter at least one health metric.";
            isWeb ? window.alert(msg) : Alert.alert("Validation", msg);
            return;
        }

        setSaving(true);
        try {
            const bp = (bpLeft && bpRight) ? `${bpLeft}/${bpRight}` : '';
            
            const isHypertensive = (parseInt(bpLeft) >= 140 || parseInt(bpRight) >= 90) || false;
            const isDiabetic = (parseInt(bloodSugar) >= 140) || false;
            const isAnemic = (parseInt(hemoglobin) < 11) || false;
            const isHighRisk = isHypertensive || isDiabetic || isAnemic || isTeenageMother;

            const healthIssues = isHighRisk ? "High Risk" : "Normal";
            
            const riskFactors = {
                hypertension: isHypertensive,
                diabetes: isDiabetic,
                anemia: isAnemic,
                teenageMother: isTeenageMother
            };

            const payload = {
                beneficiaryId: memberId,
                beneficiaryName: name || "Unknown Beneficiary",
                bloodPressure: bp,
                sugarLevel: bloodSugar || "",
                weight: weight || "",
                hemoglobin: hemoglobin || "",
                notes: notes || "",
                healthIssues: healthIssues,
                riskFactors: riskFactors,
                recordedAt: serverTimestamp(),
                recordedBy: "ASHA Worker"
            };

            await addDoc(collection(db, 'health_records'), payload);
            
            if (isHighRisk) {
                await addDoc(collection(db, 'high_risk'), payload);
            }

            const successMsg = "Health record saved successfully.";
            if (isWeb) {
                window.alert(successMsg);
                router.back();
            } else {
                Alert.alert("Success", successMsg, [{ text: "OK", onPress: () => router.back() }]);
            }
        } catch (error: any) {
            console.error("Error saving record:", error);
            const errMsg = "Failed to save record. Try again.";
            isWeb ? window.alert(errMsg) : Alert.alert("Error", errMsg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>New Health Record</Text>
                        <Text style={styles.headerSubtitle}>For {name || 'Beneficiary'}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Vitals</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Blood Pressure (mmHg)</Text>
                        <View style={styles.bpContainer}>
                            <TextInput
                                style={[styles.input, styles.bpInput]}
                                placeholder="120"
                                placeholderTextColor="#ccc"
                                value={bpLeft}
                                onChangeText={setBpLeft}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                            <Text style={styles.bpDivider}>/</Text>
                            <TextInput
                                style={[styles.input, styles.bpInput]}
                                placeholder="80"
                                placeholderTextColor="#ccc"
                                value={bpRight}
                                onChangeText={setBpRight}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, styles.flex1, { marginRight: 10 }]}>
                            <Text style={styles.label}>Blood Sugar (mg/dL)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 110"
                                placeholderTextColor="#ccc"
                                value={bloodSugar}
                                onChangeText={setBloodSugar}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={[styles.inputGroup, styles.flex1, { marginLeft: 10 }]}>
                            <Text style={styles.label}>Weight (kg)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 65"
                                placeholderTextColor="#ccc"
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Hemoglobin (g/dL)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 12"
                            placeholderTextColor="#ccc"
                            value={hemoglobin}
                            onChangeText={setHemoglobin}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Additional Information</Text>
                    
                    <View style={styles.inputGroup}>
                        <View style={styles.switchRow}>
                            <Text style={[styles.label, { marginBottom: 0 }]}>Teenage Mother?</Text>
                            <Switch
                                value={isTeenageMother}
                                onValueChange={setIsTeenageMother}
                                trackColor={{ false: "#E5E7EB", true: "#1F7A6B" }}
                                thumbColor="white"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Clinical Notes (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Add any observations or symptoms..."
                            placeholderTextColor="#ccc"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={20} color="white" />
                            <Text style={styles.saveButtonText}>Save Record</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAF9",
    },
    header: {
        backgroundColor: "#1F7A6B",
        paddingTop: isWeb ? 20 : 50,
        paddingBottom: 25,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
    },
    backButton: {
        padding: 5,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 15,
    },
    headerTitle: {
        color: "white",
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: "#A7F3D0",
        fontSize: 13,
        marginTop: 2,
        fontWeight: '500',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    formCard: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#1F7A6B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(31,122,107,0.05)",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1F7A6B",
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        paddingBottom: 10,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#4B5563",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: "#1F2937",
    },
    bpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bpInput: {
        flex: 1,
        textAlign: 'center',
    },
    bpDivider: {
        fontSize: 24,
        color: "#9CA3AF",
        marginHorizontal: 10,
        fontWeight: '300',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    flex1: {
        flex: 1,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    saveButton: {
        backgroundColor: "#1F7A6B",
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        marginTop: 10,
        shadowColor: "#1F7A6B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    saveButtonDisabled: {
        backgroundColor: "#9CA3AF",
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 8,
    }
});
