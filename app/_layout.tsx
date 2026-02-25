import { Stack } from "expo-router";

export default function Layout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="register" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="patient-details" />
            <Stack.Screen name="emergency-alert" />
        </Stack>
    );
}
