import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Alert } from "react-native";


// --- MOCK DATABASE ---
// Since we don't have a real backend yet, we simulate registered users here.
// You can add more dummy users to test different roles!
const mockRegisteredUsers = [
    { role: "ASHA Worker", mobile: "9876543210", password: "Password1!" },
    { role: "Mother", mobile: "9998887776", password: "Password2!" },
    { role: "Supervisor", mobile: "1112223334", password: "Password1!" }
];

export default function Auth() {
    const router = useRouter();

    const [role, setRole] = useState("ASHA Worker");
    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState(""); // State to hold our error text

    const handleLogin = async () => {
        // 1. Basic validation
        if (!mobile || !password) {
            Alert.alert("Error", "Please enter both mobile number and password.");
            return;
        }

        // 2. Prepare credentials
        const cleanMobile = mobile.trim();
        const cleanPassword = password.trim();
        const authEmail = `${cleanMobile}@sevaasha.com`;

        try {
            // 3. Authenticate with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, authEmail, cleanPassword);
            const user = userCredential.user;

            const collectionName = role === "Mother" ? "beneficiaries" : "users";
            // 4. Fetch the user's "Official Profile" from Firestore
            const userDocRef = doc(db, collectionName, user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();

                // --- 🛑 SECURITY ROLE CHECK ---
                // This compares the button you clicked vs what's in the database
                if (userData.role !== role) {
                    await auth.signOut(); // Kick them out if it doesn't match
                    Alert.alert(
                        "Access Denied",
                        `This account is registered as a ${userData.role}. You cannot log in as a ${role}.`
                    );
                    return;
                }

                // --- ⏳ APPROVAL CHECK ---
                if (userData.status === "Pending") {
                    await auth.signOut();
                    Alert.alert(
                        "Account Pending",
                        "Your account is waiting for Admin approval."
                    );
                    return;
                }

                // --- ✅ SUCCESS: Redirect to Dashboard ---
                router.replace({
                    pathname: "/dashboard",
                    params: {
                        role: userData.role,
                        mobile: userData.mobile,
                        name: userData.fullName
                    }
                });

            } else {
                Alert.alert("Error", "User profile not found in database.");
            }

        } catch (error: any) {
            console.error("Login Error:", error.code);
            Alert.alert("Login Failed", "Incorrect mobile number or password.");
        }

// Use cleanPassword in the signIn function

        if (!mobile || !password) {
            Alert.alert("Error", "Please enter both mobile number and password.");
            return;
        }

        // Recreate the fake email we used during registration

};


    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}>Login</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
                <Text style={styles.label}>Select Role</Text>

                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={role}
                        onValueChange={(itemValue) => setRole(itemValue)}
                    >
                        <Picker.Item label="ASHA Worker" value="ASHA Worker" />
                        <Picker.Item label="Anganwadi Worker" value="Anganwadi Worker" />
                        <Picker.Item label="JPHN" value="JPHN" />
                        <Picker.Item label="Supervisor" value="Supervisor" />
                        <Picker.Item label="Mother / Beneficiary" value="Mother" />
                    </Picker>
                </View>

                <TextInput
                    placeholder="Mobile Number"
                    style={styles.input}
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                />

                <View style={styles.passwordContainer}>
                    <TextInput
                        placeholder="Password"
                        secureTextEntry={!showPassword}
                        style={styles.passwordInput}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#777" />
                    </TouchableOpacity>
                </View>

                {/* Conditionally render the error message if it exists */}
                {errorMessage ? (
                    <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}

                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLogin} // Changed this from router.push to our new function
                >
                    <Text style={styles.loginText}>LOGIN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push("/register")}
                >
                    <Text style={styles.registerLink}>New user? Register here</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F6F8",
    },
    header: {
        backgroundColor: "#1F7A6B",
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    headerText: {
        color: "white",
        fontSize: 22,
        fontWeight: "bold",
    },
    form: {
        padding: 20,
    },
    label: {
        marginBottom: 8,
        fontWeight: "500",
    },
    pickerContainer: {
        backgroundColor: "white",
        borderRadius: 10,
        marginBottom: 15,
    },
    input: {
        backgroundColor: "white",
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 10,
        marginBottom: 15,
    },
    passwordInput: {
        flex: 1,
        padding: 15,
    },
    eyeIcon: {
        padding: 15,
    },
    loginButton: {
        backgroundColor: "#4CAF50",
        padding: 16,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
    },
    loginText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    registerLink: {
        textAlign: "center",
        marginTop: 20,
        color: "#1F7A6B",
        fontWeight: "500",
    },
    // Added style for the error text
    errorText: {
        color: "red",
        textAlign: "center",
        marginBottom: 10,
        fontWeight: "500",
    }
});
