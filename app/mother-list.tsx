import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function MotherList() {
    const [mothers, setMothers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        const fetchMothers = async () => {
            try {
                const snap = await getDocs(query(collection(db, "household_members")));
                const list = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((m: any) => m.isPregnant === true || m.isPregnant === "true" || m.status === "Postnatal");
                setMothers(list);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchMothers();
    }, []);

    const filtered = mothers.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F6F8' }}>
            <View style={{ backgroundColor: '#E64A19', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 15 }}>Maternal Registration</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 15, paddingHorizontal: 15, borderRadius: 10, height: 50, elevation: 1 }}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput placeholder="Search mothers..." style={{ flex: 1, marginLeft: 10, fontSize: 16 }} value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            {loading ? <ActivityIndicator size="large" color="#E64A19" style={{ marginTop: 50 }} /> : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingHorizontal: 15 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={{ backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 }}>
                            <View style={{ width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="woman" size={24} color="#E64A19" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{item.name}</Text>
                                <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{item.isPregnant ? "Pregnant" : "Postnatal"} • {item.age} yrs</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}