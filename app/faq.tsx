import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function FAQ() {
    const router = useRouter();
    const { role } = useLocalSearchParams();
    const userRole = role ? String(role) : 'Guest';

    const getFaqs = () => {
        if (userRole === "Mother") {
            return [
                { q: "How do I log my pregnancy symptoms?", a: "Go to your main dashboard and use the 'Log Symptoms' button. You can select symptoms you're currently experiencing and hit Save to notify your ASHA worker." },
                { q: "When is my next checkup?", a: "Your upcoming vaccinations and ANC checkups are listed directly on your home screen. A red notification will appear if you're overdue." },
                { q: "How do I contact my healthcare worker?", a: "Go to Settings and select 'Contact ASHA Worker'. This will let you send an email or directly call them if they have provided their contact number." },
                { q: "What should I do in an absolute emergency?", a: "You can use the 'EMERGENCY SOS' button if available, or immediately call your primary health center." }
            ];
        } else if (userRole === "Anganwadi Worker") {
            return [
                { q: "How do I track child nutrition?", a: "From your dashboard, access the Nutrition tracker to log weights and heights for children in your center." },
                { q: "What happens if I lose internet connection?", a: "Enable 'Offline Mode' in Settings. You can continue adding records locally. Once your connection comes back, tap 'Sync Data Now' in Settings to upload them." },
                { q: "How do I participate in central broadcasts?", a: "You will receive messages from Supervisors in your dashboard banner natively." }
            ];
        } else if (userRole === "JPHN") {
            return [
                { q: "How do I review high-risk pregnancies?", a: "The 'High-Risk Cases' section highlights all referred cases. You can resolve or follow up with notes per patient." },
                { q: "Can I manage immunization inventory?", a: "Yes, you have access to vaccine supply metrics in your tools panel." },
                { q: "What happens if I lose internet connection?", a: "Enable 'Offline Mode' in Settings. You can continue adding records locally. Once your connection comes back, tap 'Sync Data Now'." }
            ];
        } else if (userRole === "Supervisor" || userRole === "Admin" || userRole === "Super Admin") {
            return [
                { q: "How do I send global broadcasts?", a: "Tap the 'Broadcast Alert' button. Specify your target audience (All or specific roles) to dispatch a real-time banner alert across their devices." },
                { q: "How do I monitor worker performance?", a: "Your dashboard analytics pipeline aggregates monthly visits targets across your entire assigned block in real-time." },
                { q: "How do I manage emergency alerts?", a: "Resolved and UNRESOLVED emergency pings appear directly in your real-time SOS list. Tap an active alert to view details and mark it Reviewed." }
            ];
        } else {
            // Default ASHA Worker
            return [
                { q: "How do I add a new expecting mother?", a: "Navigate to the 'Mothers' tab from your dashboard. Fill out all required maternal details and hit Save." },
                { q: "What happens if I lose internet connection?", a: "Enable 'Offline Mode' in Settings. You can continue adding records locally. Once your connection comes back, tap 'Sync Data Now'." },
                { q: "How do I trigger an emergency alert?", a: "From your main dashboard, tap the red 'EMERGENCY SOS' card. This will immediately notify your Supervisor and local PHC." },
                { q: "How are my incentives tracked?", a: "Incentives are tied to the number of completed ANC checkups and immunizations. You can view your progress on the Performance section." },
                { q: "Can I broadcast a message to others?", a: "No, only Supervisors or Admins have Central Broadcast permissions. Use the standard alert flags on patient records." }
            ];
        }
    };

    const faqs = getFaqs();
    const contactLabel = userRole === "Mother" ? "Contact ASHA Worker" : "Contact Admin";

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & FAQ  ({userRole})</Text>
            </View>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <Text style={styles.introText}>Frequently Asked Questions</Text>
                {faqs.map((faq, index) => (
                    <View key={index} style={styles.faqCard}>
                        <Text style={styles.question}>{faq.q}</Text>
                        <Text style={styles.answer}>{faq.a}</Text>
                    </View>
                ))}
                {userRole !== "Supervisor" && (
                    <View style={styles.contactFooter}>
                        <Text style={styles.footerText}>Still need help? Please go back and select "{contactLabel}" from Settings.</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#1F7A6B' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, backgroundColor: '#1F7A6B' },
    backBtn: { marginRight: 15 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    container: { flex: 1, backgroundColor: '#F4F6F8', padding: 15 },
    introText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginLeft: 5 },
    faqCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1 },
    question: { fontSize: 15, fontWeight: 'bold', color: '#1F7A6B', marginBottom: 5 },
    answer: { fontSize: 14, color: '#555', lineHeight: 20 },
    contactFooter: { marginTop: 10, marginBottom: 40, alignItems: 'center', paddingHorizontal: 20 },
    footerText: { fontSize: 13, color: '#888', textAlign: 'center' }
});
