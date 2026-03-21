import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MedicineStock() {
    const router = useRouter();

    const StockItem = ({ name, qty, total, status }: any) => {
        const isLow = status === 'Low';
        const progress = qty / total;

        const handleRestock = () => {
            Alert.alert("Restock Alert Sent", `A restock request for ${name} has been sent to the pharmacy.`);
        };

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{name}</Text>
                    <View style={[styles.badge, { backgroundColor: isLow ? '#FFEBEE' : '#E8F5E9' }]}>
                        <Text style={[styles.badgeText, { color: isLow ? '#E53935' : '#4CAF50' }]}>{status}</Text>
                    </View>
                </View>
                
                <View style={styles.cardBody}>
                    <Text style={styles.qtyText}>{qty} / {total} Units</Text>
                    <TouchableOpacity style={styles.restockBtn} onPress={handleRestock} activeOpacity={0.7}>
                        <Ionicons name="send" size={12} color="#FFF" />
                        <Text style={styles.restockBtnText}>Restock Alert</Text>
                    </TouchableOpacity>
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
                
                <StockItem name="IFA Tablets (Iron)" qty={120} total={500} status="Low" />
                <StockItem name="Calcium Supplements" qty={340} total={400} status="Good" />
                <StockItem name="Paracetamol 500mg" qty={80} total={100} status="Good" />
                <StockItem name="ORS Packets" qty={15} total={200} status="Low" />
                <StockItem name="Pregnancy Test Kits" qty={45} total={50} status="Good" />

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0288D1' }, // Premium Blue
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
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
    restockBtn: { flexDirection: 'row', backgroundColor: '#F39C12', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', elevation: 1 },
    restockBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginLeft: 6 },
    progressTrack: { height: 8, backgroundColor: '#EEE', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 }
});
