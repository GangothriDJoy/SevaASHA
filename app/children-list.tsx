import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet, Modal, ScrollView } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ChildrenList() {
    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal State
    const [selectedChild, setSelectedChild] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    
    const router = useRouter();

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const snap = await getDocs(collection(db, "household_members"));
                const list: any[] = [];

                snap.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    const age = parseInt(data.age || '0', 10);
                    
                    const isMom = data.isPregnant === true || 
                                  data.isPregnant === "true" || 
                                  data.isPregnant === "Yes" || 
                                  data.status === "Pregnant" || 
                                  data.status === "Postnatal";

                    if (!isNaN(age) && age <= 6 && !isMom) {
                        list.push({ id: docSnap.id, ...data });
                    }
                });

                setChildren(list);
            } catch (error) {
                console.error("Error fetching children:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchChildren();
    }, []);

    const filtered = children.filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    // Open Modal with Child Data
    const openChildDetails = (child: any) => {
        setSelectedChild(child);
        setModalVisible(true);
    };

    // Calculate Nutritional Status for the Modal
    const getNutriStatus = (age: number, weight: number) => {
        if (!weight || weight === 0) return { label: "Data Missing", color: "#9E9E9E" };
        if (age <= 1 && weight < 7) return { label: "Severe Underweight", color: "#D32F2F" };
        if (age > 1 && age <= 6 && weight < 10) return { label: "Underweight", color: "#F57C00" };
        return { label: "Healthy", color: "#388E3C" };
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Enrolled Children (0-6 yrs)</Text>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput 
                    placeholder="Search by child's name..." 
                    style={styles.searchInput} 
                    value={searchQuery} 
                    onChangeText={setSearchQuery} 
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No children found in database.</Text>}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.card} 
                            activeOpacity={0.7} 
                            onPress={() => openChildDetails(item)}
                        >
                            <View style={styles.avatar}>
                                <Ionicons name="happy" size={26} color="#2E7D32" />
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.nameText}>{item.name}</Text>
                                <Text style={styles.subText}>Age: {item.age} yrs • Weight: {item.weight || '--'} kg</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#CCC" />
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* --- CHILD DETAILS MODAL --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedChild && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={styles.modalAvatar}>
                                            <Ionicons name="happy" size={30} color="#2E7D32" />
                                        </View>
                                        <Text style={styles.modalTitle}>{selectedChild.name}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                        <Ionicons name="close" size={28} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    
                                    {/* Nutri-Status Badge */}
                                    <View style={styles.statusBadgeContainer}>
                                        <Text style={styles.detailLabel}>Nutritional Status</Text>
                                        <View style={[styles.badge, { backgroundColor: getNutriStatus(parseInt(selectedChild.age), parseFloat(selectedChild.weight)).color }]}>
                                            <Text style={styles.badgeText}>
                                                {getNutriStatus(parseInt(selectedChild.age), parseFloat(selectedChild.weight)).label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Details Grid */}
                                    <View style={styles.detailRow}>
                                        <Ionicons name="calendar-outline" size={20} color="#2E7D32" />
                                        <Text style={styles.detailLabel}>Age:</Text>
                                        <Text style={styles.detailValue}>{selectedChild.age} years</Text>
                                    </View>
                                    
                                    <View style={styles.detailRow}>
                                        <Ionicons name="scale-outline" size={20} color="#2E7D32" />
                                        <Text style={styles.detailLabel}>Weight:</Text>
                                        <Text style={styles.detailValue}>{selectedChild.weight ? `${selectedChild.weight} kg` : 'Not recorded'}</Text>
                                    </View>
                                    
                                    <View style={styles.detailRow}>
                                        <Ionicons name="male-female-outline" size={20} color="#2E7D32" />
                                        <Text style={styles.detailLabel}>Gender:</Text>
                                        <Text style={styles.detailValue}>{selectedChild.gender || 'Not specified'}</Text>
                                    </View>
                                    
                                    <View style={styles.detailRow}>
                                        <Ionicons name="home-outline" size={20} color="#2E7D32" />
                                        <Text style={styles.detailLabel}>House ID:</Text>
                                        <Text style={styles.detailValue}>{selectedChild.houseId || 'N/A'}</Text>
                                    </View>

                                    {/* Additional Data fallback */}
                                    {selectedChild.guardianName && (
                                        <View style={styles.detailRow}>
                                            <Ionicons name="people-outline" size={20} color="#2E7D32" />
                                            <Text style={styles.detailLabel}>Guardian:</Text>
                                            <Text style={styles.detailValue}>{selectedChild.guardianName}</Text>
                                        </View>
                                    )}

                                </ScrollView>
                                
                                {/* Modal Actions */}
                                <TouchableOpacity 
                                    style={styles.actionBtn} 
                                    onPress={() => {
                                        setModalVisible(false);
                                        router.push({ pathname: "/growth-chart", params: { mobile: selectedChild.workerId } });
                                    }}
                                >
                                    <Text style={styles.actionBtnText}>Update Growth Chart</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#2E7D32', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    backBtn: { paddingRight: 15 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 15, paddingHorizontal: 15, borderRadius: 10, height: 50, elevation: 1 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1, marginLeft: 15 },
    nameText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 13, color: '#666', marginTop: 3 },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 15 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, minHeight: '50%', maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 15 },
    modalAvatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    closeBtn: { padding: 5 },
    
    statusBadgeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, marginBottom: 20 },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    
    detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    detailLabel: { fontSize: 15, color: '#666', marginLeft: 10, width: 100, fontWeight: '600' },
    detailValue: { fontSize: 16, color: '#333', fontWeight: 'bold', flex: 1 },

    actionBtn: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    actionBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});