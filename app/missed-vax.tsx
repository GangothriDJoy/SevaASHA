import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function MissedVaccinations() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState<any[]>([]);

    const isLaptop = width > 768;

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
        else Alert.alert(title, message);
    };

    const fetchMissedVax = async () => {
        try {
            setLoading(true);
            const todayISO = new Date().toISOString();
            
            // Bypassing compound missing index by parsing Due Date via JS
            const q = query(
                collection(db, "vaccine_cards"),
                where("status", "==", "Pending")
            );
            const querySnapshot = await getDocs(q);
            const groupedByChild: Record<string, any> = {};

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.dueDate && data.dueDate < todayISO) {
                    const childId = data.childId;
                    if (!groupedByChild[childId]) {
                        groupedByChild[childId] = {
                            childId: childId,
                            name: data.childName || "Unknown Patient",
                            parentMobile: data.parentMobile || "--",
                            missedVaccines: [],
                            isMother: false
                        };
                    }
                    groupedByChild[childId].missedVaccines.push(data.vaccineName);
                }
            });

            // Re-bind genuine maternal string metadata against raw childId UUIDs natively pulled from the vaccine record
            const ids = Object.keys(groupedByChild);
            if (ids.length > 0) {
                const p1 = getDocs(collection(db, "users")).then(snap => {
                    snap.forEach(doc => {
                        const id = doc.id;
                        if (groupedByChild[id] && groupedByChild[id].name === "Unknown Patient") {
                            groupedByChild[id].name = doc.data().firstName ? doc.data().firstName + " " + (doc.data().lastName || "") : "Unknown Mother";
                            groupedByChild[id].parentMobile = doc.data().userMobile || doc.data().mobile || "--";
                            groupedByChild[id].isMother = true;
                        }
                    });
                });

                const p2 = getDocs(collection(db, "beneficiaries")).then(snap => {
                    snap.forEach(doc => {
                        const id = doc.id;
                        if (groupedByChild[id] && groupedByChild[id].name === "Unknown Patient") {
                            groupedByChild[id].name = doc.data().fullName || doc.data().name || (doc.data().firstName ? doc.data().firstName + " " + (doc.data().lastName || "") : "Unknown Mother");
                            groupedByChild[id].parentMobile = doc.data().mobile || doc.data().userMobile || "--";
                            groupedByChild[id].isMother = true;
                        }
                    });
                });

                const p3 = getDocs(collection(db, "household_members")).then(snap => {
                    snap.forEach(doc => {
                        const id = doc.id;
                        if (groupedByChild[id] && groupedByChild[id].name === "Unknown Patient") {
                            groupedByChild[id].name = doc.data().name || "Unknown Household Member";
                            groupedByChild[id].parentMobile = doc.data().mobile || "--";
                            groupedByChild[id].isMother = true;
                        }
                    });
                });

                await Promise.all([p1, p2, p3]);
            }

            setList(Object.values(groupedByChild));
        } catch (error) {
            console.error(error);
            showAlert("Error", "Could not load vaccination records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMissedVax(); }, []);

    const renderItem = ({ item }: any) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => {
                if (item.isMother) {
                    router.push({
                        pathname: '/patient-details',
                        params: { userId: item.childId }
                    });
                } else {
                    router.push({
                        pathname: '/vaccine-card',
                        params: { childId: item.childId, childName: item.name }
                    });
                }
            }}
        >
            <View style={styles.row}>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.subText}>Contact: {item.parentMobile}</Text>
                    <View style={styles.vaxBadge}>
                        <Text style={styles.vaxText}>Overdue: {item.missedVaccines.join(', ')}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => showAlert("Calling", `Dialing ${item.parentMobile}...`)}
                >
                    <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.content, isLaptop && styles.laptopContent]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={28} color="#D32F2F" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Missed Vaccinations</Text>
                </View>

                {/* Village Red Flag Banner */}
                {list.length > 0 && (
                    <View style={styles.alertBanner}>
                        <Ionicons name="warning" size={28} color="#D32F2F" style={{ marginRight: 15 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.bannerTitle}>Village Health Red Flag</Text>
                            <Text style={styles.bannerText}>
                                {list.length} individuals have officially missed due dates based on the National Immunization Schedule. Investigate stock or mobilization needs.
                            </Text>
                        </View>
                    </View>
                )}

                {loading ? (
                    <ActivityIndicator size="large" color="#2980B9" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={list}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        ListEmptyComponent={<Text style={styles.empty}>Great! No missed vaccinations found.</Text>}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 15, flex: 1, backgroundColor: '#F4F6F8', alignItems: 'center' },
    content: { flex: 1, width: '100%', padding: 15 },
    laptopContent: { maxWidth: 800 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: Platform.OS === 'ios' ? 40 : 10 },
    title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15, color: '#D32F2F' },
    alertBanner: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    bannerTitle: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    bannerText: { color: '#B71C1C', fontSize: 13, lineHeight: 18 },
    card: { backgroundColor: 'white', padding: 15, marginBottom: 10, elevation: 2, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#D32F2F' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    info: { flex: 1, marginRight: 15 },
    name: { fontSize: 17, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 13, color: '#666', marginTop: 3 },
    vaxBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 10 },
    vaxText: { color: '#D32F2F', fontSize: 12, fontWeight: 'bold' },
    callBtn: { backgroundColor: '#27ae60', padding: 12, borderRadius: 25 },
    empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});