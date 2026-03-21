import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function GrowthChart() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchGrowthData();
        }, [workerMobile])
    );

    const fetchGrowthData = async () => {
        setLoading(true);
        try {
            // Securely sandbox the fetch to the active worker's jurisdiction
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

            // Sort by age ascending (youngest first require most monitoring)
            list.sort((a, b) => parseInt(a.age) - parseInt(b.age));

            setChildren(list);
        } catch (e) {
            console.error("Growth Fetch Error:", e);
            Alert.alert("Execution Blocked", "Could not synchronize the pediatrics ledger.");
        } finally {
            setLoading(false);
        }
    };

    const getGrowthStatus = (weight: any, age: any) => {
        const w = parseFloat(weight);
        const a = parseInt(age);
        if (!w || isNaN(a)) return { label: "No Vitals Recorded", color: "#999", bg: "#F0F0F0" };

        // Simplified clinical logic mappings
        if (a <= 1 && w < 7) return { label: "Severe Underweight", color: "#D32F2F", bg: "#FFEBEE" };
        if (a > 1 && a <= 3 && w < 10) return { label: "Underweight", color: "#F57C00", bg: "#FFF3E0" };
        if (a > 3 && a <= 6 && w < 14) return { label: "Underweight", color: "#F57C00", bg: "#FFF3E0" };
        if (w > 25) return { label: "Overweight", color: "#1976D2", bg: "#E3F2FD" };
        
        return { label: "Healthy Range", color: "#2E7D32", bg: "#E8F5E9" };
    };

    const filteredChildren = children.filter(c =>
        String(c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.houseId || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderChildGrowth = ({ item }: { item: any }) => {
        const status = getGrowthStatus(item.weight, item.age);
        const isCritical = status.label.includes("Severe") || status.label.includes("Underweight");

        return (
            <TouchableOpacity
                style={[styles.card, isCritical && styles.criticalCard]}
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
                    <View style={[styles.avatar, isCritical && { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons name="body" size={24} color={isCritical ? "#D32F2F" : "#1F7A6B"} />
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.subText}>Age: {item.age} Yrs • House: {item.houseId || "Untracked"}</Text>
                        
                        <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.color }]}>
                            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.weightBox}>
                        <Text style={[styles.weightNum, isCritical && { color: '#D32F2F' }]}>{item.weight ? `${item.weight}` : '--'}</Text>
                        <Text style={styles.weightKg}>kg</Text>
                    </View>
                </View>

                {/* Simulated Clinical Growth Progress Bar */}
                {item.weight && (
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, {
                            width: `${Math.min((parseFloat(item.weight) / 30) * 100, 100)}%`,
                            backgroundColor: status.color
                        }]} />
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
                <Text style={styles.headerText}>Growth Diagnostics</Text>
            </View>

            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                    placeholder="Search Child Details or House ID..."
                    placeholderTextColor="#888"
                    style={styles.input}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.legendBlock}>
                <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#2E7D32'}]} /><Text style={styles.legendText}>Healthy</Text></View>
                <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#F57C00'}]} /><Text style={styles.legendText}>Underweight</Text></View>
                <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#D32F2F'}]} /><Text style={styles.legendText}>Severe</Text></View>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={{ marginTop: 15, color: '#666', fontWeight: 'bold' }}>Mapping Pediatrics Ledger...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredChildren}
                    keyExtractor={item => item.id}
                    renderItem={renderChildGrowth}
                    contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Ionicons name="body-outline" size={60} color="#ccc" />
                            <Text style={styles.empty}>Zero children mapping to this demographic.</Text>
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
    
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 15, marginBottom: 5, paddingHorizontal: 15, borderRadius: 12, height: 55, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#333' },
    
    legendBlock: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#F4F6F8', gap: 15 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { fontSize: 12, fontWeight: 'bold', color: '#555' },

    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    card: { backgroundColor: 'white', padding: 18, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    criticalCard: { borderLeftWidth: 5, borderLeftColor: '#F57C00' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: 15 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    subText: { fontSize: 13, color: '#666', marginTop: 3 },
    
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, marginTop: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold' },

    weightBox: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 10 },
    weightNum: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    weightKg: { fontSize: 11, color: '#888', fontWeight: 'bold', marginTop: -2 },

    progressBarBg: { height: 8, backgroundColor: '#EEEEEE', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    
    empty: { textAlign: 'center', marginTop: 15, color: '#999', fontStyle: 'italic', fontSize: 15 }
});
