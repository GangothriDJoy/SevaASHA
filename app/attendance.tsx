import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function Attendance() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [children, setChildren] = useState<any[]>([]);
    const [filteredChildren, setFilteredChildren] = useState<any[]>([]);
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchChildren();
        }, [workerMobile])
    );

    const fetchChildren = async () => {
        setLoading(true);
        try {
            // Secure query locked to active worker's jurisdiction
            let q;
            if (workerMobile) {
                q = query(collection(db, "household_members"), where("workerId", "==", workerMobile));
            } else {
                q = query(collection(db, "household_members"));
            }

            const snap = await getDocs(q);
            const list = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((c: any) => {
                    const ageInt = parseInt(c.age);
                    return !isNaN(ageInt) && ageInt <= 6;
                });

            // Sort alphabetically for easier roll calls
            list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            setChildren(list);
            setFilteredChildren(list);
        } catch (e) {
            console.error("Attendance Fetch Error:", e);
            Alert.alert("Execution Blocked", "Could not synchronize the pediatrics ledger.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (!text.trim()) {
            setFilteredChildren(children);
            return;
        }
        const lower = text.toLowerCase();
        const filtered = children.filter(c => String(c.name || '').toLowerCase().includes(lower) || String(c.houseId || '').toLowerCase().includes(lower));
        setFilteredChildren(filtered);
    };

    const toggleAttendance = (id: string) => {
        const next = new Set(presentIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setPresentIds(next);
    };

    const toggleSelectAll = () => {
        if (presentIds.size === filteredChildren.length) {
            // Deselect all
            setPresentIds(new Set());
        } else {
            // Select all current filtered
            const allIds = new Set(filteredChildren.map(c => c.id));
            setPresentIds(allIds);
        }
    };

    const saveAttendance = async () => {
        if (presentIds.size === 0) {
            Alert.alert("Empty Ledger", "You must select at least one child to submit attendance.");
            return;
        }

        Alert.alert(
            "Confirm Attendance",
            `Secure attendance records for ${presentIds.size} children today?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Submit Ledger",
                    onPress: async () => {
                        setSaving(true);
                        try {
                            // Extract just the IDs into a standard array for Firestore
                            const finalIds = Array.from(presentIds);
                            
                            await addDoc(collection(db, "daily_attendance"), {
                                date: new Date().toISOString().split('T')[0],
                                workerId: workerMobile,
                                presentCount: finalIds.length,
                                totalEligible: children.length,
                                childIds: finalIds,
                                timestamp: serverTimestamp()
                            });

                            Alert.alert("Success", "Daily attendance ledger safely transmitted to the centralized Admin server.");
                            router.back();
                        } catch (e) {
                            console.error("Attendance Sync Error:", e);
                            Alert.alert("Network Failure", "Failed to transmit attendance records.");
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const renderChildCard = ({ item }: { item: any }) => {
        const isPresent = presentIds.has(item.id);

        return (
            <TouchableOpacity
                style={[styles.itemCard, isPresent && styles.selectedCard]}
                activeOpacity={0.7}
                onPress={() => toggleAttendance(item.id)}
            >
                <View style={[styles.checkboxContainer, isPresent && styles.checkboxActive]}>
                    {isPresent && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.nameText}>{item.name}</Text>
                    <Text style={styles.subText}>House No: {item.houseId || "Unknown"} • Age: {item.age} Yrs</Text>
                </View>

                {isPresent ? (
                    <View style={styles.statusPillActive}>
                        <Text style={styles.statusPillTextActive}>PRESENT</Text>
                    </View>
                ) : (
                    <View style={styles.statusPillIdle}>
                        <Text style={styles.statusPillTextIdle}>ABSENT</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Daily Roll Call</Text>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#F57C00" />
                    <Text style={styles.loadingText}>Synchronizing Roster...</Text>
                </View>
            ) : (
                <>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#999" />
                        <TextInput
                            placeholder="Filter Roll Call by Name or House ID..."
                            placeholderTextColor="#888"
                            style={styles.input}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>

                    {filteredChildren.length > 0 && (
                        <View style={styles.actionRow}>
                            <Text style={styles.summaryText}>{presentIds.size} of {filteredChildren.length} Present</Text>
                            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
                                <Ionicons name="checkmark-done-circle" size={18} color="#F57C00" />
                                <Text style={styles.selectAllText}>
                                    {presentIds.size === filteredChildren.length ? "Deselect All" : "Select All"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <FlatList
                        data={filteredChildren}
                        keyExtractor={item => item.id}
                        renderItem={renderChildCard}
                        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Ionicons name="people-outline" size={60} color="#ccc" />
                                <Text style={styles.empty}>Zero eligible children registered.</Text>
                            </View>
                        }
                    />

                    <View style={styles.bottomBar}>
                        <TouchableOpacity 
                            style={[styles.saveBtn, presentIds.size === 0 && { backgroundColor: '#ccc' }]} 
                            activeOpacity={0.8}
                            onPress={saveAttendance}
                            disabled={presentIds.size === 0 || saving}
                        >
                            {saving ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="cloud-upload" size={20} color="white" style={{ marginRight: 10 }} />
                                    <Text style={styles.saveText}>SUBMIT ATTENDANCE ({presentIds.size})</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#F57C00', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#666', fontWeight: 'bold' },

    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 15, marginBottom: 5, paddingHorizontal: 15, borderRadius: 12, height: 50, elevation: 1, borderWidth: 1, borderColor: '#eee' },
    input: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333' },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10, marginBottom: 5 },
    summaryText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
    selectAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FFE0B2' },
    selectAllText: { color: '#F57C00', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },

    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 18, borderRadius: 12, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#eee' },
    selectedCard: { borderColor: '#F57C00', backgroundColor: '#FFFDF9', borderWidth: 2 },
    
    checkboxContainer: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: '#F57C00', borderColor: '#F57C00' },
    
    nameText: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    subText: { fontSize: 12, color: '#777', marginTop: 3 },

    statusPillIdle: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
    statusPillTextIdle: { fontSize: 10, fontWeight: 'bold', color: '#999' },
    
    statusPillActive: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#C8E6C9' },
    statusPillTextActive: { fontSize: 10, fontWeight: 'bold', color: '#2E7D32' },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderTopColor: '#eee', elevation: 10 },
    saveBtn: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 },
    
    empty: { textAlign: 'center', marginTop: 15, color: '#999', fontStyle: 'italic', fontSize: 15 }
});
