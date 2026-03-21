import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

const isWeb = Platform.OS === 'web';

export default function MemberProfile() {
    const { memberId, name, readOnly } = useLocalSearchParams();
    const router = useRouter();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isReadOnly = readOnly === 'true';

    useEffect(() => {
        if (memberId) {
            fetchHealthHistory();
        } else {
            setLoading(false);
        }
    }, [memberId]);

    const fetchHealthHistory = async () => {
        try {
            const q = query(
                collection(db, "health_records"),
                where("beneficiaryId", "==", memberId),
                orderBy("timestamp", "desc")
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHistory(list);
        } catch (error) {
            console.error("Error fetching history:", error);
            if (!isWeb) {
                Alert.alert("Error", "Could not fetch health records");
            } else {
                window.alert("Error: Could not fetch health records");
            }
        } finally {
            setLoading(false);
        }
    };

    const parseDate = (timestamp: any) => {
        if (!timestamp) return 'No Date';
        if (timestamp?.toDate) {
            return timestamp.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
        if (timestamp?.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        return 'Invalid Date';
    };

    const getRawDate = (timestamp: any) => {
        if (!timestamp) return new Date();
        if (timestamp?.toDate) return timestamp.toDate();
        if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) return d;
        return new Date();
    };

    const getRiskStatus = (type: string, value: string | number) => {
        if (value === undefined || value === null || value === "N/A" || value === "") return false;
        if (type === 'sugar') {
            const num = parseInt(value.toString());
            return !isNaN(num) && num > 140;
        }
        if (type === 'bp') {
            const parts = value.toString().split('/');
            if (parts.length > 0) {
                const sys = parseInt(parts[0]);
                return !isNaN(sys) && sys > 140;
            }
        }
        return false;
    };

    const referToJPHN = (item: any) => {
        const bp = item.bp || 'N/A';
        const sugar = item.bloodSugar || 'N/A';
        const message = `🚨 HIGH RISK ALERT\nPatient: ${name || 'Patient'}\nBP: ${bp}\nSugar: ${sugar} mg/dL\nPlease review.`;
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
        Linking.canOpenURL(url).then(supp => {
            if (supp) {
                Linking.openURL(url);
            } else {
                const msg = "WhatsApp is not installed on this device";
                isWeb ? window.alert(msg) : Alert.alert("Error", msg);
            }
        });
    };

    const getTrend = () => {
        if (history.length < 2) return null;
        const latest = parseInt(history[0].bloodSugar?.toString());
        const previous = parseInt(history[1].bloodSugar?.toString());
        if (isNaN(latest) || isNaN(previous)) return null;
        
        const diff = latest - previous;
        if (diff > 10) return { text: `Rising (+${diff})`, color: "#FFEBEE", textColor: "#D32F2F", icon: "trending-up" };
        if (diff < -10) return { text: `Improving (${diff})`, color: "#E8F5E9", textColor: "#2E7D32", icon: "trending-down" };
        return { text: "Stable", color: "#F5F5F5", textColor: "#616161", icon: "remove" };
    };

    const getMonthlyStats = () => {
        const now = new Date();
        return history.filter(item => {
            const d = getRawDate(item.timestamp);
            return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{name || 'Member Profile'}</Text>
                    <Text style={styles.headerSubtitle}>Comprehensive Health History</Text>
                </View>
                {!isReadOnly && (
                    <TouchableOpacity 
                        style={styles.addButton} 
                        onPress={() => router.push({ pathname: "/health-entry", params: { memberId, name } })}
                    >
                        <Ionicons name="add" size={24} color="#1F7A6B" />
                        <Text style={styles.addButtonText}>Record</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderSummary = () => {
        if (loading || history.length === 0) return null;
        const latest = history[0];
        const trend = getTrend();
        const visits = getMonthlyStats();

        return (
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryCardHeader}>
                        <Ionicons name="fitness" size={20} color="#1F7A6B" />
                        <Text style={styles.summaryCardTitle}>Latest Health Snapshot</Text>
                        <Text style={styles.summaryDate}>{parseDate(latest.timestamp)}</Text>
                    </View>

                    <View style={styles.snapshotGrid}>
                        <View style={styles.snapshotItem}>
                            <Text style={styles.snapshotLabel}>Blood Pressure</Text>
                            <Text style={[styles.snapshotValue, getRiskStatus('bp', latest.bp) && styles.dangerText]}>
                                {latest.bp || "--/--"}
                            </Text>
                        </View>
                        <View style={styles.snapshotDivider} />
                        <View style={styles.snapshotItem}>
                            <Text style={styles.snapshotLabel}>Blood Sugar</Text>
                            <Text style={[styles.snapshotValue, getRiskStatus('sugar', latest.bloodSugar) && styles.dangerText]}>
                                {latest.bloodSugar || "--"} <Text style={styles.unit}>mg/dL</Text>
                            </Text>
                        </View>
                        <View style={styles.snapshotDivider} />
                        <View style={styles.snapshotItem}>
                            <Text style={styles.snapshotLabel}>Hemoglobin</Text>
                            <Text style={styles.snapshotValue}>
                                {latest.hemoglobin || "--"} <Text style={styles.unit}>g/dL</Text>
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryFooter}>
                        {trend && (
                            <View style={[styles.badge, { backgroundColor: trend.color }]}>
                                <Ionicons name={trend.icon as any} size={14} color={trend.textColor} />
                                <Text style={[styles.badgeText, { color: trend.textColor }]}>Sugar: {trend.text}</Text>
                            </View>
                        )}
                        <View style={styles.badgeInfo}>
                            <Ionicons name="calendar" size={14} color="#1F7A6B" />
                            <Text style={styles.badgeInfoText}>{visits} Visit{visits !== 1 ? 's' : ''} This Month</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        const isHighSugar = getRiskStatus('sugar', item.bloodSugar);
        const isHighBP = getRiskStatus('bp', item.bp);
        const isEmergency = isHighSugar || isHighBP;

        return (
            <View style={[styles.recordCard, isEmergency && styles.recordCardEmergency]}>
                <View style={styles.recordHeader}>
                    <View style={styles.recordDateContainer}>
                        <Ionicons name="calendar-outline" size={16} color={isEmergency ? "#D32F2F" : "#666"} />
                        <Text style={[styles.recordDate, isEmergency && styles.dangerText]}>
                            {parseDate(item.timestamp)}
                        </Text>
                        {isEmergency && (
                            <View style={styles.riskBadge}>
                                <Text style={styles.riskBadgeText}>HIGH RISK</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.recordMetrics}>
                    <View style={styles.metricSquare}>
                        <Text style={styles.metricLabel}>BP</Text>
                        <Text style={[styles.metricValue, isHighBP && styles.dangerText]}>{item.bp || "--/--"}</Text>
                    </View>
                    <View style={styles.metricSquare}>
                        <Text style={styles.metricLabel}>Sugar</Text>
                        <Text style={[styles.metricValue, isHighSugar && styles.dangerText]}>{item.bloodSugar || "--"}</Text>
                    </View>
                    <View style={styles.metricSquare}>
                        <Text style={styles.metricLabel}>Weight</Text>
                        <Text style={styles.metricValue}>{item.weight ? `${item.weight} kg` : "--"}</Text>
                    </View>
                    <View style={styles.metricSquare}>
                        <Text style={styles.metricLabel}>Hb</Text>
                        <Text style={styles.metricValue}>{item.hemoglobin ? `${item.hemoglobin} g/dL` : "--"}</Text>
                    </View>
                </View>

                {item.notes ? (
                    <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{item.notes}</Text>
                    </View>
                ) : null}

                {isEmergency && (
                    <TouchableOpacity style={styles.referButton} onPress={() => referToJPHN(item)}>
                        <Ionicons name="logo-whatsapp" size={18} color="white" />
                        <Text style={styles.referButtonText}>Refer to JPHN</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}
            
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#1F7A6B" />
                    <Text style={styles.loaderText}>Loading Health Records...</Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={renderSummary}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyStateTitle}>No Records Found</Text>
                            <Text style={styles.emptyStateDesc}>There are no health records for this beneficiary yet.</Text>
                            {!isReadOnly && (
                                <TouchableOpacity 
                                    style={styles.emptyStateButton}
                                    onPress={() => router.push({ pathname: "/health-entry", params: { memberId, name } })}
                                >
                                    <Text style={styles.emptyStateButtonText}>Add First Record</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAF9",
    },
    header: {
        backgroundColor: "#1F7A6B",
        paddingTop: isWeb ? 20 : 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 800,
        alignSelf: 'center',
    },
    backButton: {
        padding: 5,
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: 15,
    },
    headerTitle: {
        color: "white",
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: "#A7F3D0",
        fontSize: 13,
        marginTop: 2,
        fontWeight: '500',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "white",
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    addButtonText: {
        color: "#1F7A6B",
        fontWeight: "bold",
        marginLeft: 4,
        fontSize: 14,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 15,
        color: "#666",
        fontSize: 16,
        fontWeight: "500",
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
    },
    summaryContainer: {
        marginBottom: 25,
    },
    summaryCard: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 20,
        shadowColor: "#1F7A6B",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 6,
        borderWidth: 1,
        borderColor: "rgba(31,122,107,0.1)",
    },
    summaryCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    summaryCardTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginLeft: 8,
        flex: 1,
    },
    summaryDate: {
        fontSize: 12,
        color: "#888",
        fontWeight: "500",
    },
    snapshotGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: "#F0Fdf4",
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
    },
    snapshotItem: {
        flex: 1,
        alignItems: 'center',
    },
    snapshotDivider: {
        width: 1,
        height: '70%',
        backgroundColor: 'rgba(31,122,107,0.2)',
    },
    snapshotLabel: {
        fontSize: 11,
        color: "#1F7A6B",
        fontWeight: "bold",
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    snapshotValue: {
        fontSize: 20,
        fontWeight: "900",
        color: "#333",
    },
    unit: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    dangerText: {
        color: "#D32F2F",
    },
    summaryFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "bold",
        marginLeft: 6,
    },
    badgeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#E0F2F1",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeInfoText: {
        color: "#00695C",
        fontSize: 12,
        fontWeight: "bold",
        marginLeft: 6,
    },
    recordCard: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 18,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: "#4DB6AC",
    },
    recordCardEmergency: {
        borderLeftColor: "#D32F2F",
        backgroundColor: "#FFF5F5",
    },
    recordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 10,
    },
    recordDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordDate: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#444",
        marginLeft: 8,
    },
    riskBadge: {
        backgroundColor: "#ffebee",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginLeft: 10,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    riskBadgeText: {
        color: "#D32F2F",
        fontSize: 10,
        fontWeight: "bold",
    },
    recordMetrics: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    metricSquare: {
        width: '47%',
        backgroundColor: "#F9FAFB",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    metricLabel: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "600",
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#111827",
    },
    notesContainer: {
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 4,
    },
    notesText: {
        fontSize: 13,
        color: '#444',
        lineHeight: 18,
        fontStyle: 'italic',
    },
    referButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#D32F2F",
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 15,
        shadowColor: "#D32F2F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    referButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 14,
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 15,
    },
    emptyStateDesc: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 25,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    emptyStateButton: {
        backgroundColor: '#1F7A6B',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: "#1F7A6B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    emptyStateButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});