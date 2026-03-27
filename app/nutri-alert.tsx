import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function NutriAlerts() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchAlerts = async () => {
            const snap = await getDocs(collection(db, "household_members"));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => {
                const age = parseInt(c.age || '0');
                const weight = parseFloat(c.weight || '0');
                return age <= 6 && weight > 0 && ((age >= 1 && age <= 3 && weight < 10) || (age === 0 && weight < 5));
            });
            setAlerts(list);
            setLoading(false);
        };
        fetchAlerts();
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: '#FFF3E0' }}>
            <View style={{ backgroundColor: '#E64A19', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 15 }}>Nutrition Alerts (High Risk)</Text>
            </View>
            {loading ? <ActivityIndicator size="large" color="#E64A19" style={{ marginTop: 50 }} /> : (
                <FlatList
                    data={alerts}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 15 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#D84315', fontWeight: 'bold' }}>No malnutrition alerts active! 🎉</Text>}
                    renderItem={({ item }) => (
                        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: '#E64A19', elevation: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                <Ionicons name="warning" size={20} color="#E64A19" />
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 8 }}>{item.name}</Text>
                            </View>
                            <Text style={{ fontSize: 14, color: '#D84315', fontWeight: 'bold' }}>Underweight Detected</Text>
                            <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Age: {item.age} yrs • Current Weight: {item.weight} kg</Text>
                            <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Action Required: Escalate to Supervisor / Assign extra THR.</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
}