import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView, Dimensions, StatusBar, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function MotherDashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { name } = useLocalSearchParams();

    const userName = String(name || "Meera").trim();

    // Mock Dashboard Stats for Mother
    const motherStats = {
        weeksPregnant: 24,
        nextCheckup: "March 15, 2026",
        trimester: "2nd Trimester",
        babySize: "Size of an Ear of Corn 🌽",
        weightGain: "+ 6.5 kg"
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#D81B60" />
            <View style={styles.container}>
                {/* --- 1. SOOTHING PREMIUM HEADER --- */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.headerTextWrapper}>
                            <Text style={styles.subHeaderText}>Asha Kiran • My Journey</Text>
                            <Text style={styles.headerTitle}>Hello, {userName} 🌸</Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7} onPress={() => router.replace("/auth" as any)}>
                            <Ionicons name="log-out-outline" size={28} color="#FFCDD2" />
                        </TouchableOpacity>
                    </View>

                    {/* Beautiful Pregnancy Progress Card */}
                    <View style={styles.progressCard}>
                        <View style={styles.progressLeft}>
                            <Text style={styles.progressTitle}>Your Pregnancy</Text>
                            <Text style={styles.trimesterText}>{motherStats.trimester}</Text>
                            <View style={styles.babySizeTag}>
                                <Text style={styles.babySizeText}>{motherStats.babySize}</Text>
                            </View>
                        </View>
                        <View style={styles.weekCircleWrap}>
                            <View style={styles.weekCircle}>
                                <Text style={styles.weekNumber}>{motherStats.weeksPregnant}</Text>
                                <Text style={styles.weekLabel}>Weeks</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* --- 2. UPCOMING APPOINTMENT --- */}
                    <Text style={styles.sectionTitle}>Up Next</Text>
                    <TouchableOpacity style={styles.appointmentBox} activeOpacity={0.8}>
                        <View style={styles.dateIconWrap}>
                            <Ionicons name="calendar" size={28} color="#D81B60" />
                        </View>
                        <View style={styles.appointmentInfo}>
                            <Text style={styles.appointmentTitle}>Routine ANC Checkup</Text>
                            <Text style={styles.appointmentDate}>{motherStats.nextCheckup} at PHC Kozhikode</Text>
                        </View>
                        <View style={styles.actionCircleBtn}>
                            <Ionicons name="chevron-forward" size={20} color="#D81B60" />
                        </View>
                    </TouchableOpacity>

                    {/* --- 3. QUICK VITALS SUMMARY --- */}
                    <View style={styles.vitalsRow}>
                        <View style={styles.vitalMiniCard}>
                            <Ionicons name="scale-outline" size={22} color="#8E24AA" />
                            <Text style={styles.vitalTitle}>Weight</Text>
                            <Text style={styles.vitalValue}>{motherStats.weightGain}</Text>
                        </View>
                        <View style={styles.vitalMiniCard}>
                            <Ionicons name="water-outline" size={22} color="#00ACC1" />
                            <Text style={styles.vitalTitle}>Hydration</Text>
                            <Text style={styles.vitalValue}>Good</Text>
                        </View>
                        <View style={styles.vitalMiniCard}>
                            <Ionicons name="fitness-outline" size={22} color="#E53935" />
                            <Text style={styles.vitalTitle}>BP Level</Text>
                            <Text style={styles.vitalValue}>120/80</Text>
                        </View>
                    </View>

                    {/* --- 4. MY HEALTH TOOLS GRID --- */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>My Health Tools</Text>
                        <Ionicons name="heart" size={20} color="#D81B60" />
                    </View>

                    <View style={styles.grid}>
                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#FCE4EC' }]}>
                                <Ionicons name="clipboard" size={28} color="#C2185B" />
                            </View>
                            <Text style={styles.btnLabel}>Health Records</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="medkit" size={28} color="#1976D2" />
                            </View>
                            <Text style={styles.btnLabel}>Medicines</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#F1F8E9' }]}>
                                <Ionicons name="restaurant" size={28} color="#388E3C" />
                            </View>
                            <Text style={styles.btnLabel}>Diet Plan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
                            <View style={[styles.btnIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="book" size={28} color="#F57C00" />
                            </View>
                            <Text style={styles.btnLabel}>Tips & Guides</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- 5. CONTACT ASHA SUPPORT --- */}
                    <TouchableOpacity style={styles.ashaContactCard} activeOpacity={0.8}>
                        <View style={styles.ashaAvatar}>
                            <Ionicons name="person" size={24} color="#D81B60" />
                        </View>
                        <View style={styles.ashaTextWrap}>
                            <Text style={styles.ashaTitle}>Your ASHA Worker</Text>
                            <Text style={styles.ashaSubText}>Anitha is available to assist you</Text>
                        </View>
                        <TouchableOpacity style={styles.callBtn} activeOpacity={0.6}>
                            <Ionicons name="call" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

// OS specific shadow configurations
const shadowConfig = Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12 },
    android: { elevation: 4 },
});

const glowingShadow = Platform.select({
    ios: { shadowColor: "#D81B60", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15 },
    android: { elevation: 8 },
});

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#D81B60" },
    container: { flex: 1, backgroundColor: "#FAFAFA" }, // Very soft clean white

    // --- Header Styles ---
    header: {
        backgroundColor: "#D81B60",
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 20 : 10,
        paddingBottom: 65,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        zIndex: 10
    },
    headerTopRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { padding: 8, marginLeft: -8, borderRadius: 20 },
    headerTextWrapper: { flex: 1, paddingHorizontal: 10 },
    subHeaderText: { color: "#F8BBD0", fontSize: 13, marginBottom: 2, fontWeight: "600", letterSpacing: 0.5, textTransform: 'uppercase' },
    headerTitle: { color: "white", fontSize: 24, fontWeight: "900", letterSpacing: 0.5 },
    profileBtn: { padding: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },

    // --- Floating Progress Card ---
    progressCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        position: 'absolute',
        bottom: -55,
        alignSelf: 'center',
        width: width - 40,
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadowConfig,
        shadowOpacity: 0.12,
        elevation: 8
    },
    progressLeft: { flex: 1 },
    progressTitle: { fontSize: 14, color: '#666', fontWeight: '600', marginBottom: 4 },
    trimesterText: { fontSize: 22, fontWeight: '900', color: '#D81B60', marginBottom: 10 },
    babySizeTag: { backgroundColor: '#FFF0F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
    babySizeText: { fontSize: 12, color: '#C2185B', fontWeight: '700' },

    weekCircleWrap: { padding: 5, borderRadius: 50, backgroundColor: '#FCE4EC' },
    weekCircle: {
        width: 86,
        height: 86,
        borderRadius: 43,
        backgroundColor: '#D81B60',
        justifyContent: 'center',
        alignItems: 'center',
        ...glowingShadow
    },
    weekNumber: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', lineHeight: 36 },
    weekLabel: { fontSize: 13, color: '#FFCDD2', fontWeight: '700', marginTop: -2 },

    // --- Content Area ---
    scrollContent: { paddingHorizontal: 20, paddingTop: 85, paddingBottom: 40 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: "900", color: "#222" },

    // --- Appointment Card ---
    appointmentBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 20,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        borderLeftWidth: 5,
        borderLeftColor: '#D81B60'
    },
    dateIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FCE4EC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    appointmentInfo: { flex: 1 },
    appointmentTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 4 },
    appointmentDate: { fontSize: 13, color: '#D81B60', fontWeight: '600' },
    actionCircleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center' },

    // --- Vitals Row ---
    vitalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    vitalMiniCard: {
        backgroundColor: '#FFFFFF',
        width: '31%',
        paddingVertical: 15,
        borderRadius: 20,
        alignItems: 'center',
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F9F9F9'
    },
    vitalTitle: { fontSize: 11, color: '#888', fontWeight: '600', marginTop: 8, marginBottom: 4 },
    vitalValue: { fontSize: 14, color: '#222', fontWeight: '900' },

    // --- Grid System ---
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
    gridBtn: {
        backgroundColor: '#FFFFFF',
        width: '47.5%',
        paddingVertical: 20,
        paddingHorizontal: 15,
        borderRadius: 24,
        marginBottom: 15,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F9F9F9'
    },
    btnIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    btnLabel: { fontSize: 14, fontWeight: '800', color: '#444' },

    // --- ASHA Contact Card ---
    ashaContactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 20,
        marginTop: 10,
        ...shadowConfig,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    ashaAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FCE4EC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    ashaTextWrap: { flex: 1 },
    ashaTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 2 },
    ashaSubText: { fontSize: 13, color: '#666', fontWeight: '500' },
    callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D81B60', justifyContent: 'center', alignItems: 'center', ...glowingShadow }
});