import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Alert, Platform, ActivityIndicator, Linking, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTranslation } from '../contexts/LanguageContext';

export default function Settings() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userName = params.name ? String(params.name) : 'User';
    const userRole = params.role ? String(params.role) : 'Guest';
    
    const { language, setLanguage, t } = useTranslation();

    const [pushEnabled, setPushEnabled] = useState(true);
    const [offlineEnabled, setOfflineEnabled] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLangModalVisible, setIsLangModalVisible] = useState(false);
    const [syncResult, setSyncResult] = useState({ visible: false, title: "", message: "", success: true });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedPush = await AsyncStorage.getItem('pushEnabled');
                const storedOffline = await AsyncStorage.getItem('offlineEnabled');
                if (storedPush !== null) setPushEnabled(storedPush === 'true');
                if (storedOffline !== null) setOfflineEnabled(storedOffline === 'true');
            } catch (e) { console.error("Error loading settings local cache"); }
        };
        loadSettings();
    }, []);

    const handleTogglePush = async (val: boolean) => {
        setPushEnabled(val);
        await AsyncStorage.setItem('pushEnabled', String(val));
    };

    const handleToggleOffline = async (val: boolean) => {
        setOfflineEnabled(val);
        await AsyncStorage.setItem('offlineEnabled', String(val));
    };

    const handleLanguageSelect = (lang: string) => {
        setLanguage(lang);
        setIsLangModalVisible(false);
    };

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            const isSuccess = Math.random() > 0.3; // 70% success rate
            if (isSuccess) {
                setSyncResult({ visible: true, title: "Success", message: "All records have been synchronized successfully.", success: true });
            } else {
                setSyncResult({ visible: true, title: "Sync Failed", message: "Could not reach the server to sync data. Please check your internet connection and try again.", success: false });
            }
        }, 1500);
    };

    const handleLogout = () => {
        Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", onPress: () => router.replace('/auth'), style: "destructive" }
        ]);
    };

    const handleContactAdmin = () => {
        Alert.alert(
            contactLabel, 
            "How would you like to reach support?",
            [
                { text: "Call Phone", onPress: () => Linking.openURL('tel:+919876543210') },
                { text: "Send Email", onPress: () => Linking.openURL('mailto:admin@sevaasha.com') },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const contactLabel = userRole === "Mother" ? t("contact_worker") : t("contact_admin");
    const shouldShowContact = userRole !== "Supervisor";

    const SettingsRow = ({ icon, title, subTitle, type, value, onToggle, onPress, rightText, isLoading }: any) => (
        <TouchableOpacity 
            style={styles.settingRow} 
            onPress={type === 'link' || type === 'button' ? onPress : undefined}
            activeOpacity={type === 'switch' ? 1 : 0.7}
            disabled={isLoading}
        >
            <View style={styles.settingIconBg}>
                <Ionicons name={icon} size={20} color="#1F7A6B" />
            </View>
            <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subTitle ? <Text style={styles.settingSubTitle}>{subTitle}</Text> : null}
            </View>
            {type === 'switch' && (
                <Switch 
                    trackColor={{ false: "#d3d3d3", true: "#80CBC4" }}
                    thumbColor={value ? "#1F7A6B" : "#f4f3f4"}
                    onValueChange={onToggle}
                    value={value}
                />
            )}
            {type === 'link' && (
                <View style={styles.linkRight}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#1F7A6B" />
                    ) : (
                        <>
                            {rightText && <Text style={styles.rightText}>{rightText}</Text>}
                            <Ionicons name="chevron-forward" size={18} color="#999" />
                        </>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("settings")}</Text>
            </View>
            
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={40} color="#1F7A6B" />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{userName}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{userRole}</Text>
                        </View>
                    </View>
                </View>

                {/* Group 1: Preferences */}
                <Text style={styles.groupTitle}>{t("preferences")}</Text>
                <View style={styles.cardGroup}>
                    <SettingsRow 
                        icon="globe-outline" 
                        title={t("language_selection")} 
                        type="link" 
                        rightText={language === "Hindi" ? "Hindi (हिंदी)" : language === "Malayalam" ? "Malayalam (മലയാളം)" : "English"}
                        onPress={() => setIsLangModalVisible(true)} 
                    />
                    <View style={styles.divider} />
                    <SettingsRow 
                        icon="notifications-outline" 
                        title={t("push_notifications")} 
                        type="switch" 
                        value={pushEnabled}
                        onToggle={handleTogglePush}
                    />
                </View>

                {/* Group 2: Data & Storage */}
                <Text style={styles.groupTitle}>{t("data_storage")}</Text>
                <View style={styles.cardGroup}>
                    <SettingsRow 
                        icon="cloud-offline-outline" 
                        title={t("offline_mode")} 
                        subTitle={t("offline_desc")}
                        type="switch" 
                        value={offlineEnabled}
                        onToggle={handleToggleOffline}
                    />
                    <View style={styles.divider} />
                    <SettingsRow 
                        icon="cloud-upload-outline" 
                        title={t("sync_data")} 
                        type="link" 
                        onPress={handleSync}
                        isLoading={isSyncing}
                    />
                </View>

                {/* Group 3: Support */}
                <Text style={styles.groupTitle}>{t("support")}</Text>
                <View style={styles.cardGroup}>
                    <SettingsRow 
                        icon="help-circle-outline" 
                        title={t("help_faq")} 
                        type="link" 
                        onPress={() => router.push({ pathname: '/faq', params: { role: userRole } })}
                    />
                    {shouldShowContact && (
                        <>
                            <View style={styles.divider} />
                            <SettingsRow 
                                icon="mail-outline" 
                                title={contactLabel} 
                                type="link" 
                                onPress={handleContactAdmin}
                            />
                        </>
                    )}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
                    <Text style={styles.logoutText}>{t("log_out")}</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Language Selection Modal */}
            <Modal visible={isLangModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsLangModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.langModalContent}>
                        <Text style={styles.modalTitle}>{t("select_language")}</Text>
                        {[
                            { id: "English", display: "English" }, 
                            { id: "Hindi", display: "Hindi (हिंदी)" }, 
                            { id: "Malayalam", display: "Malayalam (മലയാളം)" }
                        ].map((langObj, idx) => (
                            <TouchableOpacity key={idx} style={styles.langOptionBtn} onPress={() => handleLanguageSelect(langObj.id)}>
                                <Text style={[styles.langOptionText, language === langObj.id && { color: '#1F7A6B', fontWeight: 'bold' }]}>{langObj.display}</Text>
                                {language === langObj.id && <Ionicons name="checkmark-circle" size={20} color="#1F7A6B" />}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setIsLangModalVisible(false)}>
                            <Text style={styles.closeModalText}>{t("cancel")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Sync Result Modal */}
            <Modal visible={syncResult.visible} transparent={true} animationType="fade" onRequestClose={() => setSyncResult(prev => ({...prev, visible: false}))}>
                <View style={styles.modalOverlay}>
                    <View style={styles.langModalContent}>
                        <Ionicons name={syncResult.success ? "checkmark-circle" : "close-circle"} size={50} color={syncResult.success ? "#1F7A6B" : "#D32F2F"} style={{marginBottom: 10}} />
                        <Text style={styles.modalTitle}>{syncResult.title}</Text>
                        <Text style={{fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 20}}>{syncResult.message}</Text>
                        <TouchableOpacity style={[styles.closeModalBtn, { backgroundColor: syncResult.success ? '#1F7A6B' : '#D32F2F', marginTop: 10 }]} onPress={() => setSyncResult(prev => ({...prev, visible: false}))}>
                            <Text style={[styles.closeModalText, { color: '#FFF' }]}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#1F7A6B' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, backgroundColor: '#1F7A6B' },
    backBtn: { marginRight: 15 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    container: { flex: 1, backgroundColor: '#F4F6F8', paddingHorizontal: 15, paddingTop: 15 },
    
    profileCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
    avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F2F0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    roleBadge: { backgroundColor: '#1F7A6B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    roleText: { color: 'white', fontSize: 11, fontWeight: 'bold' },

    groupTitle: { fontSize: 14, fontWeight: 'bold', color: '#777', textTransform: 'uppercase', marginBottom: 8, marginLeft: 5 },
    cardGroup: { backgroundColor: '#FFF', borderRadius: 15, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, overflow: 'hidden' },
    
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    settingIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F2F0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    settingTextContainer: { flex: 1, marginRight: 10 },
    settingTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
    settingSubTitle: { fontSize: 12, color: '#888', marginTop: 3, lineHeight: 16 },
    
    linkRight: { flexDirection: 'row', alignItems: 'center' },
    rightText: { fontSize: 14, color: '#666', marginRight: 5 },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 66 },

    logoutBtn: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 15, padding: 18, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    logoutText: { color: '#D32F2F', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    langModalContent: { backgroundColor: '#FFF', width: '85%', borderRadius: 15, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
    langOptionBtn: { flexDirection: 'row', width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', justifyContent: 'space-between', alignItems: 'center' },
    langOptionText: { fontSize: 16, color: '#333' },
    closeModalBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 30, backgroundColor: '#f0f0f0', borderRadius: 8 },
    closeModalText: { fontSize: 15, fontWeight: 'bold', color: '#555' }
});
