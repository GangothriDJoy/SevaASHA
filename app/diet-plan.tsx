import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DietPlan() {
    const router = useRouter();

    const dietItems = [
        { title: "Morning (8:00 AM)", meal: "Oats with Milk, Nuts (Almonds/Walnuts), and an Apple.", icon: "partly-sunny", bg: "#FFF9C4", color: "#FBC02D" },
        { title: "Mid-Morning (11:00 AM)", meal: "Fresh Coconut Water or Buttermilk with roasted seeds.", icon: "water", bg: "#E1F5FE", color: "#0288D1" },
        { title: "Lunch (1:30 PM)", meal: "2 Rotis or Brown Rice, Dal, Leafy Greens (Palak), and Curd.", icon: "restaurant", bg: "#E8F5E9", color: "#388E3C" },
        { title: "Evening (5:00 PM)", meal: "Boiled Eggs or Roasted Makhana with limited Tea/Coffee.", icon: "cafe", bg: "#FCE4EC", color: "#C2185B" },
        { title: "Dinner (8:00 PM)", meal: "Light Vegetable Khichdi or Soup with Mixed Veggies.", icon: "moon", bg: "#EDE7F6", color: "#512DA8" }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pregnancy Diet Plan</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollArea}>
                <View style={styles.heroCard}>
                    <View style={styles.heroTextWrap}>
                        <Text style={styles.heroTitle}>Nourish Your Baby</Text>
                        <Text style={styles.heroSub}>A balanced diet ensures your baby gets the right nutrients for optimal brain and body development.</Text>
                    </View>
                    <Ionicons name="nutrition" size={60} color="#388E3C" style={{ opacity: 0.8 }} />
                </View>

                <Text style={styles.sectionTitle}>Daily Routine</Text>
                
                {dietItems.map((item, index) => (
                    <View key={index} style={styles.mealCard}>
                        <View style={[styles.iconPill, { backgroundColor: item.bg }]}>
                            <Ionicons name={item.icon as any} size={24} color={item.color} />
                        </View>
                        <View style={styles.mealInfo}>
                            <Text style={styles.mealTitle}>{item.title}</Text>
                            <Text style={styles.mealDesc}>{item.meal}</Text>
                        </View>
                    </View>
                ))}

                <View style={styles.avoidBox}>
                    <View style={styles.avoidHeader}>
                        <Ionicons name="warning" size={24} color="#D32F2F" />
                        <Text style={styles.avoidTitle}>Foods to Avoid</Text>
                    </View>
                    <Text style={styles.avoidText}>• Raw or undercooked meat and eggs</Text>
                    <Text style={styles.avoidText}>• Unpasteurized milk and soft cheeses</Text>
                    <Text style={styles.avoidText}>• High-mercury fish (like shark, swordfish)</Text>
                    <Text style={styles.avoidText}>• Excess caffeine (limit to 1 cup a day)</Text>
                    <Text style={styles.avoidText}>• Processed junk food and excess sugar</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { backgroundColor: '#388E3C', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    backBtn: { paddingRight: 15 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    
    scrollArea: { padding: 20, paddingBottom: 50 },
    
    heroCard: { flexDirection: 'row', backgroundColor: '#E8F5E9', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 25, elevation: 1 },
    heroTextWrap: { flex: 1, paddingRight: 10 },
    heroTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B5E20', marginBottom: 6 },
    heroSub: { fontSize: 13, color: '#2E7D32', lineHeight: 20 },
    
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    
    mealCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
    iconPill: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    mealInfo: { flex: 1 },
    mealTitle: { fontSize: 15, fontWeight: 'bold', color: '#222', marginBottom: 4 },
    mealDesc: { fontSize: 13, color: '#666', lineHeight: 18 },

    avoidBox: { backgroundColor: '#FFEBEE', padding: 20, borderRadius: 16, marginTop: 15, borderWidth: 1, borderColor: '#FFCDD2' },
    avoidHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avoidTitle: { fontSize: 17, fontWeight: 'bold', color: '#C62828', marginLeft: 10 },
    avoidText: { fontSize: 14, color: '#B71C1C', marginBottom: 6, paddingLeft: 10, fontWeight: '500' }
});
