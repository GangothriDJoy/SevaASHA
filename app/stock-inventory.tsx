import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const INVENTORY_DEFAULTS = {
    "Take Home Ration (Packets)": 50,
    "Morning Snacks (Servings)": 100,
    "Hot Cooked Meals (kg)": 20,
    "Eggs": 60,
    "Milk (Liters)": 30
};

export default function StockInventory() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [stock, setStock] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (workerMobile) fetchInventory();
        }, [workerMobile])
    );

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "aww_inventory", workerMobile);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const currentStock: Record<string, number> = {};
                Object.keys(INVENTORY_DEFAULTS).forEach(key => {
                    currentStock[key] = typeof data[key] === 'number' ? data[key] : INVENTORY_DEFAULTS[key as keyof typeof INVENTORY_DEFAULTS];
                });
                setStock(currentStock);
            } else {
                setStock({ ...INVENTORY_DEFAULTS });
            }
        } catch (error) {
            console.error("Fetch Inventory Error:", error);
            Alert.alert("Execution Blocked", "Could not synchronize warehouse telemetry.");
        } finally {
            setLoading(false);
        }
    };

    const updateStock = (item: string, val: number) => {
        setStock(prev => ({ 
            ...prev, 
            [item]: Math.max(0, (prev[item] || 0) + val) 
        }));
    };

    const saveInventory = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, "aww_inventory", workerMobile);
            await setDoc(docRef, {
                ...stock,
                workerId: workerMobile,
                lastUpdated: serverTimestamp()
            }, { merge: true });

            Alert.alert(
                "Telemetry Secured", 
                "Anganwadi physical inventory counts have been successfully synchronized to the global Admin cloud."
            );
            router.back();
        } catch (error) {
            console.error("Save Inventory Error:", error);
            Alert.alert("Network Operation Failed", "Could not commit inventory changes.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Inventory Tracker</Text>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#F57C00" />
                    <Text style={styles.loadingText}>Synchronizing Warehouse...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                        <View style={styles.infoBanner}>
                            <Ionicons name="information-circle" size={24} color="#F57C00" />
                            <Text style={styles.infoText}>Adjust the current physical counts of Anganwadi distribution items sitting at your local center.</Text>
                        </View>

                        {Object.entries(stock).map(([key, val]) => {
                            let iconName = "cube-outline";
                            if (key.includes("Ration")) iconName = "basket";
                            else if (key.includes("Snacks")) iconName = "sunny";
                            else if (key.includes("Meals")) iconName = "restaurant";
                            else if (key.includes("Eggs")) iconName = "egg";
                            else if (key.includes("Milk")) iconName = "water";

                            const isCriticallyLow = val <= 10;

                            return (
                                <View key={key} style={[styles.stockCard, isCriticallyLow && styles.stockCardWarning]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 15 }}>
                                        <View style={[styles.iconRing, isCriticallyLow && { backgroundColor: '#FFEBEE' }]}>
                                            <Ionicons name={iconName as any} size={22} color={isCriticallyLow ? "#D32F2F" : "#F57C00"} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemTitle}>{key}</Text>
                                            {isCriticallyLow && <Text style={styles.warningText}>CRITICAL STOCK</Text>}
                                        </View>
                                    </View>

                                    <View style={styles.counterRow}>
                                        <TouchableOpacity 
                                            activeOpacity={0.6}
                                            style={[styles.mathBtn, { marginLeft: 0 }]} 
                                            onPress={() => updateStock(key, -1)}
                                        >
                                            <Ionicons name="remove" size={24} color="#D32F2F" />
                                        </TouchableOpacity>
                                        
                                        <View style={styles.valBox}>
                                            <Text style={[styles.valText, isCriticallyLow && { color: '#D32F2F' }]}>{val}</Text>
                                        </View>
                                        
                                        <TouchableOpacity 
                                            activeOpacity={0.6}
                                            style={styles.mathBtn} 
                                            onPress={() => updateStock(key, 1)}
                                        >
                                            <Ionicons name="add" size={24} color="#388E3C" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.bottomBar}>
                        <TouchableOpacity 
                            style={styles.submitBtn} 
                            activeOpacity={0.8}
                            onPress={saveInventory}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="cloud-upload" size={20} color="white" style={{ marginRight: 10 }} />
                                    <Text style={styles.submitText}>ENCRYPT TRANSACTIONS</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    header: { backgroundColor: '#F57C00', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    headerText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#666', fontWeight: 'bold' },
    
    infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FFE0B2' },
    infoText: { flex: 1, marginLeft: 12, color: '#E65100', fontSize: 13, lineHeight: 20 },

    stockCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#eee' },
    stockCardWarning: { borderColor: '#D32F2F', borderWidth: 2, backgroundColor: '#FFFAFA' },
    
    iconRing: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    itemTitle: { fontWeight: 'bold', fontSize: 14, color: '#333' },
    warningText: { color: '#D32F2F', fontSize: 11, fontWeight: 'bold', marginTop: 2 },
    
    counterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 30, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 5, paddingVertical: 4 },
    mathBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, elevation: 1 },
    valBox: { minWidth: 40, alignItems: 'center' },
    valText: { fontSize: 18, fontWeight: 'bold', color: '#111' },

    bottomBar: { backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderTopColor: '#eee', elevation: 10 },
    submitBtn: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 }
});
