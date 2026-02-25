import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Dashboard() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background">
            <View className="bg-primary p-6">
                <Text className="text-white text-lg">
                    Good Morning, Anitha
                </Text>
            </View>

            <View className="flex-row flex-wrap justify-between p-4">
                {[
                    "Patient Records",
                    "Maternal Care",
                    "Child Immunization",
                    "Awareness Programs",
                ].map((item, index) => (
                    <View
                        key={index}
                        className="bg-white w-[48%] p-6 rounded-xl mb-4 shadow"
                    >
                        <Text>{item}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                className="bg-accent p-5 rounded-xl mx-6 mt-4 items-center"
                onPress={() => router.push("/emergency-alert")}
            >
                <Text className="text-white font-bold">EMERGENCY ALERT</Text>
            </TouchableOpacity>
        </View>
    );
}
