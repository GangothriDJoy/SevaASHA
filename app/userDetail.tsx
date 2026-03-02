import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function UserDetail() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userId = Array.isArray(params.userId) ? params.userId : params.userId;const collectionName = Array.isArray(params.collection) ? params.collection : params.collection;
    const [userData, setUserData] = useState<any>({
        firstName: "",
        lastName: "",
        role: "",
        mobile: "",
        registrationDate: "",
        status: "Pending"
    });const [loading, setLoading] = useState(true);
    const safeUserId = String(userId || "");
    const safeCollection = String(collectionName || "users");
    //const safeId = userId ?? "";
    //const safeCol = collectionName ?? "users";
    // --- 2. NOTIFICATION HELPER ---
    const sendNotification = (mobile: string, message: string) => {
        console.log(`Notification to ${mobile}: ${message}`);
        if (Platform.OS === 'web') {
            alert(`SMS Simulation: ${message}`);
        }
    };

    // --- 3. FETCH USER DATA ---
    useEffect(() => {
        const fetchFullDetails = async () => {
            if (!userId || !collectionName) {
                const msg = "Missing User ID or Collection Information";
                Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
                return;
            }

            try {
                const docRef = doc(db, safeCollection, safeUserId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    console.log("Fetched User Data:", docSnap.data()); // 🔍 Check this in your terminal!
                    setUserData(docSnap.data());
                } else {
                    const msg = "User profile not found.";
                    Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
                }
            } catch (error) {
                console.error("Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFullDetails();
    }, [userId, collectionName]);

    // --- 4. APPROVE / REJECT LOGIC ---
    const handleFinalDecision = async (status: 'Approved' | 'Rejected') => {
        try {
            const userRef = doc(db, safeCollection as string, safeUserId as string);
            if (status === 'Approved') {
                await updateDoc(userRef, { status: 'Approved' });
                sendNotification(userData.mobile, "Your SevaASHA account has been Approved!");
            } else {
                // For rejection, we typically delete the pending request
                await deleteDoc(userRef);
                sendNotification(userData.mobile, "Your SevaASHA registration was not approved.");
            }

            const successMsg = `User has been ${status} successfully.`;
            if (Platform.OS === 'web') {
                alert(successMsg);
                router.replace("/dashboard");
            } else {
                Alert.alert("Success", successMsg, [{ text: "OK", onPress: () => router.replace("//dashboard") }]);
            }
        } catch (error) {
            console.error("Decision Error:", error);
            const errorMsg = "Failed to update user status.";
            Platform.OS === 'web' ? alert(errorMsg) : Alert.alert("Error", errorMsg);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1F7A6B" />
                <Text>Loading profile details...</Text>
            </View>
        );
    }

    if (!userData) return null;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Review Registration</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Personal Details</Text>
                <View style={styles.detailBox}>
                    <DetailItem
                        label="Full Name"
                        value={userData?.fullName || (userData?.firstName ? `${userData.firstName} ${userData.lastName}` : "Name not found")}
                    />
                    <DetailItem label="Mobile Number" value={userData.mobile} />
                    <DetailItem label="Role" value={userData.role} />
                    <DetailItem label="Registration Date" value={userData.createdAt || "N/A"} />
                </View>

                {/* Add additional fields here if you have them in Firestore */}
                <Text style={styles.sectionTitle}>Account Status</Text>
                <View style={styles.detailBox}>
                    <DetailItem label="Current Status" value={userData.status} color="#E65100" />
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleFinalDecision('Approved')}
                    >
                        <Text style={styles.buttonText}>APPROVE USER</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleFinalDecision('Rejected')}
                    >
                        <Text style={styles.buttonText}>REJECT</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

// Small helper component for clean layout
const DetailItem = ({ label, value, color = "#333" }: { label: string, value: string, color?: string }) => (
    <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, { color }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
        backgroundColor: "#1F7A6B",
        paddingVertical: 20,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center"
    },
    headerText: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 15 },
    content: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#666", marginBottom: 10, marginTop: 10 },
    detailBox: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3
    },
    detailItem: { marginBottom: 15 },
    detailLabel: { fontSize: 12, color: "#999", textTransform: "uppercase", marginBottom: 2 },
    detailValue: { fontSize: 16, fontWeight: "500" },
    buttonRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 10 },
    actionButton: { flex: 1, padding: 16, borderRadius: 10, alignItems: "center" },
    approveButton: { backgroundColor: "#2E7D32" },
    rejectButton: { backgroundColor: "#D32F2F" },
    buttonText: { color: "white", fontWeight: "bold", fontSize: 14 }
});