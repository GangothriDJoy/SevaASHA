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
    guardianName: "", guardianMobile: "", guardianCountryCode: "+91", guardianAadhaar: "", pregnancyStatus: "-Select-", lmp: "", trimester: "-Select-", isAnganwadiReported: "-Select-", hasChildren: "-Select-", noOfChildren: "", childrenDetails: [] as { name: string; age: string; vaccinated: string; food: string }[], childAges: "", rationCard: "", healthIssues: "None",
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
            formData.childrenDetails[i] || { name: "", age: "", vaccinated: "No", food: "No" }
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

    const isDuplicateMobile = existingUsers.includes(formData.mobile);
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
    const handleRegister = async () => {
        const { mobile, password, fullName, role } = formData;
        if (!mobile || !password || !fullName || role === "" || role ==="-Select-") {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }
        if (role === "Mother") {
            if (formData.pregnancyStatus === "" || formData.guardianName === "") {
                Alert.alert("Incomplete Details", "Please complete the Guardian and Pregnancy sections.");
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
                ...formData, // Copies everything from the form (Aadhaar, address, etc.)
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
            // Save to Firestore
            await setDoc(doc(db, collectionName, user.uid), userProfileData);

            // 5. Success! Tell the user and send them to the login page
            Alert.alert(
                "Registration Successful!",
                role === "Supervisor" ? "You can now log in." : "Your account is pending Admin approval."
            );
            router.replace("/auth");

        } catch (error: any) {
            console.error("Firebase Error:", error);
            console.error("Registration Error:", error);
            // If Database fails but Auth succeeds, you might want to handle that here
            Alert.alert("Error", error.message);
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
                    <Text style={styles.requiredNote}>
                        Fields marked with <Text style={styles.mandatoryStar}>*</Text> are required
                    </Text>
                    <Text style={styles.sectionTitle}>1. Select Account Type</Text>
                    <RequiredLabel text="Select Role"/>
                    <View style={[
                        styles.pickerContainer,
                        !isRoleSelected && { borderColor: 'red' } // Highlights the box in red if empty
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
                    <View style={styles.row}>
                        <View style={styles.countryPicker}>
                            <Picker selectedValue={formData.countryCode} onValueChange={(val) => updateField("countryCode", val)}>
                                {Object.keys(countryCodeRules).map(code => <Picker.Item key={code} label={code} value={code} />)}
                            </Picker>
                        </View>
                        <TextInput style={[styles.input, styles.flexInput]} keyboardType="phone-pad" value={formData.mobile} onChangeText={(val) => updateField("mobile", val.replace(/[^0-9]/g, ''))} maxLength={countryCodeRules[formData.countryCode]} />
                    </View>
                    {isDuplicateMobile && <Text style={styles.errorText}>User already exists! Login into your account through login page.</Text>}
                    {formData.mobile.length > 0 && !isMobileValid && !isDuplicateMobile && <Text style={styles.warningText}>Needs {countryCodeRules[formData.countryCode]} digits.</Text>}


                    <View style={styles.row}>
                        <View style={styles.countryPicker}>
                            <Picker selectedValue={formData.altCountryCode} onValueChange={(val) => updateField("altCountryCode", val)}>
                                {Object.keys(countryCodeRules).map(code => <Picker.Item key={code} label={code} value={code} />)}
                            </Picker>
                        </View>
                        <TextInput placeholder="Alternate Mobile Number (Optional)" style={[styles.input, styles.flexInput]} keyboardType="phone-pad" value={formData.altMobile} onChangeText={(val) => updateField("altMobile", val.replace(/[^0-9]/g, ''))} maxLength={countryCodeRules[formData.altCountryCode]} />
                    </View>
                    {isAltSameAsPrimary && <Text style={styles.errorText}>Alternate number cannot be the same as primary.</Text>}
                    {formData.mobile.length > 0 && !isMobileValid && !isDuplicateMobile && <Text style={styles.warningText}>Needs {countryCodeRules[formData.countryCode]} digits.</Text>}

                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={formData.gender}
                            onValueChange={(val) => updateField("gender", val)}
                        >
                            {/* Placeholder item: If they leave this, the value remains "Not Selected" */}
                            <Picker.Item label="-Select-" value="Not Selected" color="#999" />

                            {/* Specific Options */}
                            <Picker.Item label="Male" value="male" />
                            <Picker.Item label="Female" value="female" />
                            <Picker.Item label="Other" value="other" />
                        </Picker>
                    </View>

                    <RequiredLabel text="Date of Birth" />
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

                    {showDatePicker && (
                        <DateTimePicker
                            // If picking LMP, show the current LMP date; otherwise show DOB
                            value={datePickerTarget === "lmp" ? (formData.lmp ? new Date(formData.lmp) : new Date()) : formData.dob}
                            mode="date"
                            display="spinner"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false); // Close the picker

                                if (selectedDate) {
                                    const year = selectedDate.getFullYear();
                                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
                                    const day = String(selectedDate.getDate()).padStart(2, '0');

                                    const dateString = `${year}-${month}-${day}`;

                                    if (datePickerTarget === "lmp" ) {
                                        // Update ONLY LMP
                                        updateField("lmp", dateString);
                                    } else {
                                        // Update DOB and the display string
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
                            <TextInput placeholder="(Separate by comma)" style={styles.input} keyboardType="number-pad" onChangeText={(val) => updateField("assignedWard", val)} />
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
                            <TextInput  style={styles.input} keyboardType="number-pad" onChangeText={(val) => updateField("awcId", val)} />
                            <RequiredLabel text="Ward Number" />
                            <TextInput style={styles.input} keyboardType="number-pad" onChangeText={(val) => updateField("wardNo", val)} />
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
                                keyboardType="default" // Use default so the comma is visible on the keyboard
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
                                <Picker
                                    selectedValue={formData.reportingAuth}
                                    onValueChange={(itemValue) => updateField("reportingAuth", itemValue)}
                                >
                                    {reportingAuthorities.map((authority, index) => (
                                        <Picker.Item
                                            key={index}
                                            label={authority}
                                            value={authority === "Select Authority" ? "" : authority}
                                            enabled={index !== 0} // Disables the "Select" placeholder
                                            color={index === 0 ? "#999" : "#000"}
                                        />
                                    ))}
                                </Picker>
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
                                    <Picker
                                        selectedValue={formData.guardianCountryCode} // Use guardian's country code state
                                        onValueChange={(val) => updateField("guardianCountryCode", val)}
                                    >
                                        {Object.keys(countryCodeRules).map(code => (
                                            <Picker.Item key={code} label={code} value={code} />
                                        ))}
                                    </Picker>
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
                                formData.pregnancyStatus === "" && { borderColor: 'red' } // Highlighting red if not selected
                            ]}>
                                <Picker
                                    selectedValue={formData.pregnancyStatus}
                                    onValueChange={(val) => updateField("pregnancyStatus", val)}
                                >
                                    {/* The first item acts as the mandatory placeholder */}
                                    <Picker.Item label="-Select-" value="" color="#999" />
                                    <Picker.Item label="Yes" value="Pregnant" />
                                    <Picker.Item label="No" value="Not Pregnant" />
                                </Picker>
                            </View>

                            {/* Error message shown only if the user hasn't made a choice */}
                            {formData.pregnancyStatus === "" && (
                                <Text style={[styles.errorText, { marginTop: 5 }]}>
                                    Please select your pregnancy status.
                                </Text>
                            )}

                            {/* --- IF PREGNANT: Show LMP, Trimester and Anganwadi Report --- */}
                            {formData.pregnancyStatus === "Pregnant" && (
                                <>
                                    <RequiredLabel text="Last Menstrual Period (LMP)"/>
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
                                    <RequiredLabel text="Trimester" />
                                    <View style={[
                                        styles.pickerContainer,
                                        formData.trimester === "" && { borderColor: 'red' }
                                    ]}>
                                        <Picker
                                            selectedValue={formData.trimester}
                                            onValueChange={(val) => updateField("trimester", val)}
                                        >
                                            <Picker.Item label="-Select-" value="" color="#999" />
                                            <Picker.Item label="1st Trimester" value="1st Trimester" />
                                            <Picker.Item label="2nd Trimester" value="2nd Trimester" />
                                            <Picker.Item label="3rd Trimester" value="3rd Trimester" />
                                        </Picker>
                                    </View>

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
                                        <Picker
                                            selectedValue={formData.isAnganwadiReported}
                                            onValueChange={(val) => updateField("isAnganwadiReported", val)}
                                        >
                                            <Picker.Item label="-Select-" value="" color="#999" />
                                            <Picker.Item label="Yes" value="Yes" />
                                            <Picker.Item label="No" value="No" />
                                        </Picker>
                                    </View>

                                    {/* Validation Error Message */}
                                    {formData.isAnganwadiReported === "" && (
                                        <Text style={[styles.errorText, { marginTop: 5 }]}>
                                            Please confirm if this has been reported to the Anganwadi.
                                        </Text>
                                    )}
                                </>
                            )}

                            {/* --- CHILDREN LOGIC (Shown for both Pregnant and Not Pregnant) --- */}
                            <RequiredLabel text="Do you have children?" />
                            <View style={[
                                styles.pickerContainer,
                                formData.hasChildren === "" && { borderColor: 'red' }
                            ]}>
                                <Picker
                                    selectedValue={formData.hasChildren}
                                    onValueChange={(val) => updateField("hasChildren", val)}
                                >
                                    <Picker.Item label="-Select-" value="" color="#999" />
                                    <Picker.Item label="Yes" value="Yes" />
                                    <Picker.Item label="No" value="No" />
                                </Picker>
                            </View>

                            {/* Validation Error Message */}
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
                                                    <View style={[styles.pickerContainer, child.vaccinated === "Not Selected" && { borderColor: 'red'}]}>
                                                        <Picker
                                                            selectedValue={child.vaccinated}
                                                            onValueChange={(val) => updateChildField(index, "vaccinated", val)}
                                                        >
                                                            <Picker.Item label="-Select-" value="Not Selected" color="#999"/>
                                                            <Picker.Item label="Yes" value="Yes" />
                                                            <Picker.Item label="No" value="No" />
                                                        </Picker>
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

                            <RequiredLabel text="Health Issues"/>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={formData.healthIssues} onValueChange={(val) => updateField("healthIssues", val)}>
                                    <Picker.Item label="None" value="None" />
                                    <Picker.Item label="Anemia" value="Anemia" />
                                    <Picker.Item label="Gestational Diabetes" value="Diabetes" />
                                    <Picker.Item label="Hypertension" value="Diabetes" />
                                    <Picker.Item label="Other" value="Other" />
                                </Picker>
                            </View>
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
});
