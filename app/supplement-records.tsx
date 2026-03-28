import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, Alert, StyleSheet, SafeAreaView, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, orderBy, runTransaction, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function SupplementRecords() {
    const router = useRouter();
    const [records, setRecords] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Add Distribution Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ 
        beneficiaryName: '', 
        category: 'Child', 
        inventoryItemId: '', 
        itemName: '', 
        quantity: '', 
        unit: '', 
        remarks: '' 
    });

    const CATEGORIES = ['Child', 'Pregnant Woman', 'Lactating Mother'];

    useEffect(() => {
        // 1. Fetch Nutrition History
        const qRecords = query(collection(db, "nutrition_records"), orderBy("createdAt", "desc"));
        const unsubRecords = onSnapshot(qRecords, (snap) => {
            setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 2. Fetch Available Inventory (Only items with stock > 0)
        const qInventory = query(collection(db, "aww_inventory"), orderBy("name", "asc"));
        const unsubInventory = onSnapshot(qInventory, (snap) => {
            setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((i: any) => i.quantity > 0)); 
        });

        // 3. Fetch Beneficiaries (Household Members)
        const unsubMembers = onSnapshot(collection(db, "household_members"), (snap) => {
            setBeneficiaries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => { unsubRecords(); unsubInventory(); unsubMembers(); };
    }, []);

    // Helper function to filter beneficiaries based on the selected category
    const getEligibleBeneficiaries = () => {
        return beneficiaries.filter(b => {
            const age = parseInt(b.age || '0', 10);
            const isPregnant = b.isPregnant === true || b.isPregnant === "true" || b.isPregnant === "Yes" || b.status === "Pregnant";
            const isLactating = b.status === "Postnatal";

            if (form.category === 'Child') {
                return !isPregnant && !isLactating && !isNaN(age) && age <= 6;
            }
            if (form.category === 'Pregnant Woman') {
                return isPregnant;
            }
            if (form.category === 'Lactating Mother') {
                return isLactating;
            }
            return false;
        });
    };

    const filteredBeneficiaries = getEligibleBeneficiaries();

    // 🚀 Auto-Deduct Inventory via Transaction
    const handleDistribute = async () => {
        if (!form.beneficiaryName || !form.inventoryItemId || !form.quantity) {
            return Alert.alert("Validation", "Please select a beneficiary, an inventory item, and enter a quantity.");
        }

        const parsedQty = parseFloat(form.quantity.toString().trim());
        if (isNaN(parsedQty)) {
            return Alert.alert("Validation", "Quantity must be a valid number.");
        }

        setIsSubmitting(true);

        try {
            await runTransaction(db, async (transaction) => {
                const invRef = doc(db, "aww_inventory", form.inventoryItemId);
                const invDoc = await transaction.get(invRef);

                if (!invDoc.exists()) throw new Error("Inventory item does not exist.");
                
                const currentStock = invDoc.data().quantity;
                if (currentStock < parsedQty) {
                    throw new Error(`Insufficient stock! Only ${currentStock} ${form.unit} available.`);
                }

                // 1. Deduct Stock
                transaction.update(invRef, { quantity: currentStock - parsedQty, updatedAt: Date.now() });

                // 2. Create Nutrition Record
                const newRecordRef = doc(collection(db, "nutrition_records"));
                transaction.set(newRecordRef, {
                    beneficiaryName: form.beneficiaryName,
                    category: form.category,
                    inventoryItemId: form.inventoryItemId,
                    itemName: form.itemName,
                    quantity: parsedQty,
                    unit: form.unit,
                    remarks: form.remarks,
                    date: new Date().toISOString().split('T')[0],
                    createdAt: Date.now()
                });
            });

            Alert.alert("Success", "Distribution logged and inventory updated!");
            setModalVisible(false);
            setForm({ beneficiaryName: '', category: 'Child', inventoryItemId: '', itemName: '', quantity: '', unit: '', remarks: '' });
        } catch (error: any) {
            Alert.alert("Transaction Failed", error.message);
        }
        setIsSubmitting(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nutrition Distribution</Text>
            </View>

            {loading ? <ActivityIndicator size="large" color="#D81B60" style={{ marginTop: 50 }} /> : (
                <FlatList
                    data={records}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No distribution records found.</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.beneficiaryName}>{item.beneficiaryName}</Text>
                                <Text style={styles.dateText}>{item.date}</Text>
                            </View>
                            <Text style={styles.categoryText}>{item.category}</Text>
                            <View style={styles.foodBox}>
                                <Ionicons name="restaurant" size={20} color="#D81B60" style={{ marginRight: 10 }} />
                                <Text style={styles.foodText}>Provided: <Text style={{ fontWeight: 'bold' }}>{item.quantity} {item.unit}</Text> of {item.itemName}</Text>
                            </View>
                        </View>
                    )}
                />
            )}

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => {
                    setForm({ beneficiaryName: '', category: 'Child', inventoryItemId: '', itemName: '', quantity: '', unit: '', remarks: '' });
                    setModalVisible(true);
                }}
            >
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            {/* Distribute Nutrition Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Log Distribution</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color="#666" /></TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            
                            {/* 1. Select Category First */}
                            <Text style={styles.label}>Beneficiary Category</Text>
                            <View style={styles.categoryRow}>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity 
                                        key={cat} 
                                        onPress={() => {
                                            // Reset beneficiary name when changing categories
                                            setForm({...form, category: cat, beneficiaryName: ''});
                                        }}
                                        style={[styles.categoryBtn, form.category === cat && styles.categoryBtnActive]}
                                    >
                                        <Text style={[styles.categoryText, form.category === cat && { color: 'white' }]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* 2. Select Beneficiary (Dynamically Filtered) */}
                            <Text style={styles.label}>Select Beneficiary</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                {filteredBeneficiaries.length === 0 ? (
                                    <Text style={{ color: '#D32F2F', fontStyle: 'italic', paddingVertical: 10 }}>No registered {form.category.toLowerCase()}s found.</Text>
                                ) : (
                                    filteredBeneficiaries.map(ben => (
                                        <TouchableOpacity 
                                            key={ben.id} 
                                            onPress={() => setForm({...form, beneficiaryName: ben.name})}
                                            style={[styles.chipItem, form.beneficiaryName === ben.name && styles.chipItemSelected]}
                                        >
                                            <Ionicons name={form.category === 'Child' ? "happy" : "woman"} size={16} color={form.beneficiaryName === ben.name ? "white" : "#D81B60"} style={{ marginRight: 5 }} />
                                            <Text style={[styles.chipText, form.beneficiaryName === ben.name && { color: 'white' }]}>{ben.name}</Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>

                            {/* 3. Select Inventory Item */}
                            <Text style={styles.label}>Select Item from Inventory</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                {inventory.length === 0 ? (
                                    <Text style={{ color: '#D32F2F', fontStyle: 'italic', paddingVertical: 10 }}>No stock available in inventory!</Text>
                                ) : (
                                    inventory.map(item => (
                                        <TouchableOpacity 
                                            key={item.id} 
                                            onPress={() => setForm({...form, inventoryItemId: item.id, itemName: item.name, unit: item.unit})}
                                            style={[styles.invItem, form.inventoryItemId === item.id && styles.invItemSelected]}
                                        >
                                            <Text style={[styles.invText, form.inventoryItemId === item.id && { color: 'white' }]}>{item.name}</Text>
                                            <Text style={[styles.invStock, form.inventoryItemId === item.id && { color: '#FFCDD2' }]}>Stock: {item.quantity} {item.unit}</Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>

                            {/* 4. Quantity */}
                            <Text style={styles.label}>Quantity to Give</Text>
                            <TextInput 
                                style={styles.input} 
                                keyboardType="numeric" 
                                placeholder={`0 (${form.unit || 'units'})`} 
                                value={form.quantity.toString()} 
                                onChangeText={t => setForm({...form, quantity: t})} 
                            />

                            <TouchableOpacity 
                                style={[styles.saveBtn, (!form.inventoryItemId || !form.beneficiaryName) && { backgroundColor: '#CCC' }]} 
                                onPress={handleDistribute} 
                                disabled={isSubmitting || !form.inventoryItemId || !form.beneficiaryName}
                            >
                                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Confirm & Deduct Stock</Text>}
                            </TouchableOpacity>
                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF0F5' }, // Soft Pink
    header: { backgroundColor: '#D81B60', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    card: { backgroundColor: 'white', padding: 18, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#FCE4EC' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    beneficiaryName: { fontSize: 18, fontWeight: 'bold', color: '#880E4F' },
    dateText: { fontSize: 12, color: '#888' },
    categoryText: { fontSize: 13, color: '#D81B60', fontWeight: '600', marginTop: 2 },
    foodBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FCE4EC', padding: 12, borderRadius: 10, marginTop: 12 },
    foodText: { fontSize: 14, color: '#880E4F' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 15 },
    fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#D81B60', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#880E4F' },
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 15 },
    input: { borderWidth: 1, borderColor: '#DDD', padding: 15, borderRadius: 12, fontSize: 16, backgroundColor: '#F9F9F9' },
    
    // Selectors
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#D81B60', backgroundColor: 'white' },
    categoryBtnActive: { backgroundColor: '#D81B60' },
    categoryText: { color: '#D81B60', fontWeight: 'bold', fontSize: 13 },

    horizontalScroll: { flexDirection: 'row', marginTop: 5, paddingBottom: 5 },
    
    chipItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#D81B60', backgroundColor: 'white', marginRight: 10 },
    chipItemSelected: { backgroundColor: '#D81B60' },
    chipText: { fontWeight: 'bold', color: '#D81B60' },

    invItem: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D81B60', backgroundColor: 'white', marginRight: 10, minWidth: 120 },
    invItemSelected: { backgroundColor: '#D81B60' },
    invText: { fontWeight: 'bold', color: '#D81B60', fontSize: 15 },
    invStock: { fontSize: 12, color: '#666', marginTop: 4 },
    
    saveBtn: { backgroundColor: '#D81B60', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});