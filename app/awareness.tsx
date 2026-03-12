import { View, Text, StyleSheet, TouchableOpacity, FlatList, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";

// Mock data for health education
const EDUCATION_CONTENT = [
    { id: '1', title: 'Antenatal Care Basics', type: 'Video', url: 'https://youtube.com/example1', icon: 'videocam' },
    { id: '2', title: 'Breastfeeding Guide', type: 'Video', url: 'https://youtube.com/example2', icon: 'videocam' },
    { id: '3', title: 'Immunization Schedule', type: 'PDF', url: 'https://example.com/pdf1', icon: 'document-text' },
    { id: '4', title: 'Nutrition During Pregnancy', type: 'Video', url: 'https://youtube.com/example3', icon: 'videocam' },
];

export default function Awareness() {
    const router = useRouter();

    const handleOpenContent = (url: string) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Health Education</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Awareness Materials</Text>
                <Text style={styles.subTitle}>Share these with beneficiaries during visits</Text>

                <FlatList
                    data={EDUCATION_CONTENT}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handleOpenContent(item.url)}>
                            <View style={styles.iconContainer}>
                                <Ionicons name={item.icon as any} size={28} color="#1F7A6B" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.itemTitle}>{item.title}</Text>
                                <Text style={styles.itemType}>{item.type}</Text>
                            </View>
                            <Ionicons name="share-social-outline" size={24} color="#666" />
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 15 },
    content: { padding: 20, flex: 1 },
    sectionTitle: { fontSize: 22, fontWeight: "bold", color: "#333" },
    subTitle: { fontSize: 14, color: "#666", marginBottom: 20 },
    card: { backgroundColor: "white", padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    iconContainer: { backgroundColor: "#E0F2F1", padding: 10, borderRadius: 10, marginRight: 15 },
    textContainer: { flex: 1 },
    itemTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
    itemType: { fontSize: 12, color: "#1F7A6B", marginTop: 2 },
});