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
import { doc, setDoc, getDocs, query, where, collection } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
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

const RequiredLabel = ({ text }: { text: string }) => (
    <View style={styles.labelContainer}>
        <Text style={styles.label}>{text}</Text>
        <Text style={styles.mandatoryStar}>*</Text>
    </View>
);

const initialFormData = {
    workerId: "",
    centerId: "",
    ashasupervisorName: "",
    workersupervisorName: "",
    jphnsupervisorName: "",
    role: "-Select-", fullName: "",
    countryCode: "+91", mobile: "",
    altCountryCode: "+91", altMobile: "",
    gender: "-Select-", dob: new Date(), dobString: "",
    address: "", state: "", district: "", pincode: "",
    password: "", confirmPassword: "",
    ashaId: "", assignedWard: "", phc: "", supervisorName: "", aadhaar: "",
    awcId: "", centerName: "", wardNo: "", wardName: "", assignedArea: "",
    regNo: "", assignedPhc: "", contactOffice: "",
    empId: "", assignedBlock: "", officialEmail: "", designation: "", reportingAuth: "",
    motherAadhaar: "",
    guardianName: "", guardianMobile: "", guardianCountryCode: "+91", guardianAadhaar: "", pregnancyStatus: "-Select-", lmp: "", trimester: "-Select-", isAnganwadiReported: "-Select-", hasChildren: "-Select-", vaccinated: "-Select-", noOfChildren: "", childrenDetails: [] as { name: string; age: string; vaccinated: string; food: string }[], childAges: "", rationCard: "", healthIssues: "None",
};
const reportingAuthorities = [
    "Select Authority",
    "District Medical Officer (DMO)",
    "NRHM District Program Manager",
    "Block Medical Officer",
    "State Health Department",
    "District Immunization Officer",
    "Other"
];

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState(initialFormData);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const updateChildField = (index: number, field: string, value: string) => {
        const updatedChildren = [...formData.childrenDetails];
        updatedChildren[index] = { ...updatedChildren[index], [field]: value };
        updateField("childrenDetails", updatedChildren);
    };
    const handleNoOfChildrenChange = (num: string) => {
        const count = parseInt(num) || 0;
        updateField("noOfChildren", count.toString());

        const newChildren = Array.from({ length: count }, (_, i) =>
            formData.childrenDetails[i] || { name: "", age: "", vaccinated: "-Select-" }
        );
        updateField("childrenDetails", newChildren);
    };

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<"state" | "district">("state");
    const [searchQuery, setSearchQuery] = useState("");

    const updateField = (key: keyof typeof initialFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleNameChange = (text: string) => {
        const lettersOnly = text.replace(/[0-9]/g, "");
        updateField("fullName", lettersOnly);
    };

    // Utility to allow only Uppercase Letters and Numbers
    const sanitizeAlphanumeric = (text: string) => {
        return text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    };

    //const isDuplicateMobile = existingUsers.includes(formData.mobile);
    const isMobileValid = formData.mobile.length === countryCodeRules[formData.countryCode];
    const isAltSameAsPrimary = formData.mobile.length > 0 && formData.mobile === formData.altMobile;
    const isPincodeValid = formData.pincode.length === 6 && /^\d+$/.test(formData.pincode);
    const isAadhaarValid = formData.aadhaar.length === 12 && /^\d+$/.test(formData.aadhaar);
    const isguardianAadhaarValid = formData.guardianAadhaar.length === 12 && /^\d+$/.test(formData.guardianAadhaar);
    const ismotherAadhaarValid = formData.motherAadhaar.length === 12 && /^\d+$/.test(formData.motherAadhaar);
    const isRationValid = formData.rationCard.length === 10 && /^\d+$/.test(formData.rationCard);
    const isRoleSelected = formData.role !== "";
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
    const [datePickerTarget, setDatePickerTarget] = useState<"dob" | "lmp">("dob");
    const [isCheckingMobile, setIsCheckingMobile] = useState(false);
    const [dbDuplicate, setDbDuplicate] = useState(false);

    useEffect(() => {
        setDbDuplicate(false);
        let isMounted = true;
        const checkMobileInDB = async () => {
            const requiredLength = countryCodeRules[formData.countryCode] || 10;
            if (formData.mobile.length === requiredLength) {
                setIsCheckingMobile(true);
                setDbDuplicate(false);
                try {
                    // We must check BOTH collections
                    const collections = ["users", "beneficiaries"];
                    let found = false;

                    for (const col of collections) {
                        const q = query(collection(db, col), where("mobile", "==", formData.mobile));
                        const querySnapshot = await getDocs(q);
                        if (!isMounted) return;
                        if (!querySnapshot.empty) {
                            found = true;
                            break;
                        }
                    }if (isMounted) {
                        setDbDuplicate(found);
                        console.log("Database Check Result:", found); // Debugging line
                    }
                } catch (error) {
                    console.error("Error checking mobile:", error);
                } finally {
                    if(isMounted) setIsCheckingMobile(false);
                }
            } else {
                setDbDuplicate(false);
                setIsCheckingMobile(false);
            }
        };
        checkMobileInDB();
        return() => {
            isMounted = false;
        };
    }, [formData.mobile, formData.countryCode]);

    const handleRegister = async () => {
        const { mobile, password, fullName, role } = formData;
        if (!mobile || !password || !fullName || role === "" || role ==="-Select-") {
            const msg = "Please fill in all required fields.";
            Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
            return;
        }
        if (dbDuplicate) {
            const msg = "Cannot register: This mobile number is already in use.";
            Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
            return;
        }
        if (role === "Mother") {
            if (formData.pregnancyStatus === "" || formData.guardianName === "") {
                const msg = "Please complete the Guardian and Pregnancy sections.";
                Platform.OS === 'web' ? alert(msg) : Alert.alert("Incomplete Details", msg);
                return;
            }
        }
        const authEmail = `${mobile}@sevaasha.com`;
        try {
            // 3. Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
            const user = userCredential.user;

            // 4. Save ALL their form details into our Firestore Database
            const userProfileData = {
                ...formData,
                uid: user.uid,
                authEmail: authEmail,
                name: fullName,
                status: role === "Supervisor" ? "Approved" : "Pending",
                createdAt: new Date().toISOString()
            };

            // SECURITY: Delete passwords before saving to the database!
            delete (userProfileData as any).password;
            delete (userProfileData as any).confirmPassword;
            const collectionName = role === "Mother" ? "beneficiaries" : "users";
            await setDoc(doc(db, collectionName, user.uid), userProfileData);
            const successMsg = role === "Supervisor" ? "You can now log in." : "Your account is pending Admin approval.";
            if (Platform.OS === 'web') {
                alert("Registration Successful!\n" + successMsg);
                router.replace("/auth");
            } else {
                Alert.alert("Registration Successful!", successMsg, [
                    { text: "OK", onPress: () => router.replace("/auth") }
                ]);
            }

        } catch (error: any) {
            let errorMsg = error.message;
            if (error.code === 'auth/email-already-in-use') errorMsg = "This mobile number is already registered!";
            if (error.code === 'auth/weak-password') errorMsg="Password should be at least 6 characters.";
            console.error("Firebase Error:", error);
            console.error("Registration Error:", error);
            // If Database fails but Auth succeeds, you might want to handle that here
            Alert.alert("Error", error.message);
            if (Platform.OS === 'web') {
                alert("Error: " + errorMsg);
            }else {
                Alert.alert("Registration Failed", errorMsg);
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
    const webSelectStyle = {
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid #ddd',
        backgroundColor: 'white',
        fontSize: '16px',
        width: '100%',
        height: '50px',
        outline: 'none',
        appearance: 'none', // Removes default browser arrow
        cursor: 'pointer'
    } as any;
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
                    <Text style={styles.requiredNote}>
                        Fields marked with <Text style={styles.mandatoryStar}>*</Text> are required
                    </Text>
                    <Text style={styles.sectionTitle}>1. Select Account Type</Text>
                    <RequiredLabel text="Select Role"/>

                    {Platform.OS === "web" ? (
                        /* --- 💻 LAPTOP / WEB DROPDOWN --- */
                        // @ts-ignore
                        <select
                            value={formData.role || ""}
                            onChange={(e: any) => updateField("role", e.target.value)}
                            style={{
                                padding: 15,
                                borderRadius: 10,
                                borderWidth: 1,
                                // Keeps your validation logic active on the web!
                                borderColor: !isRoleSelected ? "red" : "#ccc",
                                backgroundColor: "white",
                                fontSize: 16,
                                fontFamily: "inherit",
                                width: "100%",
                                marginBottom: 15,
                                boxSizing: "border-box",
                                cursor: "pointer",
                                outline: "none",
                                color: (formData.role === "-Select-" || formData.role === "Not Selected") ? "#999" : "#000",
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
                            !isRoleSelected && { borderColor: 'red', borderWidth: 1 }
                        ]}>
                            <Picker
                                selectedValue={formData.role}
                                onValueChange={(val) => updateField("role", val)}
                            >
                                <Picker.Item label="-Select-" value="" color="#999" />
                                <Picker.Item label="ASHA Worker" value="ASHA Worker" />
                                <Picker.Item label="Anganwadi Worker" value="Anganwadi Worker" />
                                <Picker.Item label="JPHN" value="JPHN" />
                                <Picker.Item label="Supervisor" value="Supervisor" />
                                <Picker.Item label="Mother / Beneficiary" value="Mother" />
                            </Picker>
                        </View>
                    )}

                    {/* Error Message */}
                    {!isRoleSelected && (
                        <Text style={[styles.errorText, { marginTop: 5 }]}>
                            Please select a valid account type to continue.
                        </Text>
                    )}
                    <Text style={styles.sectionTitle}>2. Personal Details</Text>
                    <RequiredLabel text="Full Name" />
                    <TextInput style={styles.input} value={formData.fullName} onChangeText={handleNameChange} />
                    <RequiredLabel text="Mobile Number" />
                    <View style={[styles.row, { alignItems: 'center', marginTop: 15 }]}>
                        {Platform.OS === "web" ? (
                            /* --- 💻 LAPTOP / WEB COUNTRY CODE --- */
                            <View style={[styles.countryPicker, { height: 50, justifyContent: 'center' }]}>
                                {/* @ts-ignore */}
                                <select
                                    value={formData.countryCode}
                                    onChange={(e: any) => updateField("countryCode", e.target.value)}
                                    style={{
                                        width: '90%',
                                        height: '100%',
                                        padding: '0 30px 0 10px',
                                        borderRadius: 10,
                                        border: 'none', // Removing border because countryPicker usually has its own
                                        backgroundColor: 'transparent',
                                        fontSize: 16,
                                        fontFamily: 'inherit',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        textAlign: 'center',
                                    }}
                                >
                                    {Object.keys(countryCodeRules).map(code => (
                                        <option key={code} value={code} style={{ color: '#000' }}>
                                            {code}
                                        </option>
                                    ))}
                                </select>
                            </View>
                        ) : (
                            /* --- 📱 MOBILE PICKER --- */
                            <View style={styles.countryPicker}>
                                <Picker
                                    selectedValue={formData.countryCode}
                                    onValueChange={(val) => updateField("countryCode", val)}
                                >
                                    {Object.keys(countryCodeRules).map(code => (
                                        <Picker.Item key={code} label={code} value={code} />
                                    ))}
                                </Picker>
                            </View>
                        )}
                        <TextInput style={[styles.input, styles.flexInput, dbDuplicate ? { borderColor: 'red' } : null, { height: 50, color: "#000", outlineStyle: 'none', marginTop: 0, marginBottom: 0 } as any]} keyboardType="phone-pad" value={formData.mobile} onChangeText={(val) => updateField("mobile", val.replace(/[^0-9]/g, ''))} maxLength={countryCodeRules[formData.countryCode]}  />
                    </View>
                    <View>
                        {/* 1. Show 'Checking...' while the Firebase query is running */}
                        {isCheckingMobile && (
                            <Text style={{ color: '#666', fontSize: 12, marginTop: 5 }}>⏳ Verifying number...</Text>
                        )}

                        {/* 2. If it's a duplicate - Show Error */}
                        {!isCheckingMobile && dbDuplicate && (
                            <Text style={styles.errorText}>
                                ⚠️ This number is already registered. Please login instead.
                            </Text>
                        )}

                        {/* 3. If NOT a duplicate, NOT checking, but NOT yet full length - Show Warning */}
                        {!isCheckingMobile && !dbDuplicate && formData.mobile.length > 0 && formData.mobile.length < (countryCodeRules[formData.countryCode] || 10) && (
                            <Text style={styles.warningText}>
                                Needs {countryCodeRules[formData.countryCode] || 10} digits.
                            </Text>
                        )}

                        {/* 4. ONLY show Success if it's 10 digits, NOT checking, and NOT a duplicate */}
                        {!isCheckingMobile && !dbDuplicate && formData.mobile.length === (countryCodeRules[formData.countryCode] || 10) && formData.mobile !== "" && (
                            <Text style={styles.successText}>
                                ✓ Mobile number available
                            </Text>
                        )}
                    </View>

                    <View style={styles.row}>
                        {Platform.OS === "web" ? (
                            /* --- 💻 LAPTOP / WEB COUNTRY CODE --- */
                            <View style={styles.countryPicker}>
                                {/* @ts-ignore */}
                                <select
                                    value={formData.countryCode}
                                    onChange={(e: any) => updateField("countryCode", e.target.value)}
                                    style={{
                                        width: '90%',
                                        height: '100%',
                                        padding: '0 30px 0 10px',
                                        borderRadius: 10,
                                        border: 'none', // Removing border because countryPicker usually has its own
                                        backgroundColor: 'transparent',
                                        fontSize: 16,
                                        fontFamily: 'inherit',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        textAlign: 'center',
                                    }}
                                >
                                    {Object.keys(countryCodeRules).map(code => (
                                        <option key={code} value={code} style={{ color: '#000'}}>
                                            {code}
                                        </option>
                                    ))}
                                </select>
                            </View>
                        ) : (
                            /* --- 📱 MOBILE PICKER --- */
                            <View style={styles.countryPicker}>
                                <Picker
                                    selectedValue={formData.countryCode}
                                    onValueChange={(val) => updateField("countryCode", val)}
                                >
                                    {Object.keys(countryCodeRules).map(code => (
                                        <Picker.Item key={code} label={code} value={code} />
                                    ))}
                                </Picker>
                            </View>
                        )}
                        <TextInput
                            placeholder="Alternate Mobile Number(Optional)"
                            placeholderTextColor="#999"
                            style={[
                                styles.input,
                                styles.flexInput,
                                {
                                    height: 50, color: "#000", outlineStyle: 'none', marginTop: 10, marginBottom: 10
                                } as any
                            ]}
                            keyboardType="phone-pad"
                            value={formData.altMobile}
                            onChangeText={(val) => updateField("altMobile", val.replace(/[^0-9]/g, ''))}
                            maxLength={countryCodeRules[formData.altCountryCode] || 10}
                        />
                    </View>
                    {isAltSameAsPrimary && <Text style={styles.errorText}>Alternate number cannot be the same as primary.</Text>}
                    {formData.mobile.length > 0 && !isMobileValid && !dbDuplicate && <Text style={styles.warningText}>Needs {countryCodeRules[formData.countryCode]} digits.</Text>}

                    <Text style={styles.label}>Gender</Text>

                    {Platform.OS === "web" ? (
                        /* --- 💻 LAPTOP / WEB DROPDOWN --- */
                        // @ts-ignore
                        <select
                            value={formData.gender || "Not Selected"}
                            onChange={(e: any) => updateField("gender", e.target.value)}
                            style={{
                                padding: 15,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: "#ccc",
                                backgroundColor: "white",
                                fontSize: 16,
                                fontFamily: "inherit",
                                width: "100%",
                                marginBottom: 15,
                                boxSizing: "border-box",
                                cursor: "pointer",
                                outline: "none",
                                color: (formData.gender === "-Select-" || formData.gender === "Not Selected") ? "#999" : "#000",
                            }}
                        >
                            <option value="" hidden style={{ color: "#999" }}>-Select-</option>
                            <option value="" disabled style={{ color: "#999" }}>-Select-</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    ) : (
                        /* --- 📱 MOBILE PICKER --- */
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={formData.gender}
                                onValueChange={(val) => updateField("gender", val)}
                            >
                                <Picker.Item label="-Select-" value="Not Selected" color="#999" />
                                <Picker.Item label="Male" value="male" />
                                <Picker.Item label="Female" value="female" />
                                <Picker.Item label="Other" value="other" />
                            </Picker>
                        </View>
                    )}

                    <RequiredLabel text="Date of Birth" />

                    {Platform.OS === "web" ? (
                        /* --- 💻 LAPTOP / WEB DATE PICKER --- */
                        // @ts-ignore (Tells TypeScript to ignore HTML tags in React Native)
                        <input
                            type="date"
                            value={formData.dobString || ""}
                            onChange={(e: any) => {
                                const dateString = e.target.value; // Returns format "YYYY-MM-DD"
                                if (dateString) {
                                    // Update both the Date object and the String
                                    const selectedDate = new Date(dateString);
                                    updateField("dob", selectedDate);
                                    updateField("dobString", dateString);
                                }
                            }}
                            style={{
                                padding: 15,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: "#ccc",
                                backgroundColor: "white",
                                fontSize: 16,
                                fontFamily: "inherit",
                                width: "100%",
                                marginBottom: 15,
                                boxSizing: "border-box",
                            }}
                        />
                    ) : (
                        /* --- 📱 MOBILE DATE PICKER BUTTON --- */
                        <TouchableOpacity
                            style={styles.input}
                            onPress={() => {
                                setDatePickerTarget("dob");
                                setShowDatePicker(true);
                            }}
                        >
                            <Text style={{ color: formData.dobString ? "#000" : "#999" }}>
                                {formData.dobString ? formData.dobString : "Select Date of Birth"}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* --- 📱 NATIVE MOBILE DATE PICKER POPUP --- */}
                    {Platform.OS !== "web" && showDatePicker && (
                        <DateTimePicker
                            value={
                                datePickerTarget === "lmp"
                                    ? (formData.lmp ? new Date(formData.lmp) : new Date())
                                    : (formData.dob || new Date())
                            }
                            mode="date"
                            display="spinner"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false); // Close the picker

                                // Only update if they actually picked a date (prevents crash on cancel)
                                if (selectedDate && event.type !== "dismissed") {
                                    const year = selectedDate.getFullYear();
                                    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
                                    const day = String(selectedDate.getDate()).padStart(2, "0");

                                    const dateString = `${year}-${month}-${day}`;

                                    if (datePickerTarget === "lmp") {
                                        updateField("lmp", dateString);
                                    } else {
                                        updateField("dob", selectedDate);
                                        updateField("dobString", dateString);
                                    }
                                }
                            }}
                        />
                    )}

                    <RequiredLabel text="Address" />
                    <TextInput style={styles.input} value={formData.address} onChangeText={(val) => updateField("address", val)} />
                    <RequiredLabel text="State" />
                    <TouchableOpacity style={styles.input} onPress={() => { setModalType("state"); setSearchQuery(""); setModalVisible(true); }}>
                        <Text style={{ color: formData.state ? "#000" : "#999" }}>
                            {formData.state ? formData.state : "-Select-"}
                        </Text>
                    </TouchableOpacity>


                    {formData.state ? (
                        <>
                            <RequiredLabel text="District" />
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => {
                                    setModalType("district");
                                    setSearchQuery("");
                                    setModalVisible(true);
                                }}
                            >
                                <Text style={{ color: formData.district ? "#000" : "#999" }}>
                                    {formData.district ? formData.district : "-Select-"}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : null}

                    <RequiredLabel text="Pincode" />
                    <TextInput style={[styles.input, formData.pincode.length > 0 && !isPincodeValid ? styles.inputError : null]} keyboardType="number-pad" value={formData.pincode} onChangeText={(val) => updateField("pincode", val.replace(/[^0-9]/g, ''))} maxLength={6} />
                    {formData.pincode.length > 0 && isPincodeValid && <Text style={styles.successText}>✓ Valid Pincode</Text>}

                    <RequiredLabel text="Aadhaar Number" />
                    <TextInput style={styles.input} keyboardType="number-pad" value={formData.aadhaar} onChangeText={(val) => updateField("aadhaar", val.replace(/[^0-9]/g, ''))} maxLength={12} />
                    {formData.aadhaar.length > 0 && !isAadhaarValid && <Text style={styles.warningText}>Aadhaar must be exactly 12 digits</Text>}
                    {isAadhaarValid && <Text style={styles.successText}>✓ Valid Aadhaar Format</Text>}

                    <Text style={styles.sectionTitle}>3. Professional / Profile Details</Text>

                    {formData.role === "ASHA Worker" && (
                        <>
                            <RequiredLabel text="ASHA ID" />
                            <TextInput
                                style={styles.input}
                                autoCapitalize="characters"
                                value={formData.ashaId}
                                onChangeText={(val) => updateField("ashaId", sanitizeAlphanumeric(val))}
                            />
                            <RequiredLabel text="Assigned Wards" />
                            <TextInput
                                placeholder="(Separate by comma)"
                                style={styles.input}
                                keyboardType="number-pad"
                                value={formData.assignedWard}
                                onChangeText={(val) => {
                                    // Blocks letters, allows numbers and commas on laptop
                                    const filtered = val.replace(/[^0-9,]/g, '');
                                    updateField("assignedWard", filtered);
                                }}
                            />
                            <RequiredLabel text="PHC (Primary Health Centre)" />
                            <TextInput style={styles.input} onChangeText={(val) => updateField("phc", val)} />
                            <RequiredLabel text="Supervisor Name" />
                            <TextInput
                                style={styles.input}
                                value={formData.ashasupervisorName}
                                onChangeText={(val) => {
                                    const lettersOnly = val.replace(/[0-9]/g, "");
                                    updateField("ashasupervisorName", lettersOnly);
                                }}
                            />
                        </>
                    )}

                    {formData.role === "Anganwadi Worker" && (
                        <>
                            <RequiredLabel text="Worker ID" />
                            <TextInput
                                style={styles.input}
                                autoCapitalize="characters"
                                value={formData.workerId}
                                onChangeText={(val) => updateField("workerId", sanitizeAlphanumeric(val))}
                            />
                            <RequiredLabel text="Anganawadi Center ID" />
                            <TextInput
                                style={styles.input}
                                autoCapitalize="characters"
                                value={formData.centerId}
                                onChangeText={(val) => updateField("centerId", sanitizeAlphanumeric(val))}
                            />
                            <RequiredLabel text="Center Number" />
                            <TextInput
                                style={styles.input}
                                keyboardType="number-pad"
                                value={formData.awcId}
                                onChangeText={(val) => {
                                    // Blocks everything except numbers on laptop
                                    const numeric = val.replace(/[^0-9]/g, '');
                                    updateField("awcId", numeric);
                                }}
                            />
                            <RequiredLabel text="Ward Number" />
                            <TextInput style={styles.input} keyboardType="number-pad" value={formData.wardNo} onChangeText={(val) => { const numericValue= val.replace(/[^0-9]/g, '');updateField("wardNo", numericValue);}} />
                            <RequiredLabel text="Ward Name" />
                            <TextInput style={styles.input} onChangeText={(val) => updateField("wardName", val)} />
                            <RequiredLabel text="Assigned Area" />
                            <TextInput style={styles.input} onChangeText={(val) => updateField("assignedArea", val)} />
                            <RequiredLabel text="Supervisor Name" />
                            <TextInput style={styles.input} value={formData.workersupervisorName} onChangeText={(val) => {const lettersOnly = val.replace(/[0-9]/g, "");updateField("workersupervisorName", lettersOnly);}}/>
                        </>
                    )}

                    {formData.role === "JPHN" && (
                        <>
                            <RequiredLabel text="Registration Number" />
                            <TextInput
                                style={styles.input}
                                autoCapitalize="characters"
                                value={formData.regNo}
                                onChangeText={(val) => updateField("regNo", sanitizeAlphanumeric(val))}
                            />
                            <RequiredLabel text="Assigned PHC" />
                            <TextInput style={styles.input} onChangeText={(val) => updateField("assignedPhc", val)} />
                            <RequiredLabel text="Assigned Ward Numbers" />
                            <TextInput
                                placeholder="(Separate by comma)"
                                style={styles.input}
                                keyboardType="number-pad" // Use default so the comma is visible on the keyboard
                                value={formData.assignedWard} // Ensure the field is controlled
                                onChangeText={(val) => {
                                    const filtered = val.replace(/[^0-9,]/g, '');
                                    updateField("assignedWard", filtered);
                                }}
                            />
                            <RequiredLabel text="Supervisor Name" />
                            <TextInput style={styles.input} value={formData.jphnsupervisorName} onChangeText={(val) => {const lettersOnly = val.replace(/[0-9]/g, "");updateField("jphnsupervisorName", lettersOnly);}}/>
                        </>
                    )}

                    {formData.role === "Supervisor" && (
                        <>
                            <RequiredLabel text="Employee ID" />
                            <TextInput
                                style={styles.input}
                                autoCapitalize="characters"
                                value={formData.empId}
                                onChangeText={(val) => updateField("empId", sanitizeAlphanumeric(val))}
                            />
                            <RequiredLabel text="Assigned Block" />
                            <TextInput style={styles.input} onChangeText={(val) => updateField("assignedBlock", val)} />
                            <RequiredLabel text="Official Email" />
                            <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" onChangeText={(val) => updateField("officialEmail", val)} />
                            <RequiredLabel text="Designation" />
                            <TextInput style={styles.input} onChangeText={(val) => updateField("designation", val)} />
                            <RequiredLabel text="Reporting Authority"/>
                            <View style={styles.pickerContainer}>
                                {Platform.OS === "web" ? (
                                    /* --- 💻 LAPTOP / WEB VIEW --- */
                                    <select
                                        value={formData.reportingAuth}
                                        onChange={(e: any) => updateField("reportingAuth", e.target.value)}
                                        style={{
                                            width: "100%",
                                            height: 50,
                                            padding: "0 15px",
                                            borderRadius: 10,
                                            border: "none", // View parent handles the border
                                            backgroundColor: "transparent",
                                            fontSize: 16,
                                            fontFamily: "inherit",
                                            cursor: "pointer",
                                            outline: "none",
                                            color: formData.reportingAuth === "" ? "#999" : "#000",
                                        }}
                                    >
                                        {reportingAuthorities.map((authority, index) => (
                                            <option
                                                key={index}
                                                value={index === 0 ? "" : authority}
                                                disabled={index === 0}
                                                style={{ color: "#000" }}
                                            >
                                                {authority}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    /* --- 📱 MOBILE VIEW --- */
                                    <Picker
                                        selectedValue={formData.reportingAuth}
                                        onValueChange={(itemValue) => updateField("reportingAuth", itemValue)}
                                    >
                                        {reportingAuthorities.map((authority, index) => (
                                            <Picker.Item
                                                key={index}
                                                label={authority}
                                                value={index === 0 ? "" : authority}
                                                enabled={index !== 0}
                                                color={index === 0 ? "#999" : "#000"}
                                            />
                                        ))}
                                    </Picker>
                                )}
                            </View>
                        </>
                    )}

                    {formData.role === "Mother" && (
                        <>
                            <Text style={styles.sectionTitle}>Guardian Details</Text>
                            <RequiredLabel text="Guardian's Name"/>
                            <TextInput style={styles.input} value={formData.guardianName} onChangeText={(val) => {const lettersOnly = val.replace(/[0-9]/g, "");updateField("guardianName", lettersOnly);}}/>

                            {/* --- Guardian Mobile Number Row --- */}
                            <RequiredLabel text="Guardian's Mobile Number" />
                            <View style={styles.row}>
                                <View style={styles.countryPicker}>
                                    {Platform.OS === "web" ? (
                                        <select
                                            value={formData.guardianCountryCode}
                                            onChange={(e: any) => updateField("guardianCountryCode", e.target.value)}
                                            style={{
                                                width: '90%',
                                                height: '100%',
                                                padding: '0 30px 0 10px',
                                                borderRadius: 10,
                                                textAlign: 'center',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                fontSize: 16,
                                                fontFamily: 'inherit', // ⬅️ Fixes the font
                                                cursor: 'pointer',
                                                outline: 'none',
                                                // 🛑 This is the standard way to show the triangle
                                                appearance: 'auto',
                                                color: '#000',
                                            }}
                                        >
                                            {Object.keys(countryCodeRules).map(code => (
                                                <option key={code} value={code} style={{ color: '#000' }}>
                                                    {code}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        /* ... your Mobile Picker code ... */
                                        <Picker
                                            selectedValue={formData.guardianCountryCode}
                                            onValueChange={(val) => updateField("guardianCountryCode", val)}
                                        >
                                            {Object.keys(countryCodeRules).map(code => (
                                                <Picker.Item key={code} label={code} value={code} />
                                            ))}
                                        </Picker>
                                    )}
                                </View>
                                <TextInput
                                    placeholder="Guardian's Number"
                                    style={[styles.input, styles.flexInput, { marginBottom: 0 }]}
                                    keyboardType="phone-pad"
                                    value={formData.guardianMobile}
                                    onChangeText={(val) => updateField("guardianMobile", val.replace(/[^0-9]/g, ''))}
                                    maxLength={countryCodeRules[formData.guardianCountryCode]}
                                />
                            </View>
                            {formData.guardianMobile.length > 0 &&
                                formData.guardianMobile.length !== countryCodeRules[formData.guardianCountryCode] && (
                                    <Text style={styles.warningText}>
                                        Needs {countryCodeRules[formData.guardianCountryCode]} digits.
                                    </Text>
                                )}
                            <RequiredLabel text="Guardian's Aadhar Number"/>
                            <TextInput style={styles.input} keyboardType="number-pad" value={formData.guardianAadhaar} onChangeText={(val) => updateField("guardianAadhaar", val.replace(/[^0-9]/g, ''))} maxLength={12} />
                            {formData.guardianAadhaar.length > 0 && !isguardianAadhaarValid && <Text style={styles.warningText}>Aadhaar must be exactly 12 digits</Text>}
                            {isguardianAadhaarValid && <Text style={styles.successText}>✓ Valid Aadhaar Format</Text>}

                            <Text style={styles.sectionTitle}>Pregnancy Information</Text>
                            <RequiredLabel text="Are you currently pregnant?" />
                            <View style={[
                                styles.pickerContainer,
                                formData.pregnancyStatus === "" && { borderColor: 'red' }
                            ]}>
                                {Platform.OS === "web" ? (
                                    /* --- 💻 LAPTOP / WEB VIEW --- */
                                    <select
                                        value={formData.pregnancyStatus}
                                        onChange={(e: any) => updateField("pregnancyStatus", e.target.value)}
                                        style={{
                                            width: "100%",
                                            height: 50,
                                            padding: "0 15px",
                                            borderRadius: 10,
                                            border: "none",
                                            backgroundColor: "transparent",
                                            fontSize: 16,
                                            fontFamily: "inherit",
                                            cursor: "pointer",
                                            outline: "none",
                                            appearance: "auto", // ⬅️ Shows the dropdown arrow triangle on laptop
                                            // 🛑 Dynamic color: #999 when no selection is made
                                            color: formData.pregnancyStatus === "" ? "#999" : "#000",
                                        }}
                                    >
                                        <option value="" style={{ color: "#999" }}>-Select-</option>
                                        <option value="Pregnant" style={{ color: "#000" }}>Yes</option>
                                        <option value="Not Pregnant" style={{ color: "#000" }}>No</option>
                                    </select>
                                ) : (
                                    /* --- 📱 MOBILE VIEW --- */
                                    <Picker
                                        selectedValue={formData.pregnancyStatus}
                                        onValueChange={(val) => updateField("pregnancyStatus", val)}
                                    >
                                        <Picker.Item label="-Select-" value="" color="#999" />
                                        <Picker.Item label="Yes" value="Pregnant" color="#000" />
                                        <Picker.Item label="No" value="Not Pregnant" color="#000" />
                                    </Picker>
                                )}
                            </View>

                            {/* Error message logic */}
                            {formData.pregnancyStatus === "" && (
                                <Text style={[styles.errorText, { marginTop: 5 }]}>
                                    Please select your current pregnancy status.
                                </Text>
                            )}

                            {/* --- IF PREGNANT: Show LMP, Trimester and Anganwadi Report --- */}
                            {formData.pregnancyStatus === "Pregnant" && (
                                <>

                                    <RequiredLabel text="Last Menstrual Period (LMP)"/>

                                    {Platform.OS === "web" ? (
                                        /* --- 💻 LAPTOP / WEB DATE PICKER --- */
                                        // @ts-ignore
                                        <input
                                            type="date"
                                            value={formData.lmp || ""}
                                            onChange={(e: any) => {
                                                const dateString = e.target.value; // Returns format "YYYY-MM-DD"
                                                if (dateString) {
                                                    // Update only the LMP field
                                                    updateField("lmp", dateString);
                                                }
                                            }}
                                            style={{
                                                padding: 15,
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: "#ccc",
                                                backgroundColor: "white",
                                                fontSize: 16,
                                                fontFamily: "inherit",
                                                width: "100%",
                                                marginBottom: 15,
                                                boxSizing: "border-box",
                                            }}
                                        />
                                    ) : (
                                        /* --- 📱 MOBILE DATE PICKER BUTTON --- */
                                        <TouchableOpacity
                                            style={styles.input}
                                            onPress={() => {
                                                setDatePickerTarget("lmp");
                                                setShowDatePicker(true);
                                            }}
                                        >
                                            <Text style={{ color: formData.lmp ? "#000" : "#999" }}>
                                                {formData.lmp ? `LMP: ${formData.lmp}` : "Select LMP Date"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Validation Error Message */}
                                    {formData.trimester === "" && (
                                        <Text style={[styles.errorText, { marginTop: 5 }]}>
                                            Please select your current trimester.
                                        </Text>
                                    )}

                                    <RequiredLabel text="Reported to Anganwadi?" />
                                    <View style={[
                                        styles.pickerContainer,
                                        formData.isAnganwadiReported === "" && { borderColor: 'red' }
                                    ]}>
                                        {Platform.OS === "web" ? (
                                            /* --- 💻 LAPTOP / WEB VIEW --- */
                                            <select
                                                value={formData.isAnganwadiReported}
                                                onChange={(e: any) => updateField("isAnganwadiReported", e.target.value)}
                                                style={{
                                                    width: "100%",
                                                    height: 50,
                                                    padding: "0 15px",
                                                    borderRadius: 10,
                                                    border: "none",
                                                    backgroundColor: "transparent",
                                                    fontSize: 16,
                                                    fontFamily: "inherit",
                                                    cursor: "pointer",
                                                    outline: "none",
                                                    appearance: "auto",
                                                    // 🛑 This line makes the text #999 when "-Select-" is active,
                                                    // but turns it black (#000) once a choice is made.
                                                    color: formData.isAnganwadiReported === "" ? "#999" : "#000",
                                                }}
                                            >
                                                {/* The placeholder option */}
                                                <option value="" style={{ color: "#999" }}>-Select-</option>
                                                <option value="Yes" style={{ color: "#000" }}>Yes</option>
                                                <option value="No" style={{ color: "#000" }}>No</option>
                                            </select>
                                        ) : (
                                            /* --- 📱 MOBILE VIEW --- */
                                            <Picker
                                                selectedValue={formData.isAnganwadiReported}
                                                onValueChange={(val) => updateField("isAnganwadiReported", val)}
                                            >
                                                <Picker.Item label="-Select-" value="" color="#999" />
                                                <Picker.Item label="Yes" value="Yes" color="#000" />
                                                <Picker.Item label="No" value="No" color="#000" />
                                            </Picker>
                                        )}
                                    </View>
                                </>
                            )}

                            {/* --- CHILDREN LOGIC (Shown for both Pregnant and Not Pregnant) --- */}
                            <RequiredLabel text="Do you have children?" />
                            <View style={[
                                styles.pickerContainer,
                                formData.hasChildren === "" && { borderColor: 'red' }
                            ]}>
                                {Platform.OS === "web" ? (
                                    /* --- 💻 LAPTOP / WEB VIEW --- */
                                    <select
                                        value={formData.hasChildren}
                                        onChange={(e: any) => updateField("hasChildren", e.target.value)}
                                        style={{
                                            width: "100%",
                                            height: 50,
                                            padding: "0 15px",
                                            borderRadius: 10,
                                            border: "none",
                                            backgroundColor: "transparent",
                                            fontSize: 16,
                                            fontFamily: "inherit",
                                            cursor: "pointer",
                                            outline: "none",
                                            appearance: "auto",
                                            // 🛑 Dynamic color logic for Laptop
                                            color: formData.hasChildren === "" ? "#999" : "#000",
                                        }}
                                    >
                                        <option value="" style={{ color: "#999" }}>-Select-</option>
                                        <option value="Yes" style={{ color: "#000" }}>Yes</option>
                                        <option value="No" style={{ color: "#000" }}>No</option>
                                    </select>
                                ) : (
                                    /* --- 📱 MOBILE VIEW --- */
                                    <Picker
                                        selectedValue={formData.hasChildren}
                                        onValueChange={(val) => updateField("hasChildren", val)}
                                    >
                                        <Picker.Item label="-Select-" value="" color="#999" />
                                        <Picker.Item label="Yes" value="Yes" color="#000" />
                                        <Picker.Item label="No" value="No" color="#000" />
                                    </Picker>
                                )}
                            </View>

                            {/* Error message logic */}
                            {formData.hasChildren === "" && (
                                <Text style={[styles.errorText, { marginTop: 5 }]}>
                                    Please confirm if you have children.
                                </Text>
                            )}

                            {formData.hasChildren === "Yes" && (
                                <>
                                    {formData.hasChildren === "Yes" && (
                                        <>
                                            <RequiredLabel text="How many children?"/>
                                            <TextInput
                                                style={styles.input}
                                                keyboardType="number-pad"
                                                value={formData.noOfChildren.toString()}
                                                onChangeText={handleNoOfChildrenChange}
                                            />

                                            {formData.childrenDetails.map((child, index) => (
                                                <View key={index} style={{ marginBottom: 20, padding: 15, backgroundColor: '#eee', borderRadius: 10 }}>
                                                    <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Child {index + 1} Details</Text>
                                                    <RequiredLabel text="Child Name"/>
                                                    <TextInput
                                                        style={styles.input}
                                                        value={child.name}
                                                        onChangeText={(val) => updateChildField(index, "name", val)}
                                                    />
                                                    <RequiredLabel text="Age"/>
                                                    <TextInput
                                                        style={styles.input}
                                                        keyboardType="number-pad"
                                                        value={child.age}
                                                        onChangeText={(val) => updateChildField(index, "age", val)}
                                                    />

                                                    <RequiredLabel text="Vaccinated?"/>
                                                    <View style={[
                                                        styles.pickerContainer,
                                                        child.vaccinated === "Not Selected" && { borderColor: 'red'}
                                                    ]}>
                                                        {Platform.OS === "web" ? (
                                                            /* --- 💻 LAPTOP / WEB VIEW --- */
                                                            <select
                                                                value={child.vaccinated}
                                                                onChange={(e: any) => updateChildField(index, "vaccinated", e.target.value)}
                                                                style={{
                                                                    width: "100%",
                                                                    height: 50,
                                                                    padding: "0 15px",
                                                                    borderRadius: 10,
                                                                    border: "none",
                                                                    backgroundColor: "transparent",
                                                                    fontSize: 16,
                                                                    fontFamily: "inherit",
                                                                    cursor: "pointer",
                                                                    outline: "none",
                                                                    appearance: "auto",
                                                                    // 🛑 Dynamic color logic: faded if "Not Selected"
                                                                    color: child.vaccinated === "Not Selected" ? "#999" : "#000",
                                                                }}
                                                            >
                                                                <option value="Not Selected" style={{ color: "#999" }}>-Select-</option>
                                                                <option value="Yes" style={{ color: "#000" }}>Yes</option>
                                                                <option value="No" style={{ color: "#000" }}>No</option>
                                                            </select>
                                                        ) : (
                                                            /* --- 📱 MOBILE VIEW --- */
                                                            <Picker
                                                                selectedValue={child.vaccinated}
                                                                onValueChange={(val) => updateChildField(index, "vaccinated", val)}
                                                            >
                                                                <Picker.Item label="-Select-" value="Not Selected" color="#999"/>
                                                                <Picker.Item label="Yes" value="Yes" color="#000" />
                                                                <Picker.Item label="No" value="No" color="#000" />
                                                            </Picker>
                                                        )}
                                                    </View>
                                                    {child.vaccinated === "Not Selected" && (
                                                        <Text style={[styles.errorText, { marginBottom: 10 }]}>
                                                            Please select vaccination status for Child {index + 1}
                                                        </Text>
                                                    )}
                                                </View>
                                            ))}
                                        </>
                                    )}
                                    <Text style={styles.warningText}>Example: Rahul, 3, Yes, Yes; Sana, 1, No, Yes</Text>
                                </>
                            )}

                            {/* --- Shared Mother Details --- */}
                            <Text style={styles.sectionTitle}>General Details</Text>
                            <RequiredLabel text="Mother's Aadhaar Number" />
                            <TextInput style={styles.input} keyboardType="number-pad" value={formData.motherAadhaar} onChangeText={(val) => updateField("motherAadhaar", val.replace(/[^0-9]/g, ''))} maxLength={12} />
                            {formData.motherAadhaar.length > 0 && !ismotherAadhaarValid && <Text style={styles.warningText}>Aadhaar must be exactly 12 digits</Text>}
                            {ismotherAadhaarValid && <Text style={styles.successText}>✓ Valid Aadhaar Format</Text>}

                            <RequiredLabel text="Ration Card Number" />
                            <TextInput style={styles.input} keyboardType="number-pad" value={formData.rationCard} onChangeText={(val) => updateField("rationCard", val.replace(/[^0-9]/g, ''))} maxLength={10} />
                            {formData.rationCard.length > 0 && !isRationValid && <Text style={styles.warningText}>Ration card number must be exactly 10 digits</Text>}
                            {isRationValid && <Text style={styles.successText}>✓ Valid Ration Card number Format</Text>}

                            <RequiredLabel text="Health Issues (If any)" />
                            <View style={[
                                styles.pickerContainer,
                                formData.healthIssues === "" && { borderColor: 'red' }
                            ]}>
                                {Platform.OS === "web" ? (
                                    /* --- 💻 LAPTOP / WEB VIEW --- */
                                    <select
                                        value={formData.healthIssues}
                                        onChange={(e: any) => updateField("healthIssues", e.target.value)}
                                        style={{
                                            width: "100%",
                                            height: 50,
                                            padding: "0 15px",
                                            borderRadius: 10,
                                            border: "none",
                                            backgroundColor: "transparent",
                                            fontSize: 16,
                                            fontFamily: "inherit",
                                            cursor: "pointer",
                                            outline: "none",
                                            appearance: "auto", // ⬅️ Shows the dropdown arrow triangle on laptop
                                            // 🛑 Dynamic color: #999 when no issue is selected
                                            color: formData.healthIssues === "" ? "#999" : "#000",
                                        }}
                                    >
                                        <option value="" style={{ color: "#999" }}>-Select-</option>
                                        <option value="None" style={{ color: "#000" }}>None</option>
                                        <option value="Anemia" style={{ color: "#000" }}>Anemia</option>
                                        <option value="Hypertension" style={{ color: "#000" }}>Hypertension</option>
                                        <option value="Gestational Diabetes" style={{ color: "#000" }}>Diabetes</option>
                                        <option value="Other" style={{ color: "#000" }}>Other</option>
                                    </select>
                                ) : (
                                    /* --- 📱 MOBILE VIEW --- */
                                    <Picker
                                        selectedValue={formData.healthIssues}
                                        onValueChange={(val) => updateField("healthIssues", val)}
                                    >
                                        <Picker.Item label="-Select-" value="" color="#999" />
                                        <Picker.Item label="None" value="None" color="#000" />
                                        <Picker.Item label="Anemia" value="Anemia" color="#000" />
                                        <Picker.Item label="Hypertension" value="Hypertension" color="#000" />
                                        <Picker.Item label="Gestational Diabetes" value="Diabetes" color="#000" />
                                        <Picker.Item label="Other" value="Other" color="#000" />
                                    </Picker>
                                )}
                            </View>

                            {/* Error message logic */}
                            {formData.healthIssues === "" && (
                                <Text style={[styles.errorText, { marginTop: 5 }]}>
                                    Please select a health status or choose None.
                                </Text>
                            )}
                        </>
                    )}
                    <Text style={styles.sectionTitle}>4. Security</Text>
                    <RequiredLabel text="Enter Your Password"/>
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

                    <RequiredLabel text="Confirm Password"/>
                    <TextInput
                        placeholder="Repeat Password"
                        secureTextEntry={true}
                        style={styles.input}
                        value={formData.confirmPassword}
                        onChangeText={(val) => updateField("confirmPassword", val)}
                    />

                    <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                        <Text style={styles.registerButtonText}>REGISTER</Text>
                    </TouchableOpacity>

                </View>
                <View style={styles.loginLinkContainer}>
                    <Text style={styles.loginText}>
                        Already a user?{' '}
                        <Text
                            style={styles.linkText}
                            onPress={() => router.push('/auth' as any)}
                        >
                            Login here
                        </Text>
                    </Text>
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
    labelContainer: {
        flexDirection: "row",
        marginBottom: 5,
        alignItems: "center",
    },
    mandatoryStar: {
        color: "red",
        marginLeft: 3,
        fontWeight: "bold",
    },
// Keep your existing label style but remove marginBottom if it's too large
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
    },
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
    requiredNote: {
        fontSize: 13,
        color: "#666",
        fontStyle: "italic",
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    loginLinkContainer: {
        marginTop: 25,
        marginBottom: 40, // Extra space at the bottom for scrolling comfort
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginText: {
        fontSize: 16,
        color: '#333',
    },
    linkText: {
        color: '#007AFF', // Standard "Link Blue"
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        // This makes the mouse cursor change on your laptop!
        ...(Platform.OS === 'web' && { cursor: 'pointer' }),
    },

});
