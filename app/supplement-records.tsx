import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SupplementRecords() {
    const router = useRouter();
    const items = [
        { name: "Take Home Ration (THR)", icon: "basket", sub: "For pregnant women & lactating mothers" },
        { name: "Morning Snacks", icon: "sunny", sub: "For pre-school children" },
        { name: "Hot Cooked Meal", icon: "restaurant", sub: "Daily lunch distribution" },
        { name: "Eggs & Milk Distribution", icon: "beaker", sub: "Nutritional supplements" }
    ];

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F6F8' }}>
            <View style={{ backgroundColor: '#E91E63', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 15 }}>Nutrition & Supplements</Text>
            </View>
            <View style={{ padding: 20 }}>
                {items.map((item, i) => (
                    <TouchableOpacity key={i} onPress={() => Alert.alert("Success", `${item.name} logged!`)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 12, elevation: 1 }}>
                        <View style={{ backgroundColor: '#FCE4EC', padding: 12, borderRadius: 10, marginRight: 15 }}>
                            <Ionicons name={item.icon as any} size={24} color="#E91E63" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.name}</Text>
                            <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{item.sub}</Text>
                        </View>
                        <Ionicons name="add-circle" size={28} color="#E91E63" />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}