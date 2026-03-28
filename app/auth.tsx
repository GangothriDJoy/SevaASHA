import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet, 
    Platform,
    Image,
    KeyboardAvoidingView,
    ScrollView,
    SafeAreaView,
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
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    
                    {/* Top Decorated Header */}
                    <View style={styles.topSection}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../logo.jpeg')}
                                style={styles.logo}
                                resizeMode="cover"
                            />
                        </View>
                        <Text style={styles.welcomeTitle}>Welcome to SevaASHA!</Text>
                        <Text style={styles.welcomeSubtitle}>Sign in to your account</Text>
                    </View>

                    {/* Form inside a Card */}
                    <View style={styles.card}>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Role</Text>
                            {Platform.OS === "web" ? (
                                // @ts-ignore
                                <select
                                    value={role || ""}
                                    onChange={(e: any) => setRole(e.target.value)}
                                    style={{
                                        padding: 15,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: (hasAttempted && !isRoleSelected) ? "red" : "#E2E8F0",
                                        backgroundColor: "#F8FAFC",
                                        fontSize: 16,
                                        fontFamily: "inherit",
                                        width: "100%",
                                        boxSizing: "border-box",
                                        cursor: "pointer",
                                        outline: "none",
                                        color: (role === "-Select-" || role === "Not Selected") ? "#94A3B8" : "#0F172A",
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
                                <View style={[
                                    styles.pickerContainer,
                                    hasAttempted && !isRoleSelected && { borderColor: 'red', borderWidth: 1 }
                                ]}>
                                    <Picker
                                        selectedValue={role}
                                        style={{ color: '#0F172A' }}
                                        dropdownIconColor="#94A3B8"
                                        onValueChange={(val) => {
                                            if (val !== "") setRole(val);
                                        }}
                                    >
                                        {role === "" && (
                                            <Picker.Item label="-Select-" value="" color="#94A3B8" />
                                        )}
                                        <Picker.Item label="ASHA Worker" value="ASHA Worker" />
                                        <Picker.Item label="Anganwadi Worker" value="Anganwadi Worker" />
                                        <Picker.Item label="JPHN" value="JPHN" />
                                        <Picker.Item label="Supervisor" value="Supervisor" />
                                        <Picker.Item label="Mother / Beneficiary" value="Mother" />
                                    </Picker>
                                </View>
                            )}
                            
                            {hasAttempted && !isRoleSelected && (
                                <Text style={styles.errorText}>
                                    Please select a valid account type to continue.
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={[
                                styles.inputContainer,
                                hasAttempted && mobile.length > 0 && mobile.length !== 10 ? { borderColor: 'red' } : null
                            ]}>
                                <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Mobile Number"
                                    placeholderTextColor="#94A3B8"
                                    style={styles.input}
                                    value={mobile}
                                    onChangeText={(val) => setMobile(val.replace(/[^0-9]/g, ''))}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                            </View>
                            {mobile.length > 0 && mobile.length < 10 && (
                                <Text style={styles.warningText}>
                                    Mobile number must be exactly 10 digits.
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.passwordContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Password"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showPassword}
                                    style={styles.passwordInput}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {errorMessage ? (
                            <Text style={styles.errorTextGlobal}>{errorMessage}</Text>
                        ) : null}

                        <TouchableOpacity
                            onPress={() => router.push("/ForgotPassword")}
                            style={styles.forgotBtn}
                        >
                            <Text style={styles.forgotText}>
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.loginText}>LOGIN</Text>
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            onPress={() => router.push("/register")}
                            style={styles.registerBtn}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.registerText}>New user? <Text style={styles.registerTextBold}>Register here</Text></Text>
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#1F7A6B",
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 20,
    },
    topSection: {
        alignItems: "center",
        marginBottom: 30,
        marginTop: 10,
    },
    logoContainer: {
        width: 100,
        height: 100,
        backgroundColor: '#FFFFFF', 
        borderRadius: 50,     
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        overflow: 'hidden',   
    },
    logo: {
        width: '100%',
        height: '100%',
        transform: [
            { scale: 1.65 },
            { translateY: 5 },
            { translateX: -1 }
        ],
    },
    welcomeTitle: {
        fontSize: 28,
        color: "white",
        fontWeight: "bold",
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: "#E2E8F0",
        fontWeight: "500",
    },
    card: {
        backgroundColor: "white",
        borderRadius: 24,
        padding: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#0F172A",
        marginBottom: 24,
        textAlign: "center",
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        fontWeight: "600",
        color: "#334155",
        fontSize: 14,
    },
    pickerContainer: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        overflow: "hidden",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        color: '#0F172A',
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 14,
        color: '#0F172A',
        fontSize: 16,
    },
    eyeIcon: {
        padding: 8,
    },
    errorText: {
        color: "#EF4444",
        fontSize: 12,
        marginTop: 6,
        fontWeight: "500",
    },
    errorTextGlobal: {
        color: "#EF4444",
        textAlign: "center",
        marginBottom: 12,
        fontWeight: "600",
        fontSize: 14,
    },
    warningText: {
        color: "#F59E0B",
        fontSize: 12,
        marginTop: 6,
        fontWeight: "500",
    },
    forgotBtn: {
        alignSelf: 'center',
        marginVertical: 4,
    },
    forgotText: {
        color: '#1F7A6B',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: Platform.OS === 'web' ? 'underline' : 'none',
        cursor: Platform.OS === 'web' ? 'pointer' : 'default',
    } as any,
    loginButton: {
        backgroundColor: "#1F7A6B",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 16,
        elevation: 3,
        shadowColor: '#1F7A6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    loginText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
        letterSpacing: 0.5,
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#E2E8F0",
    },
    dividerText: {
        marginHorizontal: 10,
        color: "#94A3B8",
        fontWeight: "600",
        fontSize: 12,
    },
    registerBtn: {
        alignItems: "center",
    },
    registerText: {
        color: "#64748B",
        fontSize: 15,
    },
    registerTextBold: {
        color: "#1F7A6B",
        fontWeight: "bold",
    },
});