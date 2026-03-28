import { View, Text, StyleSheet, TouchableOpacity, FlatList, Linking, Share, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Real educational content links (International + Malayalam)
const EDUCATION_CONTENT = [
    { 
        id: '1', 
        title: 'Antenatal Care Basics', 
        type: 'Video', 
        url: 'https://www.youtube.com/watch?v=J6IKi5WLhtM', 
        malayalamUrl: 'https://www.youtube.com/watch?v=clXjkOcwl8g',
        icon: 'videocam' 
    },
    { 
        id: '2', 
        title: 'Breastfeeding Guide', 
        type: 'Video', 
        url: 'https://www.youtube.com/watch?v=g_k50wOf564', 
        malayalamUrl: 'https://www.youtube.com/watch?v=680X_6G0Z_s',
        icon: 'videocam' 
    },
    { 
        id: '3', 
        title: 'Immunization Schedule', 
        type: 'PDF Guide', 
        url: 'https://www.who.int/teams/immunization-vaccines-and-biologicals/policies-and-strategies/who-recommendations-for-routine-immunization---summary-tables', 
        malayalamUrl: 'https://www.youtube.com/watch?v=vGM3PLuCjdI', // Malayalam vaccination guide video
        icon: 'document-text' 
    },
    { 
        id: '4', 
        title: 'Nutrition During Pregnancy', 
        type: 'Video', 
        url: 'https://www.youtube.com/watch?v=8SXXSfnx7Nc', 
        malayalamUrl: 'https://www.youtube.com/watch?v=QDmBDKoyfKs',
        icon: 'videocam' 
    },
];

export default function Awareness() {
    const router = useRouter();

    const handleOpenContent = (url: string) => {
        Linking.openURL(url).catch(err => {
            Alert.alert("Error", "Unable to open this link.");
        });
    };

    const handleShare = async (item: any) => {
        try {
            await Share.share({
                message: `SevaASHA Health Education: ${item.title}\n\nEnglish: ${item.url}\n\nMalayalam: ${item.malayalamUrl}`,
            });
        } catch (error) {
            console.error("Error sharing", error);
        }
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
                <Text style={styles.subTitle}>Share these with beneficiaries in English or Malayalam</Text>

                <FlatList
                    data={EDUCATION_CONTENT}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardInfo}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name={item.icon as any} size={28} color="#1F7A6B" />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.itemTitle}>{item.title}</Text>
                                    <View style={styles.langRow}>
                                        <TouchableOpacity onPress={() => handleOpenContent(item.url)}>
                                            <Text style={styles.langLink}>English Video</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.separator}>|</Text>
                                        <TouchableOpacity onPress={() => handleOpenContent(item.malayalamUrl)}>
                                            <Text style={styles.langLink}>മലയാളം</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={styles.shareBtn} 
                                onPress={() => handleShare(item)}
                            >
                                <Ionicons name="share-social-outline" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
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
    sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
    subTitle: { fontSize: 13, color: "#666", marginBottom: 20 },
    card: { 
        backgroundColor: "white", 
        borderRadius: 12,
        marginBottom: 12, 
        flexDirection: 'row', 
        alignItems: 'center', 
        elevation: 2 
    },
    cardInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
    iconContainer: { backgroundColor: "#E0F2F1", padding: 10, borderRadius: 10, marginRight: 15 },
    textContainer: { flex: 1 },
    itemTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
    langRow: { flexDirection: 'row', marginTop: 5, alignItems: 'center' },
    langLink: { fontSize: 12, color: "#1F7A6B", fontWeight: 'bold' },
    separator: { marginHorizontal: 8, color: '#ccc' },
    shareBtn: { padding: 20, borderLeftWidth: 1, borderLeftColor: '#F0F0F0' }
});