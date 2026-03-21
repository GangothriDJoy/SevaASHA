import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function Broadcast() {
    const [msg, setMsg] = useState('');

    const sendBroadcast = async () => {
        if (!msg) return;
        try {
            await addDoc(collection(db, "notifications"), {
                message: msg,
                type: "BROADCAST",
                createdAt: serverTimestamp(),
                sender: "Admin"
            });
            Alert.alert("Success", "Broadcast sent to all active workers.");
            setMsg('');
        } catch (e) { Alert.alert("Error", "Failed to send."); }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>Central Broadcast</Text></View>
            <View style={styles.content}>
                <Text style={styles.label}>Message to all ASHA Workers:</Text>
                <TextInput
                    multiline numberOfLines={5} style={styles.input}
                    placeholder="Enter urgent announcement..."
                    value={msg} onChangeText={setMsg}
                />
                <TouchableOpacity style={styles.btn} onPress={sendBroadcast}>
                    <Text style={styles.btnText}>Send Now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7F7' },
    header: { backgroundColor: '#D32F2F', padding: 20, paddingTop: 50 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20 },
    label: { fontWeight: 'bold', marginBottom: 10, color: '#333' },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 10, textAlignVertical: 'top', elevation: 2 },
    btn: { backgroundColor: '#D32F2F', padding: 18, borderRadius: 10, marginTop: 20, alignItems: 'center' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});