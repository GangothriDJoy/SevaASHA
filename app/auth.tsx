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

export default function Auth() {
    const router = useRouter();

    const [role, setRole] = useState("ASHA Worker");
    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");

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

                <TextInput
                    placeholder="Password"
                    secureTextEntry
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => router.push("/dashboard")}
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
});
