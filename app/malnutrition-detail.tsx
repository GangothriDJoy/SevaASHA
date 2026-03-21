import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

export default function MalnutritionDetail() {
    const params = useLocalSearchParams();
    const router = useRouter();

    const name = params.name || "Child";
    const status = params.status || "SAM";
    const weight = params.weight || "0";
    const currentWeight = parseFloat(weight as string);
    const height = params.height || "--";
    const area = params.area || "Unknown Area";

    const isSAM = status === "SAM";
    const statusColor = isSAM ? "#D32F2F" : "#F39C12";

    // Data-Driven Logic Mocks for UI Interactivity
    // If the child is SAM, show a flattening/dropping curve
    const historyWeights = isSAM 
        ? [currentWeight + 1.2, currentWeight + 0.8, currentWeight + 0.3, currentWeight, currentWeight - 0.2, currentWeight] 
        : [currentWeight - 2.0, currentWeight - 1.2, currentWeight - 0.5, currentWeight];

    const isFlattening = isSAM && (historyWeights[historyWeights.length - 1] <= historyWeights[historyWeights.length - 2]);

    const chartData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Current"],
        datasets: [{ data: isSAM ? historyWeights : [0, 0, ...historyWeights] }]
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Data-Driven Intervention</Text>
            </View>

            {/* Profile Overview Card */}
            <View style={[styles.card, { borderTopWidth: 5, borderTopColor: statusColor }]}>
                <View style={styles.profileRow}>
                    <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
                        <Ionicons name="person" size={24} color={statusColor} />
                    </View>
                    <View style={styles.profileText}>
                        <Text style={styles.name}>{name}</Text>
                        <Text style={styles.subText}>{area} • Under AWW Care</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusBadgeText}>{status}</Text>
                    </View>
                </View>
                <View style={styles.vitalsRow}>
                    <View style={styles.vitalBox}>
                        <Text style={styles.vitalLabel}>Given Weight</Text>
                        <Text style={styles.vitalValue}>{weight} kg</Text>
                    </View>
                    <View style={styles.vitalBox}>
                        <Text style={styles.vitalLabel}>Height / Length</Text>
                        <Text style={styles.vitalValue}>{height} cm</Text>
                    </View>
                </View>
            </View>

            {/* 1. GROWTH TRENDS */}
            <Text style={styles.sectionTitle}>1. Growth Trends Observation</Text>
            <View style={styles.card}>
                <View style={[styles.trendAlert, { backgroundColor: isFlattening ? '#FFEBEE' : '#E8F5E9' }]}>
                    <Ionicons name={isFlattening ? "trending-down" : "trending-up"} size={20} color={isFlattening ? '#D32F2F' : '#2E7D32'} />
                    <Text style={[styles.trendText, { color: isFlattening ? '#D32F2F' : '#2E7D32' }]}>
                        {isFlattening 
                            ? "CRITICAL: The child's weight curve is flattening, indicating an immediate risk of permanent stunting."
                            : "IMPROVING: The child is steadily gaining weight since the last intervention phase."}
                    </Text>
                </View>
                
                {/* Fallback graphical mock since native-chart-kit might not be cleanly installed in every Expo iteration */}
                <View style={styles.mockGraphArea}>
                    <Text style={{ textAlign: 'center', color: '#999', marginBottom: 10 }}>Weight History (Past 6 Months)</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingHorizontal: 20 }}>
                        {chartData.datasets[0].data.map((w, index) => (
                            <View key={index} style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>{w.toFixed(1)}</Text>
                                <View style={{ width: 30, height: w * 12, backgroundColor: statusColor, borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
                                <Text style={{ fontSize: 10, color: '#999', marginTop: 5 }}>{chartData.labels[index]}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* 2. HISTORY (NRC REFERRAL) */}
            <Text style={styles.sectionTitle}>2. Referral & Intervention History</Text>
            <View style={styles.card}>
                <View style={styles.timelineRow}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>Admitted to Nutrition Rehabilitation Centre (NRC)</Text>
                        <Text style={styles.timelineDate}>October 12, 2025</Text>
                        <Text style={styles.timelineText}>Admitted for 14-day intensive therapeutic feeding program due to severe wasting.</Text>
                    </View>
                </View>
                
                <View style={styles.timelineRow}>
                    <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                    <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>Discharge Follow-up Active</Text>
                        <Text style={styles.timelineDate}>October 26, 2025 - Present</Text>
                        <Text style={styles.timelineText}>Discharged with MAM status. Under regular community monitoring protocol.</Text>
                    </View>
                </View>
            </View>

            {/* ACTION BUTTONS */}
            <TouchableOpacity style={styles.nrcBtn}>
                <Ionicons name="medical" size={18} color="white" />
                <Text style={styles.nrcBtnText}>Escalate to Emergency NRC Referral</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7FB' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: 'white' },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    sectionTitle: { marginLeft: 20, marginTop: 15, fontSize: 14, fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
    card: { backgroundColor: 'white', margin: 15, padding: 20, borderRadius: 15, elevation: 2, shadowColor: '#000', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.05, shadowRadius: 5 },
    
    profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    profileText: { flex: 1 },
    name: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 13, color: '#777', marginTop: 2 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

    vitalsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 15 },
    vitalBox: { flex: 1, alignItems: 'center' },
    vitalLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
    vitalValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    trendAlert: { flexDirection: 'row', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
    trendText: { flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '500', lineHeight: 20 },

    mockGraphArea: { backgroundColor: '#F9F9F9', borderRadius: 12, paddingVertical: 15, marginTop: 10, borderWidth: 1, borderColor: '#EEE' },

    timelineRow: { flexDirection: 'row', marginBottom: 25 },
    timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D32F2F', marginTop: 5, marginRight: 15 },
    timelineContent: { flex: 1, borderLeftWidth: 2, borderLeftColor: '#F0F0F0', paddingLeft: 15, marginLeft: -21 },
    timelineTitle: { fontWeight: 'bold', color: '#333', fontSize: 15 },
    timelineDate: { fontSize: 12, color: '#999', marginVertical: 4 },
    timelineText: { fontSize: 14, color: '#666', lineHeight: 20 },

    nrcBtn: { flexDirection: 'row', backgroundColor: '#D32F2F', margin: 20, padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    nrcBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 }
});
