import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function Attendance() {
    const [children, setChildren] = useState<any[]>([]);
    const [present, setPresent] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchKids = async () => {
            const snap = await getDocs(collection(db, "household_members"));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => parseInt(c.age) <= 6);
            setChildren(list);
            setLoading(false);
        };
        fetchKids();
    }, []);

    const save = async () => {
        try {
            await addDoc(collection(db, "daily_attendance"), { date: new Date().toISOString(), count: present.length, ids: present, timestamp: serverTimestamp() });
            Alert.alert("Success", "Attendance saved!"); router.back();
        } catch (e) { Alert.alert("Error", "Failed to save."); }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F6F8' }}>
            <View style={{ backgroundColor: '#2196F3', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 15 }}>Daily Register</Text>
            </View>
            {loading ? <ActivityIndicator style={{ marginTop: 50 }} color="#2196F3" /> : (
                <FlatList data={children} keyExtractor={i => i.id} contentContainerStyle={{ padding: 15 }} renderItem={({ item }) => {
                    const isPresent = present.includes(item.id);
                    return (
                        <TouchableOpacity onPress={() => setPresent(p => isPresent ? p.filter(id => id !== item.id) : [...p, item.id])} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isPresent ? '#E3F2FD' : 'white', padding: 18, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: isPresent ? '#2196F3' : 'transparent' }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: isPresent ? '#1565C0' : '#333' }}>{item.name}</Text>
                            <Ionicons name={isPresent ? "checkmark-circle" : "ellipse-outline"} size={28} color={isPresent ? "#2196F3" : "#CCC"} />
                        </TouchableOpacity>
                    );
                }} />
            )}
            <TouchableOpacity onPress={save} style={{ backgroundColor: '#2196F3', margin: 20, padding: 18, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>SUBMIT ({present.length} Present)</Text>
            </TouchableOpacity>
        </View>
    );
}