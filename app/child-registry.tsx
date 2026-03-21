import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function ChildRegistry() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.workerMobile || "").trim();
    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('0-3m');
    const tabs = ['0-3m', '3-6m', '6m-3y', '3-5y', '5-12y', '12-18y Boys', '12-18y Girls'];

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const list: any[] = [];
                
                const processDoc = (doc: any, collectionType: string) => {
                    const data = doc.data();
                    if (workerMobile && data.workerId !== workerMobile && data.ashaId !== workerMobile) return;

                    const calculateExactMonths = (dobStr: string, ageStr: string) => {
                        let m = 0;
                        if (dobStr && dobStr !== "Unknown Date") {
                            const dobDate = new Date(dobStr);
                            if (!isNaN(dobDate.getTime())) {
                                const today = new Date();
                                m = (today.getFullYear() - dobDate.getFullYear()) * 12 + today.getMonth() - dobDate.getMonth();
                                if (today.getDate() < dobDate.getDate()) m--;
                            }
                        } else if (ageStr && !isNaN(parseInt(ageStr))) {
                            m = parseInt(ageStr) * 12;
                        }
                        return Math.max(0, m);
                    };

                    // 1. If the main document is a child itself
                    if (data.vaccinationStatus || data.category === "Child" || data.isChild === true || (data.age && parseInt(data.age) <= 18)) {
                        const m = calculateExactMonths(data.dobString, data.age);
                        list.push({ id: doc.id, collectionType, exactMonths: m, ...data });
                    }

                    // 2. If the document has nested children arrays (e.g., from a Mother's profile)
                    if (data.childrenDetails && Array.isArray(data.childrenDetails)) {
                        data.childrenDetails.forEach((child: any, index: number) => {
                            let dobStr = child.dobString || "Unknown Date";
                            if (dobStr === "Unknown Date" && child.age && !isNaN(parseInt(child.age))) {
                                const d = new Date();
                                d.setFullYear(d.getFullYear() - parseInt(child.age));
                                dobStr = d.toISOString().split('T')[0];
                            }
                            
                            const m = calculateExactMonths(dobStr, child.age);

                            list.push({
                                ...child,
                                id: `${doc.id}_child_${index}`,
                                parentId: doc.id,
                                childIndex: index,
                                collectionType,
                                parentName: data.fullName || data.name || data.firstName || "Unknown Parent",
                                dobString: dobStr,
                                exactMonths: m,
                                gender: child.gender || "N/A",
                                vaccinationStatus: child.vaccinated === "Yes" ? "Completed" : "Pending",
                                isNested: true
                            });
                        });
                    }
                };

                const [benSnap, hmSnap, usersSnap] = await Promise.all([
                    getDocs(query(collection(db, "beneficiaries"))),
                    getDocs(query(collection(db, "household_members"))),
                    getDocs(query(collection(db, "users"), where("role", "==", "Mother")))
                ]);

                benSnap.forEach(d => processDoc(d, "beneficiaries"));
                hmSnap.forEach(d => processDoc(d, "household_members"));
                usersSnap.forEach(d => processDoc(d, "users"));

                const uniqueChildren = Array.from(new Map(list.map(item => [item.id, item])).values());
                setChildren(uniqueChildren);
            } catch (err) {
                console.log("Error fetching children:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChildren();
    }, [workerMobile]);

    const filteredChildren = children.filter(c => {
        const m = c.exactMonths || 0;
        const g = String(c.gender || "").toLowerCase();
        switch(activeTab) {
            case '0-3m': return m <= 3;
            case '3-6m': return m > 3 && m <= 6;
            case '6m-3y': return m > 6 && m <= 36;
            case '3-5y': return m > 36 && m <= 60;
            case '5-12y': return m > 60 && m <= 144;
            case '12-18y Boys': return m > 144 && m <= 216 && (g === 'male' || g === 'boy' || g === 'm');
            case '12-18y Girls': return m > 144 && m <= 216 && (g === 'female' || g === 'girl' || g === 'f');
            default: return false;
        }
    });

    const renderItem = ({ item }: any) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push({
                pathname: '/child-details' as any,
                params: {
                    childId: item.id,
                    parentId: item.parentId || '',
                    childIndex: item.childIndex !== undefined ? item.childIndex.toString() : '',
                    collectionType: item.collectionType || 'beneficiaries',
                    isNested: item.isNested ? 'true' : 'false',
                    readOnly: workerMobile ? 'false' : 'true'
                }
            })}
        >
            <View style={styles.avatar}>
                <Ionicons name="happy" size={24} color="#1976D2" />
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name || item.firstName || "Child Record"}</Text>
                <Text style={styles.subText}>
                    {item.isNested ? `Mother: ${item.parentName} • ` : ''}Gender: {item.gender || "N/A"} • Vax: {item.vaccinationStatus || "Pending"}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Child Registry</Text>
            </View>

            <View style={styles.tabScrollContainer}>
                <FlatList
                    data={tabs}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={t => t}
                    renderItem={({item}) => (
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === item && styles.activeTabBtn]} 
                            onPress={() => setActiveTab(item)}
                        >
                            <Text style={[styles.tabBtnText, activeTab === item && styles.activeTabBtnText]}>
                                {item.replace('m', ' Months').replace('y', ' Years')}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={filteredChildren}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.empty}>No child records found in this age group.</Text>}
                    />
                )}
            </View>
            
            {/* FAB for Registering New Birth */}
            <TouchableOpacity 
                style={styles.fab}
                onPress={() => router.push({ pathname: '/register-birth', params: { workerMobile } })}
            >
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#1976D2' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#1976D2' },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    container: { flex: 1, backgroundColor: '#F4F7FB', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
    list: { paddingBottom: 30 },
    card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 12, elevation: 2, alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 13, color: '#666', marginTop: 3 },
    empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
    fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#1976D2', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
    
    tabScrollContainer: { backgroundColor: '#1976D2', paddingBottom: 15 },
    tabBtn: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
    activeTabBtn: { backgroundColor: '#FFF' },
    tabBtnText: { color: '#FFF', fontWeight: '600' },
    activeTabBtnText: { color: '#1976D2', fontWeight: 'bold' }
});
