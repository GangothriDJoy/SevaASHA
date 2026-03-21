import React from 'react';
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";

// Import modular components
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import AshaDashboard from '@/components/dashboards/AshaDashboard';
import JphnDashboard from '@/components/dashboards/JphnDashboard';
import AwwDashboard from '@/components/dashboards/AwwDashboard';
import MotherDashboard from '@/components/dashboards/MotherDashboard';

export default function Dashboard() {
    const params = useLocalSearchParams();
    const userRole = String(params.role || "").trim();

    // 1. Show loading state if role isn't available yet
    if (!userRole) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6F8' }}>
                <ActivityIndicator size="large" color="#1F7A6B" />
                <Text style={{ marginTop: 10, color: '#666' }}>Loading your dashboard...</Text>
            </View>
        );
    }

    // 2. Render the specific dashboard. 
    // Each of these modular components internally manages its own 
    // scroll view, headers, safe areas, and logic.
    switch (userRole) {
        case "Admin":
        case "Supervisor":
            return <AdminDashboard />;
        case "ASHA Worker":
            return <AshaDashboard />;
        case "JPHN":
            return <JphnDashboard />;
        case "Anganwadi Worker":
            return <AwwDashboard />;
        case "Mother":
            return <MotherDashboard />;
        default:
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6F8' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#c62828' }}>Access Blocked</Text>
                    <Text style={{ marginTop: 10, color: '#666' }}>Role not recognized: {userRole}</Text>
                </View>
            );
    }
}