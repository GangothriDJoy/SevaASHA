import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, orderBy, addDoc, serverTimestamp, getDocs, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function MedicineStock() {
    const router = useRouter();
    const { role } = useLocalSearchParams();
    const userRole = String(role || "Supervisor").trim();
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Dispense States
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [searchBen, setSearchBen] = useState('');
    const [isDispenseModal, setIsDispenseModal] = useState(false);
    const [selectedMed, setSelectedMed] = useState<any>(null);
    const [selectedBens, setSelectedBens] = useState<Set<string>>(new Set());

    useEffect(() => {
        const q = query(collection(db, "medicine_inventory"), orderBy("name"));
        const unsub = onSnapshot(q, async (snapshot) => {
            const MASTER_MEDICINES = [
                { id: "ifa_tablets", name: "IFA Tablets (Iron)", qty: 120, total: 500, status: "Low", alertSent: false },
                { id: "calcium", name: "Calcium Supplements", qty: 340, total: 400, status: "Good", alertSent: false },
                { id: "paracetamol", name: "Paracetamol 500mg", qty: 80, total: 100, status: "Good", alertSent: false },
                { id: "ors", name: "ORS Packets", qty: 15, total: 200, status: "Low", alertSent: false },
                { id: "preg_test", name: "Pregnancy Test Kits", qty: 45, total: 50, status: "Good", alertSent: false },
                { id: "albendazole", name: "Albendazole 400mg", qty: 0, total: 300, status: "Low", alertSent: false },
                { id: "zinc_tablets", name: "Zinc Tablets", qty: 0, total: 200, status: "Low", alertSent: false },
                { id: "folic_acid", name: "Folic Acid Tablets", qty: 0, total: 400, status: "Low", alertSent: false },
                { id: "amoxicillin", name: "Amoxicillin Syrup", qty: 0, total: 100, status: "Low", alertSent: false },
                { id: "vitamin_a", name: "Vitamin A Syrup", qty: 0, total: 50, status: "Low", alertSent: false },
                { id: "rapid_malaria", name: "Rapid Malaria Kits", qty: 0, total: 30, status: "Low", alertSent: false },
                { id: "condoms", name: "Condoms (Nirodh)", qty: 0, total: 1000, status: "Low", alertSent: false },
                { id: "ocp", name: "Oral Contraceptive Pills", qty: 0, total: 250, status: "Low", alertSent: false },
                { id: "sanitary_pads", name: "Sanitary Napkins", qty: 0, total: 500, status: "Low", alertSent: false },
                { id: "chloroquine", name: "Chloroquine Tablets", qty: 0, total: 100, status: "Low", alertSent: false }
            ];

            const existingIds = new Set(snapshot.docs.map(d => d.id));
            const missing = MASTER_MEDICINES.filter(m => !existingIds.has(m.id));
            
            for (const item of missing) {
                await setDoc(doc(db, "medicine_inventory", item.id), item);
            }

            const fetched: any[] = [];
            snapshot.forEach(d => { 
                const data = d.data();
                fetched.push({ id: d.id, ...data, qty: data.qty ?? 0 }); 
            });
            
            setInventory(fetched);
            setLoading(false);
        });

        if (userRole === "ASHA Worker") {
            const fetchBens = async () => {
                const benQ = query(collection(db, "beneficiaries"));
                const snap = await getDocs(benQ);
                const list: any[] = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                setBeneficiaries(list);
            };
            fetchBens();
        }

        return unsub;
    }, [userRole]);

    const confirmMultiDispense = async () => {
        if (selectedBens.size === 0 || !selectedMed) return;
        setLoading(true);
        setIsDispenseModal(false); // Drop the modal

        try {
            const medRef = doc(db, "medicine_inventory", selectedMed.id);
            const medSnap = await getDoc(medRef);
            if (medSnap.exists()) {
                const currentQty = Number(medSnap.data().qty) || 0;
                await updateDoc(medRef, { qty: Math.max(0, currentQty - selectedBens.size) });
            }

            for (const benId of selectedBens) {
                const ben = beneficiaries.find(b => b.id === benId);
                if (ben) {
                    try {
                        await updateDoc(doc(db, "beneficiaries", ben.id), {
                            dispensedMeds: arrayUnion({
                                medicineId: selectedMed.id,
                                name: selectedMed.name,
                                dispensedDate: new Date().toISOString()
                            })
                        });
                    } catch (benErr) {
                        console.log("Could not write array back to Beneficiary:", benErr);
                    }

                    await addDoc(collection(db, "dispense_logs"), {
                        medicineId: selectedMed.id,
                        medicineName: selectedMed.name,
                        beneficiaryId: ben.id,
                        beneficiaryName: ben.firstName + ' ' + (ben.lastName || ''),
                        dispensedAt: serverTimestamp()
                    });
                }
            }
            
            setTimeout(() => {
                Alert.alert("Success", `Assigned ${selectedMed.name} to ${selectedBens.size} beneficiaries.`);
            }, 300);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to dispense medicine.");
        } finally {
            setSelectedMed(null);
            setSelectedBens(new Set());
            setLoading(false);
        }
    };

    const StockItem = ({ item }: { item: any }) => {
        const safeQty = typeof item.qty === 'number' && !isNaN(item.qty) ? item.qty : 0;
        const total = item.total || 100;
        const isLow = safeQty === 0 || item.status === 'Low' || (safeQty / total) < 0.3;
        const progress = Math.min(safeQty / total, 1);
        const isAsha = userRole === "ASHA Worker";
        
        const handleRestock = async () => {
            if (isAsha) {
                if (!item.alertSent) return;
                // FULFILL RESTOCK LOGIC FOR ASHA
                try {
                    await updateDoc(doc(db, "medicine_inventory", item.id), { 
                        alertSent: false,
                        qty: item.total,
                        status: "Good"
                    });
                    
                    await addDoc(collection(db, "notifications"), {
                        title: "Medicine Restocked!",
                        message: `The pharmacy has successfully restocked ${item.name} to full capacity.`,
                        type: "success",
                        status: "unread",
                        createdAt: serverTimestamp(),
                        targetRole: "Supervisor"
                    });

                    Alert.alert("Restock Completed", `${item.name} inventory has been restored to ${item.total} units.`);
                } catch (e) {
                    console.error("Failed to fulfill restock: ", e);
                }
                return;
            }

            // TRIGGER RESTOCK ALERT LOGIC FOR SUPERVISOR
            if (item.alertSent) return;
            try {
                await updateDoc(doc(db, "medicine_inventory", item.id), { alertSent: true });
                
                await addDoc(collection(db, "notifications"), {
                    title: "Restock Requested",
                    message: `An urgent restock request for ${item.name} has been submitted.`,
                    type: "inventory_alert",
                    status: "unread",
                    createdAt: serverTimestamp(),
                    targetRole: "ASHA Worker"
                });

                Alert.alert("Restock Alert Sent", `A restock request for ${item.name} has been deployed.`);
            } catch (e) {
                console.error("Failed to send restock alert: ", e);
            }
        };

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: isLow ? '#FFEBEE' : '#E8F5E9' }]}>
                        <Text style={[styles.badgeText, { color: isLow ? '#E53935' : '#4CAF50' }]}>
                            {isLow ? 'Low' : 'Good'}
                        </Text>
                    </View>
                </View>
                
                <View style={styles.cardBody}>
                    <Text style={styles.qtyText}>{item.qty} / {item.total} Units</Text>
                    
                    {/* ASHA Action Buttons Array */}
                    {isAsha && (
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <TouchableOpacity 
                                style={[styles.restockBtn, { backgroundColor: safeQty > 0 ? '#1976D2' : '#B0BEC5' }]} 
                                onPress={() => { setSelectedMed(item); setIsDispenseModal(true); }}
                                disabled={safeQty <= 0}
                            >
                                <Ionicons name="medical" size={14} color="#FFF" />
                                <Text style={styles.restockBtnText}>Dispense</Text>
                            </TouchableOpacity>

                            {item.alertSent && (
                                <TouchableOpacity 
                                    style={[styles.restockBtn, { backgroundColor: '#4CAF50' }]} 
                                    onPress={handleRestock} 
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                                    <Text style={styles.restockBtnText}>Restocked</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Supervisor View */}
                    {!isAsha && (item.qty < item.total || item.alertSent) && (
                        <TouchableOpacity 
                            style={[styles.restockBtn, item.alertSent ? { backgroundColor: '#4CAF50' } : null]} 
                            onPress={item.alertSent ? undefined : handleRestock} 
                            activeOpacity={0.7}
                            disabled={item.alertSent}
                        >
                            <Ionicons name={item.alertSent ? "checkmark-circle" : "send"} size={14} color="#FFF" />
                            <Text style={styles.restockBtnText}>{item.alertSent ? "Alert Sent" : "Restock Alert"}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: isLow ? '#E53935' : '#4CAF50' }]} />
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Medicine Inventory</Text>
            </View>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Current Stock Levels</Text>
                
                {loading ? (
                    <ActivityIndicator size="large" color="#0288D1" style={{ marginTop: 50 }} />
                ) : (
                    inventory.map(item => (
                        <StockItem key={item.id} item={item} />
                    ))
                )}

            </ScrollView>

            {/* Dispense Patient Select Modal */}
            <Modal visible={isDispenseModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Dispense {selectedMed?.name}</Text>
                            <TouchableOpacity onPress={() => { setIsDispenseModal(false); setSelectedMed(null); }}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#999" />
                            <TextInput 
                                placeholder="Search Beneficiary Name..." 
                                placeholderTextColor="#666"
                                style={styles.searchInput} 
                                value={searchBen} onChangeText={setSearchBen} 
                            />
                        </View>

                        <Text style={styles.subtext}>Select a patient to assign 1 unit of medicine.</Text>

                        <FlatList
                            data={beneficiaries.filter(b => (b.firstName || '').toLowerCase().includes(searchBen.toLowerCase()) || (b.userMobile || '').includes(searchBen))}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => {
                                const isSelected = selectedBens.has(item.id);
                                return (
                                    <TouchableOpacity 
                                        style={[styles.benCard, isSelected && { backgroundColor: '#E8F5E9' }]} 
                                        onPress={() => {
                                            const newSet = new Set(selectedBens);
                                            if (isSelected) newSet.delete(item.id);
                                            else newSet.add(item.id);
                                            setSelectedBens(newSet);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.benName}>{item.firstName} {item.lastName}</Text>
                                            <Text style={styles.benDetails}>{item.role} • {item.userMobile}</Text>
                                        </View>
                                        <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#4CAF50" : "#CCC"} />
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No patients found.</Text>}
                        />
                        
                        <TouchableOpacity 
                            style={[styles.restockBtn, { backgroundColor: selectedBens.size > 0 ? '#1976D2' : '#B0BEC5', padding: 15, justifyContent: 'center', marginTop: 15, borderRadius: 12 }]}
                            disabled={selectedBens.size === 0}
                            onPress={confirmMultiDispense}
                        >
                            <Ionicons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={[styles.restockBtnText, { fontSize: 16 }]}>Dispense to {selectedBens.size} Patients</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0288D1' }, // Premium Blue
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    container: { padding: 20, backgroundColor: '#F4F7FB', borderTopLeftRadius: 30, borderTopRightRadius: 30, flexGrow: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    
    card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    itemName: { fontSize: 16, fontWeight: 'bold', color: '#112A46' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    qtyText: { fontSize: 13, color: '#666' },
    restockBtn: { flexDirection: 'row', backgroundColor: '#F39C12', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, alignItems: 'center', elevation: 1 },
    restockBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
    progressTrack: { height: 8, backgroundColor: '#EEE', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: '75%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', padding: 10, borderRadius: 10, marginBottom: 10 },
    searchInput: { flex: 1, marginLeft: 10, color: '#333' },
    subtext: { color: '#666', fontSize: 13, marginBottom: 15 },
    benCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    benName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    benDetails: { fontSize: 13, color: '#666', marginTop: 2 }
});
