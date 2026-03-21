import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function AreaMaps() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [wards, setWards] = useState<any[]>([]);

    useEffect(() => {
        const fetchWards = async () => {
            try {
                const q = query(collection(db, "users"), where("role", "==", "ASHA Worker"));
                const snapshot = await getDocs(q);
                
                const wardGroups: Record<string, any[]> = {};
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const ward = data.assignedWard || "Unassigned";
                    if (!wardGroups[ward]) wardGroups[ward] = [];
                    wardGroups[ward].push(data);
                });

                const sortedWards = Object.keys(wardGroups).map(ward => ({
                    wardName: ward,
                    workers: wardGroups[ward]
                })).sort((a, b) => a.wardName.localeCompare(b.wardName));

                setWards(sortedWards);
            } catch (err) {
                console.error("Error fetching ward maps:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchWards();
    }, []);

    const openMap = (ward: string, workers: any[]) => {
        const primaryWorker = workers[0];
        
        if (primaryWorker.latitude && primaryWorker.longitude) {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${primaryWorker.latitude},${primaryWorker.longitude}`);
            return;
        }

        const block = primaryWorker.assignedBlock || primaryWorker.district || "Kerala";
        let mapQuery = `Ward ${ward}, ${block}`;
        
        if (ward === "Unassigned") {
            mapQuery = `${primaryWorker.fullName || primaryWorker.name || "ASHA Worker"} ${block}`;
        }
        
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`);
    };

    const renderWard = ({ item }: any) => {
        const workerNames = item.workers.map((w: any) => w.fullName || w.name || w.firstName || "ASHA Worker").join(", ");
        
        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => openMap(item.wardName, item.workers)}
            >
                <View style={styles.cardInfo}>
                    <Text style={styles.wardTitle}>{item.wardName === 'Unassigned' ? 'General Area (Unassigned)' : `Ward ${item.wardName}`}</Text>
                    <Text style={styles.workerList}>ASHA Workers: <Text style={{fontWeight: 'bold', color: '#333'}}>{workerNames}</Text></Text>
                </View>
                <View style={styles.mapIconBtn}>
                    <Ionicons name="map" size={24} color="#FFF" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Area Maps & GIS</Text>
            </View>
            
            <View style={styles.container}>
                <Text style={styles.subtext}>Tap on any active ward cluster to automatically focus mapping software over the specific worker's geographic grid.</Text>
                
                {loading ? (
                    <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={wards}
                        keyExtractor={(item, index) => `${item.wardName}-${index}`}
                        renderItem={renderWard}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={<Text style={styles.empty}>No ASHA workers assigned to active wards found.</Text>}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#1F7A6B' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    container: { flex: 1, backgroundColor: '#F4F7FB', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
    subtext: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20, paddingHorizontal: 5 },
    
    card: { backgroundColor: '#FFF', flexDirection: 'row', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, alignItems: 'center', justifyContent: 'space-between' },
    cardInfo: { flex: 1, paddingRight: 10 },
    wardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 6 },
    workerList: { fontSize: 14, color: '#555', lineHeight: 20 },
    
    mapIconBtn: { backgroundColor: '#1F7A6B', padding: 12, borderRadius: 50, elevation: 2 },
    empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});
