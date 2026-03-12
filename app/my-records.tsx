import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Landing() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.logo}>
                <Text style={styles.logoText}>LOGO</Text>
            </View>

            <Text style={styles.title}>SevaASHA</Text>

            <Text style={styles.subtitle}>
                Empowering Community Health Workers & Beneficiaries
            </Text>

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.push("/auth")}
            >
                <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1F7A6B",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    logo: {
        width: 110,
        height: 110,
        backgroundColor: "white",
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 30,
    },
    logoText: {
        color: "#1F7A6B",
        fontWeight: "bold",
    },
    title: {
        fontSize: 30,
        color: "white",
        fontWeight: "bold",
        marginBottom: 10,
    },
    subtitle: {
        color: "white",
        textAlign: "center",
        marginBottom: 40,
    },
    button: {
        backgroundColor: "white",
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 30,
    },
    buttonText: {
        color: "#1F7A6B",
        fontWeight: "bold",
        fontSize: 16,
    },
});