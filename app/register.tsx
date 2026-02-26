import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Modal,
    FlatList,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

const existingUsers = ["9876543210", "9998887776"];

const countryCodeRules: Record<string, number> = {
    "+91": 10,
    "+1": 10,
    "+44": 10,
    "+971": 9,
};
const indiaData: Record<string, string[]> = {
    "Kerala": ["Thiruvananthapuram", "Kollam", "Ernakulam", "Kozhikode", "Kannur"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubli"],
};
const statesList = Object.keys(indiaData);

const initialFormData = {
    role: "ASHA Worker", fullName: "",
    countryCode: "+91", mobile: "",
    altCountryCode: "+91", altMobile: "",
    gender: "Female", dob: new Date(), dobString: "",
    address: "", state: "", district: "", pincode: "",
    password: "", confirmPassword: "",
    ashaId: "", assignedWard: "", phc: "", supervisorName: "", aadhaar: "",
    awcId: "", centerName: "", wardNo: "", wardName: "", assignedArea: "",
    regNo: "", assignedPhc: "", contactOffice: "",
    empId: "", assignedBlock: "", officialEmail: "", designation: "", reportingAuth: "",
    guardianName: "", pregnancyStatus: "Not Pregnant", lmp: "", trimester: "1st Trimester", noOfChildren: "", childAges: "", rationCard: "", healthIssues: "None",
};

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState(initialFormData);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    {/*const [showConfirmPassword, setShowConfirmPassword] = useState(false);*/}
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<"state" | "district">("state");
    const [searchQuery, setSearchQuery] = useState("");

    const updateField = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleNameChange = (text: string) => {
        const lettersOnly = text.replace(/[0-9]/g, "");
        updateField("fullName", lettersOnly);
    };

    const isDuplicateMobile = existingUsers.includes(formData.mobile);
    const isMobileValid = formData.mobile.length === countryCodeRules[formData.countryCode];
    const isAltSameAsPrimary = formData.mobile.length > 0 && formData.mobile === formData.altMobile;
    const isPincodeValid = formData.pincode.length === 6 && /^\d+$/.test(formData.pincode);
    const isAadhaarValid = formData.aadhaar.length === 12 && /^\d+$/.test(formData.aadhaar);

    const checkPasswordStrength = (pass: string) => {
        const criteria = {
            length: pass.length > 8,
            upper: /[A-Z]/.test(pass),
            lower: /[a-z]/.test(pass),
            number: /[0-9]/.test(pass),
            symbol: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
        };
        const score = Object.values(criteria).filter(Boolean).length;
        return { criteria, score };
    };
    const { criteria, score } = checkPasswordStrength(formData.password);

    const handleRegister = async () => {
        // EXTRACT VARIABLES FROM formData TO FIX THE ERRORS
        const { mobile, password, fullName, role } = formData;

        // 1. Check if fields are empty
        if (!mobile || !password || !fullName || !role) {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }

        // 2. Secretly create the fake email for Firebase Auth
        const authEmail = `${mobile}@sevaasha.com`;

        try {
            // 3. Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
            const user = userCredential.user;

            // 4. Save ALL their form details into our Firestore Database
            const userProfileData = {
                ...formData, // Copies everything from the form (Aadhaar, address, etc.)
                uid: user.uid,
                name: fullName,
                status: role === "Supervisor" ? "Approved" : "Pending",
                createdAt: new Date().toISOString()
            };

            // SECURITY: Delete passwords before saving to the database!
            delete (userProfileData as any).password;
            delete (userProfileData as any).confirmPassword;

            // Save to Firestore
            await setDoc(doc(db, "users", user.uid), userProfileData);

            // 5. Success! Tell the user and send them to the login page
            Alert.alert(
                "Registration Successful!",
                role === "Supervisor" ? "You can now log in." : "Your account is pending Admin approval."
            );
            router.replace("/auth");

        } catch (error: any) {
            console.error("Firebase Error:", error);

            if (error.code === 'auth/email-already-in-use') {
                Alert.alert("Error", "This mobile number is already registered!");
            } else if (error.code === 'auth/weak-password') {
                Alert.alert("Error", "Password should be at least 6 characters.");
            } else {
                Alert.alert("Registration Failed", error.message);
            }
        }
    };

    const getDropdownData = () => {
        let data = modalType === "state" ? statesList : (indiaData[formData.state] || []);
        if (searchQuery) {
            data = data.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return data;
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 20}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.headerText}>Create Account</Text>
                </View>

                <View style={styles.form}>
                    {/* --- ROLE SELECTION --- */}
                    <Text style={styles.sectionTitle}>1. Select Account Type</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={formData.role}
                            onValueChange={(val) => updateField("role", val)}
                        >
                            <Picker.Item label="ASHA Worker" value="ASHA Worker" />
                            <Picker.Item label="Anganwadi Worker" value="Anganwadi Worker" />
                            <Picker.Item label="JPHN" value="JPHN" />
                            <Picker.Item label="Supervisor" value="Supervisor" />
                            <Picker.Item label="Mother / Beneficiary" value="Mother" />
                        </Picker>
                    </View>
                    <Text style={styles.sectionTitle}>2. Personal Details</Text>
                    <TextInput placeholder="Full Name (No Numbers)" style={styles.input} value={formData.fullName} onChangeText={handleNameChange} />
                    <View style={styles.row}>
                        <View style={styles.countryPicker}>
                            <Picker selectedValue={formData.countryCode} onValueChange={(val) => updateField("countryCode", val)}>
                                {Object.keys(countryCodeRules).map(code => <Picker.Item key={code} label={code} value={code} />)}
                            </Picker>
                        </View>
                        <TextInput placeholder="Mobile Number" style={[styles.input, styles.flexInput]} keyboardType="phone-pad" value={formData.mobile} onChangeText={(val) => updateField("mobile", val.replace(/[^0-9]/g, ''))} maxLength={countryCodeRules[formData.countryCode]} />
                    </View>
                    {isDuplicateMobile && <Text style={styles.errorText}>User already exists! Login into your account through login page.</Text>}
                    {formData.mobile.length > 0 && !isMobileValid && !isDuplicateMobile && <Text style={styles.warningText}>Needs {countryCodeRules[formData.countryCode]} digits.</Text>}


                    <View style={styles.row}>
                        <View style={styles.countryPicker}>
                            <Picker selectedValue={formData.altCountryCode} onValueChange={(val) => updateField("altCountryCode", val)}>
                                {Object.keys(countryCodeRules).map(code => <Picker.Item key={code} label={code} value={code} />)}
                            </Picker>
                        </View>
                        <TextInput placeholder="Alt Contact (Optional)" style={[styles.input, styles.flexInput]} keyboardType="phone-pad" value={formData.altMobile} onChangeText={(val) => updateField("altMobile", val.replace(/[^0-9]/g, ''))} maxLength={countryCodeRules[formData.altCountryCode]} />
                    </View>
                    {isAltSameAsPrimary && <Text style={styles.errorText}>Alternate number cannot be the same as primary.</Text>}
                    {formData.mobile.length > 0 && !isMobileValid && !isDuplicateMobile && <Text style={styles.warningText}>Needs {countryCodeRules[formData.countryCode]} digits.</Text>}

                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={formData.gender} onValueChange={(val) => updateField("gender", val)}>
                            <Picker.Item label="Female" value="Female" />
                            <Picker.Item label="Male" value="Male" />
                            <Picker.Item label="Other" value="Other" />
                        </Picker>
                    </View>


                    <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                        <Text style={{ color: formData.dobString ? "#000" : "#999" }}>
                            {formData.dobString ? formData.dobString : "Select Date of Birth"}
                        </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={formData.dob}
                            mode="date"
                            display="spinner"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) {
                                    updateField("dob", selectedDate);
                                    updateField("dobString", selectedDate.toISOString().split('T')[0]);
                                }
                            }}
                        />
                    )}


                    <TextInput placeholder="Address" style={styles.input} value={formData.address} onChangeText={(val) => updateField("address", val)} />

                    <TouchableOpacity style={styles.input} onPress={() => { setModalType("state"); setSearchQuery(""); setModalVisible(true); }}>
                        <Text>{formData.state ? formData.state : "Select State"}</Text>
                    </TouchableOpacity>

                    {formData.state ? (
                        <TouchableOpacity style={styles.input} onPress={() => { setModalType("district"); setSearchQuery(""); setModalVisible(true); }}>
                            <Text>{formData.district ? formData.district : "Select District"}</Text>
                        </TouchableOpacity>
                    ) : null}


                    <TextInput placeholder="Pincode" style={[styles.input, formData.pincode.length > 0 && !isPincodeValid ? styles.inputError : null]} keyboardType="number-pad" value={formData.pincode} onChangeText={(val) => updateField("pincode", val.replace(/[^0-9]/g, ''))} maxLength={6} />
                    {formData.pincode.length > 0 && isPincodeValid && <Text style={styles.successText}>✓ Valid Pincode</Text>}




                    <Text style={styles.sectionTitle}>3. Professional / Profile Details</Text>

                    {formData.role === "ASHA Worker" && (
                        <>
                            <TextInput placeholder="ASHA ID (Govt Issued)" style={styles.input} onChangeText={(val) => updateField("ashaId", val)} />
                            <TextInput placeholder="Assigned Ward / Area" style={styles.input} onChangeText={(val) => updateField("assignedWard", val)} />
                            <TextInput placeholder="PHC (Primary Health Centre)" style={styles.input} onChangeText={(val) => updateField("phc", val)} />
                            <TextInput placeholder="Supervisor Name" style={styles.input} onChangeText={(val) => updateField("supervisorName", val)} />
                            <TextInput placeholder="Aadhaar Number" style={styles.input} keyboardType="number-pad" value={formData.aadhaar} onChangeText={(val) => updateField("aadhaar", val.replace(/[^0-9]/g, ''))} maxLength={12} />
                            {formData.aadhaar.length > 0 && !isAadhaarValid && <Text style={styles.warningText}>Aadhaar must be exactly 12 digits</Text>}
                            {isAadhaarValid && <Text style={styles.successText}>✓ Valid Aadhaar Format</Text>}
                        </>
                    )}

                    {formData.role === "Anganwadi Worker" && (
                        <>
                            <TextInput placeholder="Anganwadi Center ID" style={styles.input} onChangeText={(val) => updateField("awcId", val)} />
                            <TextInput placeholder="Center Name" style={styles.input} onChangeText={(val) => updateField("centerName", val)} />
                            <TextInput placeholder="Ward Number" style={styles.input} keyboardType="number-pad" onChangeText={(val) => updateField("wardNo", val)} />
                            <TextInput placeholder="Ward Name" style={styles.input} onChangeText={(val) => updateField("wardName", val)} />
                            <TextInput placeholder="Assigned Area" style={styles.input} onChangeText={(val) => updateField("assignedArea", val)} />
                            <TextInput placeholder="Supervisor Name" style={styles.input} onChangeText={(val) => updateField("supervisorName", val)} />
                        </>
                    )}

                    {formData.role === "JPHN" && (
                        <>
                            <TextInput placeholder="Registration Number" style={styles.input} onChangeText={(val) => updateField("regNo", val)} />
                            <TextInput placeholder="Assigned PHC" style={styles.input} onChangeText={(val) => updateField("assignedPhc", val)} />
                            <TextInput placeholder="Assigned Wards" style={styles.input} onChangeText={(val) => updateField("assignedWard", val)} />
                            <TextInput placeholder="Contact Office Number" style={styles.input} keyboardType="phone-pad" onChangeText={(val) => updateField("contactOffice", val)} />
                        </>
                    )}

                    {formData.role === "Supervisor" && (
                        <>
                            <TextInput placeholder="Employee ID" style={styles.input} onChangeText={(val) => updateField("empId", val)} />
                            <TextInput placeholder="Assigned Block" style={styles.input} onChangeText={(val) => updateField("assignedBlock", val)} />
                            <TextInput placeholder="Official Email" style={styles.input} keyboardType="email-address" autoCapitalize="none" onChangeText={(val) => updateField("officialEmail", val)} />
                            <TextInput placeholder="Designation" style={styles.input} onChangeText={(val) => updateField("designation", val)} />
                            <TextInput placeholder="Reporting Authority" style={styles.input} onChangeText={(val) => updateField("reportingAuth", val)} />
                        </>
                    )}

                    {formData.role === "Mother" && (
                        <>
                            <TextInput placeholder="Guardian's Name" style={styles.input} onChangeText={(val) => updateField("guardianName", val)} />

                            <Text style={styles.label}>Pregnancy Status</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={formData.pregnancyStatus} onValueChange={(val) => updateField("pregnancyStatus", val)}>
                                    <Picker.Item label="Not Pregnant" value="Not Pregnant" />
                                    <Picker.Item label="Pregnant" value="Pregnant" />
                                </Picker>
                            </View>

                            {formData.pregnancyStatus === "Pregnant" && (
                                <>
                                    <TextInput placeholder="LMP (Last Menstrual Period) YYYY-MM-DD" style={styles.input} onChangeText={(val) => updateField("lmp", val)} />
                                    <Text style={styles.label}>Trimester</Text>
                                    <View style={styles.pickerContainer}>
                                        <Picker selectedValue={formData.trimester} onValueChange={(val) => updateField("trimester", val)}>
                                            <Picker.Item label="1st Trimester" value="1st Trimester" />
                                            <Picker.Item label="2nd Trimester" value="2nd Trimester" />
                                            <Picker.Item label="3rd Trimester" value="3rd Trimester" />
                                        </Picker>
                                    </View>
                                </>
                            )}

                            <TextInput placeholder="Number of Children" style={styles.input} keyboardType="number-pad" onChangeText={(val) => updateField("noOfChildren", val)} />
                            <TextInput placeholder="Child Age(s) (e.g., 2, 5)" style={styles.input} onChangeText={(val) => updateField("childAges", val)} />
                            <TextInput placeholder="Aadhaar Number" style={styles.input} keyboardType="number-pad" onChangeText={(val) => updateField("aadhaar", val)} />
                            <TextInput placeholder="Ration Card Number" style={styles.input} onChangeText={(val) => updateField("rationCard", val)} />

                            <Text style={styles.label}>Health Issues (If Any)</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={formData.healthIssues} onValueChange={(val) => updateField("healthIssues", val)}>
                                    <Picker.Item label="None" value="None" />
                                    <Picker.Item label="Anemia" value="Anemia" />
                                    <Picker.Item label="Gestational Diabetes" value="Gestational Diabetes" />
                                    <Picker.Item label="Hypertension" value="Hypertension" />
                                    <Picker.Item label="Other" value="Other" />
                                </Picker>
                            </View>
                        </>
                    )}


                    <Text style={styles.sectionTitle}>4. Security</Text>


                    <View style={styles.passwordContainer}>
                        <TextInput
                            placeholder="Password"
                            secureTextEntry={!showPassword}
                            style={styles.passwordInput}
                            value={formData.password}
                            onChangeText={(val) => updateField("password", val)}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="#777" />
                        </TouchableOpacity>
                    </View>

                    {formData.password.length > 0 && (
                        <View style={styles.criteriaContainer}>
                            <Text style={criteria.upper ? styles.met : styles.unmet}>{criteria.upper ? "✓" : "○"} At least 1 capital letter</Text>
                            <Text style={criteria.lower ? styles.met : styles.unmet}>{criteria.lower ? "✓" : "○"} At least 1 small letter</Text>
                            <Text style={criteria.number ? styles.met : styles.unmet}>{criteria.number ? "✓" : "○"} At least 1 number</Text>
                            <Text style={criteria.symbol ? styles.met : styles.unmet}>{criteria.symbol ? "✓" : "○"} At least 1 symbol</Text>
                            <Text style={criteria.length ? styles.met : styles.unmet}>{criteria.length ? "✓" : "○"} More than 8 characters</Text>
                        </View>
                    )}


                    <TextInput
                        placeholder="Confirm Password"
                        secureTextEntry={true}
                        style={styles.input}
                        value={formData.confirmPassword}
                        onChangeText={(val) => updateField("confirmPassword", val)}
                    />

                    <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                        <Text style={styles.registerButtonText}>REGISTER</Text>
                    </TouchableOpacity>

                </View>
                <Modal visible={modalVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select {modalType === "state" ? "State" : "District"}</Text>
                            <TextInput style={styles.searchInput} placeholder="Search..." value={searchQuery} onChangeText={setSearchQuery} />
                            <FlatList
                                data={getDropdownData()}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.modalItem} onPress={() => {
                                        updateField(modalType, item);
                                        if (modalType === "state") updateField("district", ""); // Reset district if state changes
                                        setModalVisible(false);
                                    }}>
                                        <Text>{item}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F4F6F8" },
    scrollContent: { flexGrow: 1, paddingBottom: 120 },
    header: { backgroundColor: "#1F7A6B", paddingVertical: 24, paddingHorizontal: 20 },
    headerText: { color: "white", fontSize: 22, fontWeight: "bold" },
    form: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1F7A6B", marginTop: 10, marginBottom: 15 },
    row: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
    countryPicker: { flex: 0.4, backgroundColor: "white", borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: "#ddd", height: 50, justifyContent: "center" },
    flexInput: { flex: 1 },
    input: { backgroundColor: "white", padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: "#ddd", height: 50, justifyContent: "center" },
    pickerContainer: { backgroundColor: "white", borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: "#ddd" },
    registerButton: { backgroundColor: "#4CAF50", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 20 },
    registerButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
    passwordContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: "#ddd" },
    passwordInput: { flex: 1, padding: 15 },
    eyeIcon: { padding: 15 },
    modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
    modalContent: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
    modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    searchInput: { backgroundColor: "#f0f0f0", padding: 10, borderRadius: 10, marginBottom: 10 },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
    modalClose: { marginTop: 15, alignItems: "center", padding: 15, backgroundColor: "#FF3B30", borderRadius: 10 },
    modalCloseText: { color: "white", fontWeight: "bold" },
    // Validation & Password Strength Styles
    errorText: { color: "red", fontSize: 12, marginBottom: 10, marginTop: -5, paddingLeft: 5 },
    warningText: { color: "#FF9800", fontSize: 12, marginBottom: 10, marginTop: -5, paddingLeft: 5 },
    successText: { color: "green", fontSize: 12, marginBottom: 10, marginTop: -5, paddingLeft: 5 },
    inputError: { borderColor: "red", borderWidth: 1 },
    criteriaContainer: { backgroundColor: "#f9f9f9", padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: "#eee" },
    met: { color: "green", fontSize: 13, marginBottom: 4, fontWeight: "500" },
    unmet: { color: "#999", fontSize: 13, marginBottom: 4 },
    label: { marginBottom: 8, fontWeight: "500", color: "#333" },
});
