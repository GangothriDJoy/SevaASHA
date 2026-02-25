import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function PatientDetails() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background">
            <View className="bg-primary p-6">
                <Text className="text-white text-lg">Patient Details</Text>
            </View>

            <View className="bg-white m-6 p-6 rounded-xl">
                <Text className="mb-2">Name: Lakshmi</Text>
                <Text className="mb-2">Age: 28</Text>
                <Text>Status: Pregnant (3 months)</Text>
            </View>

            <View className="flex-row justify-around">
                <TouchableOpacity className="bg-success p-4 rounded-xl">
                    <Text className="text-white">Update Visit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="bg-accent p-4 rounded-xl"
                    onPress={() => router.push("/emergency-alert")}
                >
                    <Text className="text-white">Send Alert</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
