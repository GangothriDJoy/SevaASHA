import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";

export default function Landing() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <Image
                    source={require('../logo.jpeg')}
                    style={styles.logo}
                    resizeMode="cover"
                />
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
        width: '100%',
        height: '100%',
        transform: [
            { scale: 1.65 },
            { translateY: 9 },
            {translateX: -1}
        ],
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
    logoContainer: {
        width: 180,           // Size of the circle
        height: 180,
        backgroundColor: '#FFFFFF', // This hides the logo's white edges
        borderRadius: 90,     // Perfect circle
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 30,
        // Professional Shadow
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        overflow: 'hidden',   // Ensures the image doesn't bleed out
    },
});