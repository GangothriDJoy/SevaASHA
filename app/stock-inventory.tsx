import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Ensure this path matches your setup

export default function StockInventory() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Add/Edit Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [form, setForm] = useState({ 
        id: '', 
        name: '', 
        category: 'Food', 
        quantity: '', 
        unit: 'kg', 
        batchNumber: '', 
        expiryDate: '' 
    });

    const CATEGORIES = ['Food', 'Medicine', 'Vaccine', 'Supply'];

    useEffect(() => {
        // Fetch inventory ordered alphabetically by name
        const q = query(collection(db, "aww_inventory"), orderBy("name", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setItems(inventoryData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching inventory:", error);
            setLoading(false);
        });
        
        return unsubscribe;
    }, []);

    // Alert Logic for UI Badges
    const getAlerts = (qty: number, expiry: string) => {
        const isLowStock = qty < 10;
        let isExpiring = false;
        let isExpired = false;

        if (expiry) {
            const daysToExpiry = (new Date(expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
            isExpiring = daysToExpiry <= 15 && daysToExpiry > 0;
            isExpired = daysToExpiry <= 0;
        }

        return { isLowStock, isExpiring, isExpired };
    };

    // 🚀 ROBUST SAVE FUNCTION
    const handleSave = async () => {
        // 1. Validation
        if (!form.name || !form.quantity || !form.expiryDate) {
            return Alert.alert("Validation Error", "Name, Quantity, and Expiry Date are required fields.");
        }

        // 2. Parse Quantity safely
        const parsedQty = parseFloat(form.quantity.toString().trim());
        if (isNaN(parsedQty)) {
            return Alert.alert("Validation Error", "Quantity must be a valid number.");
        }

        setIsSubmitting(true);
        try {
            // 3. Prepare clean data object
            const data = {
                name: form.name.trim(),
                category: form.category,
                quantity: parsedQty,
                unit: form.unit.trim(),
                batchNumber: form.batchNumber.trim(),
                expiryDate: form.expiryDate.trim(),
                updatedAt: Date.now()
            };

            // 4. Update or Add to Firestore
            if (form.id) {
                await updateDoc(doc(db, "aww_inventory", form.id), data);
            } else {
                await addDoc(collection(db, "aww_inventory"), data);
            }
            
            // 5. Reset and Close
            setModalVisible(false);
            setForm({ id: '', name: '', category: 'Food', quantity: '', unit: 'kg', batchNumber: '', expiryDate: '' });
            
        } catch (error: any) {
            console.error("FIREBASE SAVE ERROR:", error);
            Alert.alert("Failed to Save", error.message || "Ensure your Firebase security rules allow writes.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert("Delete Item", "Are you sure you want to remove this stock completely?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await deleteDoc(doc(db, "aww_inventory", id));
                    } catch (error) {
                        Alert.alert("Error", "Could not delete item.");
                    }
                } 
            }
        ]);
    };

    const openEditModal = (item: any) => {
        setForm({
            id: item.id,
            name: item.name,
            category: item.category || 'Food',
            quantity: item.quantity.toString(), // Convert back to string for the input field
            unit: item.unit,
            batchNumber: item.batchNumber || '',
            expiryDate: item.expiryDate || ''
        });
        setModalVisible(true);
    };

    const filteredItems = items.filter(i => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Inventory Management</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#00796B" />
                <TextInput 
                    placeholder="Search stock..." 
                    style={styles.searchInput} 
                    value={searchQuery} 
                    onChangeText={setSearchQuery} 
                />
            </View>

            {/* List */}
            {loading ? <ActivityIndicator size="large" color="#00796B" style={{ marginTop: 50 }} /> : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 30 }}>No items in inventory.</Text>}
                    renderItem={({ item }) => {
                        const { isLowStock, isExpiring, isExpired } = getAlerts(item.quantity, item.expiryDate);
                        return (
                            <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => openEditModal(item)}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.itemSub}>{item.category} • Batch: {item.batchNumber || 'N/A'}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 5 }}>
                                        <Ionicons name="trash-outline" size={22} color="#D32F2F" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.cardBody}>
                                    <Text style={styles.quantityText}>{item.quantity} <Text style={styles.unitText}>{item.unit}</Text></Text>
                                    <View style={styles.badgeRow}>
                                        {isLowStock && <View style={[styles.badge, { backgroundColor: '#FFEBEE' }]}><Text style={[styles.badgeText, { color: '#D32F2F' }]}>Low Stock</Text></View>}
                                        {isExpiring && <View style={[styles.badge, { backgroundColor: '#FFF3E0' }]}><Text style={[styles.badgeText, { color: '#E65100' }]}>Expiring Soon</Text></View>}
                                        {isExpired && <View style={[styles.badge, { backgroundColor: '#FFEBEE' }]}><Text style={[styles.badgeText, { color: '#B71C1C' }]}>Expired</Text></View>}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {/* FAB */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => {
                    setForm({ id: '', name: '', category: 'Food', quantity: '', unit: 'kg', batchNumber: '', expiryDate: '' });
                    setModalVisible(true);
                }}
            >
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{form.id ? 'Edit Stock Item' : 'Add New Stock'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color="#666" /></TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Item Name</Text>
                            <TextInput style={styles.input} placeholder="e.g., Rice, Iron Tablets" value={form.name} onChangeText={t => setForm({...form, name: t})} />
                            
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.categoryRow}>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity 
                                        key={cat} 
                                        onPress={() => setForm({...form, category: cat})}
                                        style={[styles.categoryBtn, form.category === cat && styles.categoryBtnActive]}
                                    >
                                        <Text style={[styles.categoryText, form.category === cat && { color: 'white' }]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Quantity</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={form.quantity.toString()} onChangeText={t => setForm({...form, quantity: t})} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Unit</Text>
                                    <TextInput style={styles.input} placeholder="kg, strips, etc." value={form.unit} onChangeText={t => setForm({...form, unit: t})} />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Batch Number (Optional)</Text>
                                    <TextInput style={styles.input} placeholder="B-123" value={form.batchNumber} onChangeText={t => setForm({...form, batchNumber: t})} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Expiry Date</Text>
                                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={form.expiryDate} onChangeText={t => setForm({...form, expiryDate: t})} />
                                </View>
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSubmitting}>
                                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Item</Text>}
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
    container: { flex: 1, backgroundColor: '#F0FDF4' }, // Soft Mint
    header: { backgroundColor: '#00796B', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 15, paddingHorizontal: 15, borderRadius: 12, height: 50, elevation: 2 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    card: { backgroundColor: 'white', padding: 18, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#E0F2F1' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'flex-start' },
    itemName: { fontSize: 18, fontWeight: 'bold', color: '#004D40' },
    itemSub: { fontSize: 13, color: '#666', marginTop: 2 },
    cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    quantityText: { fontSize: 24, fontWeight: '900', color: '#00796B' },
    unitText: { fontSize: 14, fontWeight: '500', color: '#666' },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'flex-end', flex: 1, marginLeft: 10 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: 'bold' },
    fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#00796B', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#004D40' },
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 15 },
    input: { borderWidth: 1, borderColor: '#DDD', padding: 15, borderRadius: 12, fontSize: 16, backgroundColor: '#F9F9F9' },
    
    // Category Buttons
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#00796B', backgroundColor: 'white' },
    categoryBtnActive: { backgroundColor: '#00796B' },
    categoryText: { color: '#00796B', fontWeight: 'bold', fontSize: 13 },

    saveBtn: { backgroundColor: '#00796B', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});