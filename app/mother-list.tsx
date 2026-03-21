import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function MotherList() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [mothers, setMothers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchMothers();
        }, [workerMobile])
    );

    const fetchMothers = async () => {
        setLoading(true);
        try {
            // Secure fetch bridging directly to the active ASHA worker
            let q;
            if (workerMobile) {
                q = query(collection(db, "household_members"), where("workerId", "==", workerMobile));
            } else {
                q = query(collection(db, "household_members"));
            }

            const snap = await getDocs(q);
            
            // Logic: Filter for members marked as pregnant OR females in reproductive age who recently gave birth
            const list = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((m: any) => m.isPregnant === true || m.isPregnant === "true" || m.status === "Postnatal");

            setMothers(list);
        } catch (e) {
            console.error("Mother Fetch Error:", e);
            Alert.alert("Execution Blocked", "Could not retrieve the Maternal Registry.");
        } finally {
            setLoading(false);
        }
    };

    const filteredMothers = mothers.filter(m =>
        String(m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(m.houseId || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderMotherCard = ({ item }: { item: any }) => {
        const chronicList = item.chronicConditions || [];
        const hasPriorityChronic = chronicList.includes("Diabetes") || chronicList.includes("Hypertension") || chronicList.includes("Thyroid");
        const statusLbl = (item.isPregnant === true || item.isPregnant === "true") ? "Awaiting Delivery" : "Postnatal Recovery";

        return (
            <TouchableOpacity
                style={[styles.card, hasPriorityChronic && styles.chronicCard]}
                activeOpacity={0.7}
                onPress={() => router.push({ 
                    pathname: "/patient-details", 
                    params: { 
                        ...item,
                        isPregnant: String(item.isPregnant || false),
                        isBedridden: String(item.isBedridden || false),
                        chronicConditions: Array.isArray(item.chronicConditions) ? item.chronicConditions.join(", ") : item.chronicConditions
                    } 
                })}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.avatar, hasPriorityChronic && { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons name="woman" size={24} color={hasPriorityChronic ? "#D32F2F" : "#1F7A6B"} />
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.subText}>House No: {item.houseId || "Untracked"}</Text>
                        
                        <View style={styles.badgeRow}>
                            <View style={styles.miniBadge}>
                                <Text style={styles.badgeText}>{statusLbl}</Text>
                            </View>
                            {hasPriorityChronic && (
                                <View style={[styles.miniBadge, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}>
                                    <Text style={[styles.badgeText, { color: '#D32F2F' }]}>⚠️ HIGH RISK</Text>
                                </View>
                            )}
                            {item.lmpDate && (
                                <View style={[styles.miniBadge, { backgroundColor: '#F3E5F5', borderColor: '#E1BEE7' }]}>
                                    <Text style={[styles.badgeText, { color: '#7B1FA2' }]}>LMP: {item.lmpDate}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Maternal Registry</Text>
            </View>

            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                    placeholder="Search by Mother's Name or House ID..."
                    placeholderTextColor="#888"
                    style={styles.input}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={{ marginTop: 15, color: '#666', fontWeight: 'bold' }}>Scanning Demographics...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredMothers}
                    keyExtractor={item => item.id}
                    renderItem={renderMotherCard}
                    contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Ionicons name="folder-open-outline" size={60} color="#ccc" />
                            <Text style={styles.empty}>Zero maternal records found in your jurisdiction.</Text>
                        </View>
                    }
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerText: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
    
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 15, paddingHorizontal: 15, borderRadius: 12, height: 55, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#333' },
    
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    card: { backgroundColor: 'white', padding: 18, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    chronicCard: { borderLeftWidth: 5, borderLeftColor: '#D32F2F' },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: 15 },
    name: { fontSize: 17, fontWeight: 'bold', color: '#222' },
    subText: { fontSize: 13, color: '#666', marginTop: 3 },
    
    badgeRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap', gap: 6 },
    miniBadge: { backgroundColor: '#F0F4F3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E0EAE8' },
    badgeText: { fontSize: 10, color: '#1F7A6B', fontWeight: 'bold' },

    empty: { textAlign: 'center', marginTop: 15, color: '#999', fontStyle: 'italic', fontSize: 15 }
});
