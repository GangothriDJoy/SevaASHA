import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, FlatList, Modal, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, query, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

const ITEMS = [
    { id: "thr", name: "Take Home Ration (THR)", icon: "basket" },
    { id: "snacks", name: "Morning Snacks", icon: "sunny" },
    { id: "hcm", name: "Hot Cooked Meal", icon: "restaurant" },
    { id: "eggs_milk", name: "Eggs/Milk", icon: "beaker" }
];

export default function SupplementRecords() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [loading, setLoading] = useState(true);
    const [dispatching, setDispatching] = useState(false);
    
    // Core Data
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [filteredBens, setFilteredBens] = useState<any[]>([]);
    
    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSupplement, setSelectedSupplement] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Checkbox Set
    const [selectedBens, setSelectedBens] = useState<Set<string>>(new Set());

    // Fetch Target Anganwadi Demographics (Pregnant, Lactating, Children <= 6)
    useFocusEffect(
        useCallback(() => {
            fetchEligibleBeneficiaries();
        }, [])
    );

    const fetchEligibleBeneficiaries = async () => {
        setLoading(true);
        try {
            // Unbound query since Anganwadi logic spans the village pool
            const q = query(collection(db, "household_members"));
            const snap = await getDocs(q);
            
            const list: any[] = [];
            snap.forEach(doc => {
                const data = doc.data();
                const ageNum = parseInt(data.age) || 99;
                
                // Eligibility: Pregnant, Breastfeeding, or Child <= 6 Years Old
                if (data.isPregnant || data.lactating || ageNum <= 6) {
                    list.push({ id: doc.id, ...data });
                }
            });

            setBeneficiaries(list);
            setFilteredBens(list);
        } catch (error) {
            console.error("Supplement Fetch Error:", error);
            Alert.alert("Network Operation Failed", "Could not synchronize the eligible beneficiary matrix.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (!text.trim()) {
            setFilteredBens(beneficiaries);
            return;
        }
        const lower = text.toLowerCase();
        const filtered = beneficiaries.filter(b => 
            String(b.name || "").toLowerCase().includes(lower) || 
            String(b.houseId || "").toLowerCase().includes(lower)
        );
        setFilteredBens(filtered);
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedBens);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedBens(next);
    };

    const openDispatchModal = (item: any) => {
        setSelectedSupplement(item);
        setSelectedBens(new Set()); // Clear previous
        setSearchQuery("");
        setFilteredBens(beneficiaries);
        setModalVisible(true);
    };

    const executeBulkDispatch = async () => {
        if (selectedBens.size === 0) {
            Alert.alert("Execution Blocked", "You must select at least one resident to distribute supplements to.");
            return;
        }

        Alert.alert(
            "Confirm Mass Dispatch",
            `Distribute [${selectedSupplement?.name}] securely to ${selectedBens.size} verified residents?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Execute Dispatch",
                    style: "default",
                    onPress: async () => {
                        setDispatching(true);
                        try {
                            const bulkPromises = Array.from(selectedBens).map(async (patientId) => {
                                const targetPatient = beneficiaries.find(b => b.id === patientId);
                                
                                // 1. Secure centralized log
                                await addDoc(collection(db, "supplement_logs"), {
                                    supplementId: selectedSupplement.id,
                                    supplementName: selectedSupplement.name,
                                    patientId: patientId,
                                    patientName: targetPatient?.name || "Unknown",
                                    workerId: workerMobile,
                                    status: "Delivered",
                                    distributedAt: serverTimestamp()
                                });

                                // 2. Bind directly to their profile for history tracking
                                await addDoc(collection(db, "household_members", patientId, "supplements"), {
                                    supplementName: selectedSupplement.name,
                                    deliveredBy: workerMobile,
                                    distributedAt: serverTimestamp()
                                });
                            });

                            await Promise.all(bulkPromises);
                            Alert.alert("Dispatch Successful", `${selectedSupplement?.name} safely secured into the overarching tracking ledger for ${selectedBens.size} residents.`);
                            
                            setModalVisible(false);
                        } catch (e) {
                            console.error("Bulk Dispatch Error:", e);
                            Alert.alert("Operation Failed", "Could not safely secure all telemetry nodes.");
                        } finally {
                            setDispatching(false);
                            setSelectedBens(new Set());
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Supplement Dispatcher</Text>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#F57C00" />
                    <Text style={{ marginTop: 15, color: '#666', fontWeight: 'bold' }}>Mapping Target Demographics...</Text>
                </View>
            ) : (
                <View style={{ padding: 20 }}>
                    <Text style={styles.helperText}>Select an Anganwadi Supplement vector below to execute mass distribution securely to eligible populations (Pregnant, Lactating, or Children {'<='} 6).</Text>
                    
                    {ITEMS.map((item, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.btn} 
                            activeOpacity={0.7}
                            onPress={() => openDispatchModal(item)}
                        >
                            <View style={[styles.iconRing, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name={item.icon as any} size={24} color="#F57C00" />
                            </View>
                            <Text style={styles.btnText}>{item.name}</Text>
                            <View style={styles.actionPill}>
                                <Text style={styles.actionPillText}>DISPATCH</Text>
                                <Ionicons name="chevron-forward" size={14} color="#F57C00" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* FULL-SCREEN SECURE MULTI-DISPATCH MODAL */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Executing: {selectedSupplement?.name}</Text>
                            <Text style={styles.modalSub}>{selectedBens.size} Target(s) Verified</Text>
                        </View>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close-circle" size={32} color="#aaa" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchSection}>
                        <Ionicons name="search" size={20} color="#999" style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Filter by Resident Name or House ID..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>

                    <FlatList
                        data={filteredBens}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                        ListEmptyComponent={<Text style={styles.emptyText}>Zero eligible residents match criteria.</Text>}
                        renderItem={({ item }) => {
                            const isSelected = selectedBens.has(item.id);
                            const ageNum = parseInt(item.age) || 0;
                            
                            let eligibilityTag = "";
                            let tagColor = "#F57C00";
                            if (item.isPregnant) { eligibilityTag = "🤰 Pregnant"; tagColor = "#D81B60"; }
                            else if (item.lactating) { eligibilityTag = "🍼 Lactating"; tagColor = "#1E88E5"; }
                            else if (ageNum <= 6) { eligibilityTag = `🧒 Child (${item.age} Yrs)`; tagColor = "#00897B"; }

                            return (
                                <TouchableOpacity 
                                    style={[styles.residentCard, isSelected && styles.residentCardActive]}
                                    activeOpacity={0.7}
                                    onPress={() => toggleSelection(item.id)}
                                >
                                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.resName}>{item.name}</Text>
                                        <Text style={styles.resSub}>House: {item.houseId || "Unknown"}</Text>
                                    </View>
                                    <View style={[styles.miniBadge, { backgroundColor: tagColor + '20', borderColor: tagColor + '40' }]}>
                                        <Text style={{ fontSize: 10, color: tagColor, fontWeight: 'bold' }}>{eligibilityTag}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />

                    {/* MASS EXECUTION BUTTON */}
                    <View style={styles.bottomBar}>
                        <TouchableOpacity 
                            style={[styles.executeBtn, selectedBens.size === 0 && { backgroundColor: '#ccc' }]}
                            activeOpacity={0.8}
                            onPress={executeBulkDispatch}
                            disabled={selectedBens.size === 0 || dispatching}
                        >
                            {dispatching ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="cloud-upload" size={20} color="white" style={{marginRight: 10}} />
                                    <Text style={styles.executeText}>CONFIRM BULK DISPATCH ({selectedBens.size})</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#F57C00', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    helperText: { color: '#666', fontSize: 14, marginBottom: 25, lineHeight: 22, fontStyle: 'italic' },
    
    btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 18, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#eee' },
    iconRing: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    btnText: { flex: 1, marginLeft: 15, fontWeight: 'bold', fontSize: 16, color: '#333' },
    actionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FFE0B2' },
    actionPillText: { color: '#F57C00', fontWeight: 'bold', fontSize: 11, marginRight: 2 },

    modalContainer: { flex: 1, backgroundColor: '#F4F6F8' },
    modalHeader: { padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    modalSub: { fontSize: 13, color: '#F57C00', fontWeight: 'bold', marginTop: 3 },
    
    searchSection: { flexDirection: 'row', backgroundColor: 'white', margin: 15, borderRadius: 12, alignItems: 'center', paddingHorizontal: 15, elevation: 1, borderWidth: 1, borderColor: '#ddd' },
    searchInput: { flex: 1, height: 50, fontSize: 15, color: '#333' },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontStyle: 'italic' },

    residentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    residentCardActive: { borderColor: '#F57C00', backgroundColor: '#FFFDF9', borderWidth: 2 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    checkboxActive: { backgroundColor: '#F57C00', borderColor: '#F57C00' },
    resName: { fontWeight: 'bold', fontSize: 15, color: '#333' },
    resSub: { color: '#777', fontSize: 12, marginTop: 2 },
    miniBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderTopColor: '#eee', elevation: 10 },
    executeBtn: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    executeText: { color: 'white', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 }
});
