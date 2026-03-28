import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function StockInventory() {
    const router = useRouter();
    const [stock, setStock] = useState({ Rice: 100, 'Wheat Powder': 45, Eggs: 200, Milk: 15 });

    const updateStock = (item: string, val: number) => setStock(p => ({ ...p, [item]: Math.max(0, (p as any)[item] + val) }));

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F6F8' }}>
            <View style={{ backgroundColor: '#9C27B0', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 15 }}>Center Inventory</Text>
            </View>
            <ScrollView style={{ padding: 20 }}>
                {Object.entries(stock).map(([key, val]) => (
                    <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 12, elevation: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{key}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => updateStock(key, -5)}><Ionicons name="remove-circle" size={32} color="#E53935" /></TouchableOpacity>
                            <Text style={{ marginHorizontal: 20, fontSize: 18, fontWeight: 'bold', minWidth: 30, textAlign: 'center' }}>{val}</Text>
                            <TouchableOpacity onPress={() => updateStock(key, 5)}><Ionicons name="add-circle" size={32} color="#4CAF50" /></TouchableOpacity>
                        </View>
                    </View>
                ))}
                <TouchableOpacity onPress={() => { Alert.alert("Saved", "Stock updated in database."); router.back(); }} style={{ backgroundColor: '#9C27B0', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>SAVE INVENTORY</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}