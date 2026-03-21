import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, FlatList } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function VaccinationTracking() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const workerMobile = String(params.mobile || "").trim();

    const [activeTab, setActiveTab] = useState<'Children' | 'Pregnant'>('Children');
    const [childrenList, setChildrenList] = useState<any[]>([]);
    const [pregnantList, setPregnantList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchVaccinationTargets();
        }, [workerMobile])
    );

    const fetchVaccinationTargets = async () => {
        setLoading(true);
        try {
            // First fetch real pending vaccines
            const vcxQuery = query(collection(db, "vaccine_cards"), where("status", "==", "Pending"));
            const vcxSnap = await getDocs(vcxQuery);
            const vaxMap: Record<string, any[]> = {};
            vcxSnap.forEach(doc => {
                const data = doc.data();
                if (!vaxMap[data.childId]) vaxMap[data.childId] = [];
                vaxMap[data.childId].push(data);
            });

            const collectionRef = collection(db, "household_members");
            const benRef = collection(db, "beneficiaries");
            const usersRef = collection(db, "users");

            const qHm = workerMobile ? query(collectionRef, where("workerId", "==", workerMobile)) : query(collectionRef);
            const qBen = workerMobile ? query(benRef, where("workerId", "==", workerMobile)) : query(benRef);
            const qUsers = query(usersRef, where("role", "==", "Mother"));

            const hmSnap = await getDocs(qHm);
            const benSnap = await getDocs(qBen);
            const usersSnap = await getDocs(qUsers);

            const children: any[] = [];
            const pregnant: any[] = [];
            const today = new Date().toISOString();

            const processDoc = (doc: any) => {
                const data = doc.data();
                if (workerMobile && data.workerId !== workerMobile && data.ashaId !== workerMobile) return;

                const ageNum = parseInt(data.age);
                const isChild = data.isChild === true || data.category === "Child" || data.role === "Child" || (!isNaN(ageNum) && ageNum <= 5);
                const isPregnant = data.isPregnant === true || data.pregnancyStatus === "Pregnant" || data.category === "Pregnant";

                if (isChild) {
                    const pendingVax = vaxMap[doc.id] || [];
                    if (pendingVax.length > 0) {
                        pendingVax.sort((a: any, b: any) => (a.dueDate < b.dueDate ? -1 : 1));
                        const nextVax = pendingVax[0];
                        data.nextVaccine = nextVax.vaccineName;
                        data.vaccineStatus = nextVax.dueDate < today ? 'Overdue' : 'Due Soon';
                    } else {
                        data.nextVaccine = "All Caught Up";
                        data.vaccineStatus = "Completed";
                    }
                    children.push({ id: doc.id, ...data });
                }

                if (data.childrenDetails && Array.isArray(data.childrenDetails)) {
                    data.childrenDetails.forEach((child: any, index: number) => {
                        let dobStr = "Unknown Date";
                        if (child.age && !isNaN(parseInt(child.age))) {
                            const d = new Date();
                            d.setFullYear(d.getFullYear() - parseInt(child.age));
                            dobStr = d.toISOString().split('T')[0];
                        }

                        const childId = `${doc.id}_child_${index}`;
                        const cData = {
                            ...child,
                            id: childId,
                            name: child.name || "Child",
                            dobString: dobStr,
                            gender: child.gender || "N/A",
                            nextVaccine: "All Caught Up",
                            vaccineStatus: "Completed"
                        };

                        const pendingVax = vaxMap[childId] || [];
                        if (pendingVax.length > 0) {
                            pendingVax.sort((a: any, b: any) => (a.dueDate < b.dueDate ? -1 : 1));
                            const nextVax = pendingVax[0];
                            cData.nextVaccine = nextVax.vaccineName;
                            cData.vaccineStatus = nextVax.dueDate < today ? 'Overdue' : 'Due Soon';
                        }

                        children.push(cData);
                    });
                }

                if (isPregnant) {
                    const pendingVax = vaxMap[doc.id] || [];
                    if (pendingVax.length > 0) {
                        pendingVax.sort((a: any, b: any) => (a.dueDate < b.dueDate ? -1 : 1));
                        const nextVax = pendingVax[0];
                        data.nextVaccine = nextVax.vaccineName;
                        data.vaccineStatus = nextVax.dueDate < today ? 'Overdue' : 'Due Soon';
                    } else {
                        data.nextVaccine = "All Caught Up";
                        data.vaccineStatus = "Completed";
                    }
                    pregnant.push({ id: doc.id, ...data });
                }
            };

            hmSnap.forEach(processDoc);
            benSnap.forEach(processDoc);
            usersSnap.forEach(processDoc);

            // For registered beneficiaries that might have been saved with `ashaId` instead of `workerId`
            if (workerMobile) {
                const qBenAsha = query(benRef, where("ashaId", "==", workerMobile));
                const benAshaSnap = await getDocs(qBenAsha);
                benAshaSnap.forEach((doc) => {
                    // Prevent duplicates
                    if (!children.find(c => c.id === doc.id) && !pregnant.find(p => p.id === doc.id)) {
                        processDoc(doc);
                    }
                });
            }

            // Deduplicate safely
            const uniqueChildren = Array.from(new Map(children.map(item => [item.id, item])).values());
            const uniquePregnant = Array.from(new Map(pregnant.map(item => [item.id, item])).values());

            // SORT children so Overdue appears strictly at the top!
            uniqueChildren.sort((a: any, b: any) => {
                const mapScore = (status: string) => status === 'Overdue' ? 2 : status === 'Due Soon' ? 1 : 0;
                return mapScore(b.vaccineStatus) - mapScore(a.vaccineStatus);
            });

            setChildrenList(uniqueChildren);
            setPregnantList(uniquePregnant);
        } catch (error) {
            console.error("Error fetching vaccination targets:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter active list based on search and tab
    const getFilteredData = () => {
        const sourceList = activeTab === 'Children' ? childrenList : pregnantList;
        if (!searchQuery.trim()) return sourceList;

        return sourceList.filter(item =>
            (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.houseId && item.houseId.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    };

    const renderCard = ({ item }: { item: any }) => {
        const isChild = activeTab === 'Children';
        const mockStatus = item.vaccineStatus || 'Completed';
        const statusColor = mockStatus === 'Overdue' ? '#D32F2F' : (mockStatus === 'Due Soon' ? '#F57C00' : '#2E7D32');

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    if (isChild) {
                        router.push({
                            pathname: "/vaccine-card",
                            params: {
                                childId: item.id,
                                childName: item.name,
                                dob: item.dobString || item.dob || "--",
                                readOnly: workerMobile ? 'false' : 'true'
                            }
                        });
                    } else {
                        router.push({
                            pathname: "/patient-details",
                            params: {
                                userId: item.id,
                                readOnly: workerMobile ? 'false' : 'true'
                            }
                        });
                    }
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.avatarCircle}>
                        <Ionicons name={isChild ? "happy" : "woman"} size={24} color="#1F7A6B" />
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.nameText}>{item.name}</Text>
                        <Text style={styles.subText}>House: {item.houseId} • {isChild ? `Age: ${item.age}` : `Pregnant`}</Text>
                    </View>
                </View>

                <View style={styles.vaccineDetails}>
                    <View>
                        <Text style={styles.vaccineLabel}>Next Vaccine:</Text>
                        <Text style={styles.vaccineName}>{item.nextVaccine}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{mockStatus}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/');
                        }
                    }}
                    style={{ paddingRight: 15, paddingVertical: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Immunization Tracker</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Children' && styles.activeTab]}
                    onPress={() => setActiveTab('Children')}
                >
                    <Text style={[styles.tabText, activeTab === 'Children' && styles.activeTabText]}>Children (0-5y)</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{childrenList.length}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Pregnant' && styles.activeTab]}
                    onPress={() => setActiveTab('Pregnant')}
                >
                    <Text style={[styles.tabText, activeTab === 'Pregnant' && styles.activeTabText]}>Pregnant Women</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{pregnantList.length}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchSection}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    placeholder="Search by name or house ID"
                    placeholderTextColor="#666"
                    style={[styles.searchInput, { color: '#333' }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#1F7A6B" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={getFilteredData()}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    renderItem={renderCard}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            No {activeTab === 'Children' ? 'children' : 'pregnant women'} found.
                        </Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    header: { backgroundColor: "#1F7A6B", padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 15 },

    tabContainer: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
    tab: { flex: 1, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#1F7A6B' },
    tabText: { fontSize: 15, fontWeight: '600', color: '#666' },
    activeTabText: { color: '#1F7A6B', fontWeight: 'bold' },
    countBadge: { backgroundColor: '#E0F2F1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8 },
    countText: { color: '#1F7A6B', fontSize: 12, fontWeight: 'bold' },

    searchSection: { flexDirection: 'row', backgroundColor: 'white', margin: 15, borderRadius: 10, alignItems: 'center', paddingHorizontal: 15, elevation: 1, borderWidth: 1, borderColor: '#eee' },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 45, fontSize: 15 },

    listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 10 },
    avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardInfo: { flex: 1 },
    nameText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 13, color: '#666', marginTop: 2 },

    vaccineDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    vaccineLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
    vaccineName: { fontSize: 14, fontWeight: 'bold', color: '#1F7A6B' },

    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 15 }
});