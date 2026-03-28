import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TipsGuides() {
    const router = useRouter();
    const [search, setSearch] = useState('');

    const guides = [
        { id: '1', category: 'Exercise & Yoga', title: 'Safe Prenatal Yoga Poses', duration: '5 min read', icon: 'body', color: '#8E24AA', bg: '#F3E5F5' },
        { id: '2', category: 'Mental Health', title: 'Managing Pregnancy Anxiety', duration: '4 min read', icon: 'heart-half', color: '#E53935', bg: '#FFEBEE' },
        { id: '3', category: 'Preparation', title: 'Packing your Hospital Bag', duration: '7 min read', icon: 'bag-check', color: '#1976D2', bg: '#E3F2FD' },
        { id: '4', category: 'Newborn Care', title: 'First 24 Hours with Baby', duration: '10 min read', icon: 'happy', color: '#00897B', bg: '#E0F2F1' }
    ];

    const filtered = guides.filter(g => g.title.toLowerCase().includes(search.toLowerCase()) || g.category.toLowerCase().includes(search.toLowerCase()));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tips & Guides</Text>
            </View>

            <View style={styles.searchWrap}>
                <Ionicons name="search" size={20} color="#888" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search articles, tips, or guides..."
                    placeholderTextColor="#999"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <ScrollView contentContainerStyle={styles.scrollArea}>
                <View style={styles.featuredBox}>
                    <View style={styles.featuredBadge}>
                        <Text style={styles.featuredText}>FEATURED</Text>
                    </View>
                    <Text style={styles.featuredTitle}>Understanding Fetal Kicks</Text>
                    <Text style={styles.featuredSub}>Learn when you should start feeling your baby move and how to do daily kick counts.</Text>
                    <TouchableOpacity style={styles.readBtn}>
                        <Text style={styles.readText}>Read Now</Text>
                        <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 5 }} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Library</Text>
                
                {filtered.map(guide => (
                    <TouchableOpacity key={guide.id} style={styles.guideCard} activeOpacity={0.8}>
                        <View style={[styles.iconWrap, { backgroundColor: guide.bg }]}>
                            <Ionicons name={guide.icon as any} size={28} color={guide.color} />
                        </View>
                        <View style={styles.guideInfo}>
                            <Text style={[styles.guideCategory, { color: guide.color }]}>{guide.category}</Text>
                            <Text style={styles.guideTitle} numberOfLines={2}>{guide.title}</Text>
                            <View style={styles.durationRow}>
                                <Ionicons name="time-outline" size={14} color="#888" />
                                <Text style={styles.durationText}>{guide.duration}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </TouchableOpacity>
                ))}

                {filtered.length === 0 && (
                    <Text style={{ textAlign: 'center', marginTop: 40, color: '#999', fontStyle: 'italic' }}>
                        No guides match your search.
                    </Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { backgroundColor: '#F57C00', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    backBtn: { paddingRight: 15 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 20, marginBottom: 5, paddingHorizontal: 15, borderRadius: 12, elevation: 1, borderWidth: 1, borderColor: '#EEE' },
    searchInput: { flex: 1, height: 50, fontSize: 15, color: '#333', marginLeft: 10 },
    
    scrollArea: { padding: 20, paddingBottom: 50 },
    
    featuredBox: { backgroundColor: '#FFF3E0', padding: 20, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: '#FFE0B2' },
    featuredBadge: { alignSelf: 'flex-start', backgroundColor: '#F57C00', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
    featuredText: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    featuredTitle: { fontSize: 20, fontWeight: 'bold', color: '#E65100', marginBottom: 8 },
    featuredSub: { fontSize: 14, color: '#EF6C00', lineHeight: 20, marginBottom: 15 },
    readBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#E65100', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    readText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    
    guideCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#F5F5F5' },
    iconWrap: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    guideInfo: { flex: 1 },
    guideCategory: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
    guideTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 6 },
    durationRow: { flexDirection: 'row', alignItems: 'center' },
    durationText: { fontSize: 12, color: '#888', marginLeft: 4, fontWeight: '500' }
});
