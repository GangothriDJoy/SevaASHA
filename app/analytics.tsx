import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Analytics() {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>System Analytics</Text></View>
            <View style={styles.chartPlaceholder}>
                <Text style={styles.chartTitle}>Monthly Registration Growth</Text>
                <View style={styles.barContainer}>
                    {[40, 70, 55, 90, 65].map((h, i) => (
                        <View key={i} style={[styles.bar, {height: h}]} />
                    ))}
                </View>
            </View>
            <View style={styles.statRow}>
                <View style={styles.smallCard}><Text style={styles.num}>94%</Text><Text style={styles.lab}>Vax Rate</Text></View>
                <View style={styles.smallCard}><Text style={styles.num}>12</Text><Text style={styles.lab}>New Referrals</Text></View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7F7' },
    header: { backgroundColor: '#1F7A6B', padding: 20, paddingTop: 50 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    chartPlaceholder: { backgroundColor: 'white', margin: 15, padding: 20, borderRadius: 15, elevation: 3 },
    chartTitle: { fontWeight: 'bold', color: '#333', marginBottom: 20 },
    barContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 100, justifyContent: 'space-around' },
    bar: { width: 30, backgroundColor: '#1F7A6B', borderRadius: 5 },
    statRow: { flexDirection: 'row', paddingHorizontal: 15, gap: 15 },
    smallCard: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 2 },
    num: { fontSize: 24, fontWeight: 'bold', color: '#1F7A6B' },
    lab: { fontSize: 12, color: '#666' }
});