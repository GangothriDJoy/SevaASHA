import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChildDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    // Params passed from Child Registry
    const childId = String(params.childId || "");
    const parentId = String(params.parentId || "");
    const childIndex = params.childIndex ? parseInt(String(params.childIndex)) : -1;
    const collectionType = String(params.collectionType || "beneficiaries");
    const isNested = String(params.isNested) === "true";
    const readOnly = String(params.readOnly) === "true";

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [parentProfile, setParentProfile] = useState<any>(null);
    const [userRole, setUserRole] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Get authenticated user role
                const userJson = await AsyncStorage.getItem('user');
                if (userJson) {
                    const session = JSON.parse(userJson);
                    setUserRole(session.role || "");
                }

                if (isNested && parentId) {
                    // Fetch the parent document and extract the nested child
                    const parentRef = doc(db, collectionType, parentId);
                    const pSnap = await getDoc(parentRef);
                    if (pSnap.exists()) {
                        const pData = pSnap.data();
                        setParentProfile(pData);
                        if (pData.childrenDetails && pData.childrenDetails[childIndex]) {
                            setProfile(pData.childrenDetails[childIndex]);
                        }
                    }
                } else if (childId) {
                    // Fetch directly from the base collection
                    const childRef = doc(db, collectionType, childId);
                    const cSnap = await getDoc(childRef);
                    if (cSnap.exists()) {
                        setProfile(cSnap.data());
                    }
                }
            } catch (err) {
                console.error("Error fetching child details:", err);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [childId, parentId, isNested]);

    const handleSupplyToggle = async (status: string) => {
        if (updating || readOnly) return;
        if (userRole !== "Anganwadi Worker") {
            Alert.alert("Unauthorized", "Only Anganwadi Workers can update nutrition supply statuses.");
            return;
        }

        setUpdating(true);
        try {
            if (isNested && parentId && parentProfile) {
                const parentRef = doc(db, collectionType, parentId);
                const updatedChildren = [...(parentProfile.childrenDetails || [])];
                
                if (updatedChildren[childIndex]) {
                    updatedChildren[childIndex] = { ...updatedChildren[childIndex], anganwadiSupply: status };
                    await updateDoc(parentRef, { childrenDetails: updatedChildren });
                    setProfile({ ...profile, anganwadiSupply: status });
                    setParentProfile({ ...parentProfile, childrenDetails: updatedChildren });
                }
            } else if (childId) {
                const childRef = doc(db, collectionType, childId);
                await updateDoc(childRef, { anganwadiSupply: status });
                setProfile({ ...profile, anganwadiSupply: status });
            }
            Alert.alert("Success", `Nutrition supply marked as '${status}'.`);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Child Profile</Text>
                </View>
                <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 50 }} />
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Child Profile</Text>
                </View>
                <Text style={styles.errorText}>Profile not found. The record might have been removed.</Text>
            </SafeAreaView>
        );
    }

    const currentSupply = profile.anganwadiSupply || profile.food || "Not Specified";
    const canEditSupply = userRole === "Anganwadi Worker" && !readOnly;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Child Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarLarge}>
                        <Ionicons name="person-circle" size={90} color="#1976D2" />
                    </View>
                    <Text style={styles.nameLarge}>{profile.name || profile.firstName || "Unknown Child"}</Text>
                    <Text style={styles.ageGender}>{profile.gender || "Gender N/A"} • Age: {profile.age || "N/A"}</Text>
                </View>

                {/* Parent Block (if applicable) */}
                {isNested && parentProfile && (
                    <View style={styles.cardInfo}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="people" size={20} color="#1976D2" />
                            <Text style={styles.cardTitle}>Guardian Information</Text>
                        </View>
                        <Text style={styles.infoText}><Text style={styles.bold}>Mother:</Text> {parentProfile.fullName || parentProfile.name}</Text>
                        <Text style={styles.infoText}><Text style={styles.bold}>Contact:</Text> {parentProfile.mobile || parentProfile.userMobile || "Not Provided"}</Text>
                    </View>
                )}

                {/* Digital Vaccine Card Navigation */}
                <TouchableOpacity 
                    style={styles.vaccineBtn}
                    onPress={() => router.push({
                        pathname: '/vaccine-card' as any,
                        params: {
                            childId: isNested ? `${parentId}_child_${childIndex}` : childId,
                            childName: profile.name || profile.firstName || "Child Record",
                            dob: profile.dobString || "Unknown Date",
                            readOnly: String(readOnly)
                        }
                    })}
                >
                    <Ionicons name="shield-checkmark" size={24} color="#FFF" />
                    <Text style={styles.vaccineBtnText}>View Digital Vaccine Tracker</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                {/* Anganwadi Supply Tracking Module */}
                <View style={styles.cardInfo}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="nutrition" size={20} color="#E67E22" />
                        <Text style={styles.cardTitle}>Anganwadi Nutritional Supply</Text>
                    </View>
                    
                    <Text style={styles.infoText}>
                        Current Status: <Text style={[styles.bold, { color: currentSupply === 'Yes' ? '#2E7D32' : (currentSupply === 'No' ? '#D32F2F' : '#666') }]}>{currentSupply}</Text>
                    </Text>

                    {canEditSupply ? (
                        <View style={styles.actionRow}>
                            <TouchableOpacity 
                                style={[styles.supplyBtn, currentSupply === 'Yes' && styles.supplyBtnActiveY]}
                                onPress={() => handleSupplyToggle("Yes")}
                                disabled={updating}
                            >
                                <Text style={[styles.supplyBtnText, currentSupply === 'Yes' && styles.supplyBtnTextActive]}>Received</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.supplyBtn, currentSupply === 'No' && styles.supplyBtnActiveN]}
                                onPress={() => handleSupplyToggle("No")}
                                disabled={updating}
                            >
                                <Text style={[styles.supplyBtnText, currentSupply === 'No' && { color: '#FFF' }]}>Not Received</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Text style={styles.readOnlyNote}>* Supply statuses can only be edited directly by authenticated Anganwadi Workers.</Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#1976D2' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    container: { backgroundColor: '#F4F7FB', minHeight: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 60 },
    errorText: { textAlign: 'center', marginTop: 50, color: '#FFF', fontSize: 16, paddingHorizontal: 20 },
    
    profileHeader: { alignItems: 'center', marginVertical: 20 },
    avatarLarge: { backgroundColor: '#E3F2FD', borderRadius: 50, padding: 5, marginBottom: 10 },
    nameLarge: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    ageGender: { fontSize: 16, color: '#666', marginTop: 5 },

    cardInfo: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 10 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 10 },
    infoText: { fontSize: 15, color: '#555', marginBottom: 8, lineHeight: 22 },
    bold: { fontWeight: 'bold', color: '#333' },
    
    vaccineBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1976D2', padding: 18, borderRadius: 16, marginBottom: 20, elevation: 4 },
    vaccineBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 12 },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    supplyBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CCC', alignItems: 'center', marginHorizontal: 5 },
    supplyBtnActiveY: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    supplyBtnActiveN: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
    supplyBtnText: { fontWeight: 'bold', color: '#666' },
    supplyBtnTextActive: { color: '#FFF' },
    readOnlyNote: { fontSize: 12, color: '#999', marginTop: 15, fontStyle: 'italic' }
});
