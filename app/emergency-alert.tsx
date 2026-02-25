import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";

export default function EmergencyAlert() {
    const [selected, setSelected] = useState<string | null>(null);

    const options = ["High Fever", "Bleeding", "Labor Pain"];

    return (
        <View className="flex-1 bg-background">
            <View className="bg-primary p-6">
                <Text className="text-white text-lg">Emergency Alert</Text>
            </View>

            <View className="p-6">
                <Text className="mb-4 text-base">Select Condition:</Text>

                {options.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        className={`p-4 rounded-xl mb-3 ${
                            selected === item ? "bg-secondary" : "bg-white"
                        }`}
                        onPress={() => setSelected(item)}
                    >
                        <Text>{item}</Text>
                    </TouchableOpacity>
                ))}

                <TouchableOpacity className="bg-accent p-5 rounded-xl items-center mt-6">
                    <Text className="text-white font-bold">
                        SEND EMERGENCY
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
