import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function GrowthChart() {
    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchGrowthData = async () => {
            const snap = await getDocs(query(collection(db, "household_members")));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => parseInt(c.age) <= 6);
            setChildren(list);
            setLoading(false);
        };
        fetchGrowthData();
    }, []);

    const getStatus = (weight: any, age: any) => {
        const w = parseFloat(weight); const a = parseInt(age);
        if (!w || isNaN(a)) return { label: "No Data", color: "#999" };
        if (a <= 3 && w < 10) return { label: "Underweight", color: "#D32F2F" };
        return { label: "Healthy", color: "#2E7D32" };
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F6F8' }}>
            <View style={{ backgroundColor: '#4CAF50', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 15 }}>Growth Monitoring</Text>
            </View>
            {loading ? <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} /> : (
                <FlatList
                    data={children}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 15 }}
                    renderItem={({ item }) => {
                        const status = getStatus(item.weight, item.age);
                        return (
                            <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
                                        <Text style={{ fontSize: 13, color: '#666' }}>Age: {item.age}y • Wt: {item.weight || '--'}kg</Text>
                                    </View>
                                    <View style={{ backgroundColor: status.color, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, height: 24 }}>
                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{status.label}</Text>
                                    </View>
                                </View>
                                <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
                                    <View style={{ height: '100%', width: `${Math.min((parseFloat(item.weight || 0) / 20) * 100, 100)}%`, backgroundColor: status.color }} />
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}