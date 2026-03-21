import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet, Platform,
} from "react-native";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Alert } from "react-native";

export default function Auth() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        mobile: '',
        password: '',
    });
    const [hasAttempted, setHasAttempted] = useState(false);
    const [role, setRole] = useState("");
    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState(""); // State to hold our error text
    const isRoleSelected = role !== "" && role !== "-Select-";
    const handleForgotPassword = async () => {
        if (!mobile) { // ✅ Use the 'mobile' state you defined
            const msg = "Please enter your registered mobile number first.";
            Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
            return;
        }

        // Since we use mobile@sevaasha.com as the internal email:
        const authEmail = `${formData.mobile}@sevaasha.com`;

        try {
            const auth = getAuth();
            await sendPasswordResetEmail(auth, authEmail);

            const successMsg = "A password reset link has been sent to your registered email associated with this account.";
            Platform.OS === 'web' ? alert(successMsg) : Alert.alert("Success", successMsg);
        } catch (error: any) {
            console.error(error);
            const errorMsg = "Could not send reset email. Please ensure the mobile number is correct.";
            Platform.OS === 'web' ? alert(errorMsg) : Alert.alert("Error", errorMsg);
        }
    };
    const handleLogin = async () => {
        setHasAttempted(true);
        if (!role || role === "") { return; }
        if (!mobile || !password) {
            const msg = "Please enter both mobile number and password.";

            if (Platform.OS === 'web') {
                alert(msg); // 💻 Shows on Laptop
            } else {
                Alert.alert("Error", msg); // 📱 Shows on Mobile
            }
            return;
        }

        // 2. Prepare credentials
        const cleanMobile = mobile.trim();
        const cleanPassword = password.trim();
        const authEmail = `${cleanMobile}@sevaasha.com`;

        try {
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
                    await auth.signOut();
                    const msg = `This account is registered as ${userData.role}. You cannot log in as ${role}.`;
                    if (Platform.OS === 'web') {
                        alert(msg);
                    } else {
                        Alert.alert("Access Denied", msg);
                    }
                    return;
                }

                // --- ⏳ APPROVAL CHECK ---
                if (userData.status === "Pending") {
                    await auth.signOut();
                    const msg = "Your account is waiting for Admin approval.";
                    if (Platform.OS === 'web') {
                        alert(msg);
                    } else {
                        Alert.alert("Account Pending", msg);
                    }
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
                const msg = "User profile not found in database.";
                Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
            }

        } catch (error: any) {
            //console.error("Login Error:", error.code);

            const errorTitle = "Login Failed";
            const errorMessage = "Incorrect mobile number or password.";

            if (Platform.OS === 'web') {
                // This is what makes it show up on your Laptop
                alert(`${errorTitle}: ${errorMessage}`);
            } else {
                // This keeps it working on the Mobile Phone
                Alert.alert(errorTitle, errorMessage);
            }
        }
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
                {/* --- ROLE SELECTION --- */}
                {Platform.OS === "web" ? (
                    /* --- 💻 LAPTOP / WEB DROPDOWN --- */
                    // @ts-ignore
                    <select
                        value={role || ""}
                        onChange={(e: any) => setRole(e.target.value)}
                        style={{
                            padding: 15,
                            borderRadius: 10,
                            borderWidth: 1,
                            // Keeps your validation logic active on the web!
                            borderColor: (hasAttempted && !isRoleSelected) ? "red" : "#ccc",
                            backgroundColor: "white",
                            fontSize: 16,
                            fontFamily: "inherit",
                            width: "100%",
                            marginBottom: 15,
                            boxSizing: "border-box",
                            cursor: "pointer",
                            outline: "none",
                            color: (role === "-Select-" || role === "Not Selected") ? "#999" : "#000",
                        }}
                    >
                        <option value="" hidden style={{ color: "#999" }}>-Select-</option>
                        <option value="" disabled>-Select-</option>
                        <option value="ASHA Worker">ASHA Worker</option>
                        <option value="Anganwadi Worker">Anganwadi Worker</option>
                        <option value="JPHN">JPHN</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Mother">Mother / Beneficiary</option>
                    </select>
                ) : (
                    /* --- 📱 MOBILE PICKER --- */
                    <View style={[
                        styles.pickerContainer,
                        hasAttempted && !isRoleSelected && { borderColor: 'red', borderWidth: 1 }
                    ]}>
                        <Picker
                            selectedValue={role}
                            onValueChange={(val) => {
                                if (val !== "")
                                    setRole(val);
                            }}
                        >
                            {role === "" && (
                                <Picker.Item label="-Select-" value="" color="#999" />
                            )}
                            <Picker.Item label="ASHA Worker" value="ASHA Worker" />
                            <Picker.Item label="Anganwadi Worker" value="Anganwadi Worker" />
                            <Picker.Item label="JPHN" value="JPHN" />
                            <Picker.Item label="Supervisor" value="Supervisor" />
                            <Picker.Item label="Mother / Beneficiary" value="Mother" />
                        </Picker>
                    </View>
                )}

                {/* Error Message */}
                {hasAttempted && !isRoleSelected && (
                    <Text style={[styles.errorText, { marginTop: 5 }]}>
                        Please select a valid account type to continue.
                    </Text>
                )}
                <TextInput
                    placeholder="Mobile Number"
                    style={[
                        styles.input,
                        // Optional: turns border red if user started typing but hasn't reached 10 digits
                        hasAttempted && mobile.length > 0 && mobile.length !== 10 ? { borderColor: 'red' } : null
                    ]}
                    value={mobile}
                    // This regex replaces any non-digit character with an empty string
                    onChangeText={(val) => setMobile(val.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    maxLength={10} // Prevents typing more than 10 digits
                />

                {/* 2. Add the Conditional Alert Message */}
                {mobile.length > 0 && mobile.length < 10 && (
                    <Text style={styles.warningText}>
                        Mobile number must be exactly 10 digits.
                    </Text>
                )}

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
                    onPress={() => router.push("/ForgotPassword")} // ⬅️ Points to your new page
                    style={{ marginTop: 15, marginBottom: 15, alignSelf: 'center' }}
                >
                    <Text style={{
                        color: '#007AFF',
                        fontSize: 14,
                        fontWeight: '500',
                        textDecorationLine: Platform.OS === 'web' ? 'underline' : 'none',
                        cursor: Platform.OS === 'web' ? 'pointer' : 'default',
                    } as any}>
                        Forgot Password?
                    </Text>
                </TouchableOpacity>

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
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1F7A6B",
        marginTop: 10,
        marginBottom: 15
    },
    requiredNote: {
        fontSize: 13,
        color: "#666",
        fontStyle: "italic",
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    mandatoryStar: {
        color: "red",
        marginLeft: 3,
        fontWeight: "bold",
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 5
    },
    warningText: {
        color: "#FF9800", // Orange/Amber color for a warning
        fontSize: 12,
        marginTop: -10,   // Pulls it closer to the input field
        marginBottom: 10,
        paddingLeft: 5,
        fontWeight: "500",
    }
});