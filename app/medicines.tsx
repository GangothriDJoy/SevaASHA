import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Medicines() {
    const router = useRouter();
    const [meds, setMeds] = useState([
        { id: '1', name: 'Iron & Folic Acid (IFA)', dose: '1 Tablet', frequency: 'Daily after lunch', status: 'Taken', time: '1:00 PM', icon: 'water' },
        { id: '2', name: 'Calcium Supplement', dose: '1 Tablet', frequency: 'Daily after dinner', status: 'Pending', time: '8:30 PM', icon: 'medical' },
        { id: '3', name: 'Vitamin D3', dose: '1 Capsule', frequency: 'Once a week (Sundays)', status: 'Upcoming', time: 'Morning', icon: 'sunny' }
    ]);

    const toggleStatus = (id: string) => {
        setMeds(prev => prev.map(m => m.id === id ? { ...m, status: m.status === 'Taken' ? 'Pending' : 'Taken' } : m));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Medicines</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollArea}>
                <View style={styles.reminderCard}>
                    <View style={styles.bellRing}>
                        <Ionicons name="notifications" size={28} color="#1976D2" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.reminderTitle}>Stay on Track!</Text>
                        <Text style={styles.reminderSub}>Taking your supplements daily severely reduces the risk of anemia during pregnancy.</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Today's Prescription</Text>
                
                {meds.map(med => {
                    const isTaken = med.status === 'Taken';
                    return (
                        <TouchableOpacity 
                            key={med.id} 
                            style={[styles.medCard, isTaken && styles.medCardTaken]}
                            activeOpacity={0.8}
                            onPress={() => toggleStatus(med.id)}
                        >
                            <View style={[styles.iconBox, isTaken ? { backgroundColor: '#4CAF50' } : { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name={med.icon as any} size={24} color={isTaken ? "white" : "#1976D2"} />
                            </View>
                            
                            <View style={styles.medInfo}>
                                <Text style={[styles.medName, isTaken && { textDecorationLine: 'line-through', color: '#666' }]}>{med.name}</Text>
                                <Text style={styles.medDose}>{med.dose} • {med.frequency}</Text>
                                <View style={styles.timeWrapper}>
                                    <Ionicons name="time-outline" size={14} color="#888" />
                                    <Text style={styles.timeText}>{med.time}</Text>
                                </View>
                            </View>

                            <View style={[styles.checkCircle, isTaken && styles.checkCircleTaken]}>
                                {isTaken && <Ionicons name="checkmark" size={20} color="white" />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
                
                <TouchableOpacity style={styles.refillBtn}>
                    <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.refillText}>Request Refill from ASHA</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { backgroundColor: '#1976D2', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    backBtn: { paddingRight: 15 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    
    scrollArea: { padding: 20, paddingBottom: 50 },
    
    reminderCard: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 25 },
    bellRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    reminderTitle: { fontSize: 16, fontWeight: 'bold', color: '#0D47A1', marginBottom: 4 },
    reminderSub: { fontSize: 13, color: '#1565C0', lineHeight: 18 },
    
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    
    medCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 18, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#EEE' },
    medCardTaken: { backgroundColor: '#F9F9F9', opacity: 0.8 },
    iconBox: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    
    medInfo: { flex: 1 },
    medName: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    medDose: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 6 },
    timeWrapper: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 12, color: '#888', marginLeft: 4, fontWeight: '600' },
    
    checkCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
    checkCircleTaken: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    
    refillBtn: { backgroundColor: '#1976D2', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 3 },
    refillText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
