import { Stack } from "expo-router";

export default function Layout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="register" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="add-new" />
            <Stack.Screen name="my-records" />
            <Stack.Screen name="health-entry" />
            <Stack.Screen name="visit-log" />
            <Stack.Screen name="household-survey" />
            <Stack.Screen name="household-records" />
            <Stack.Screen name="awareness" />
            <Stack.Screen name="incentives" />
            <Stack.Screen name="patient-details" />
            <Stack.Screen name="emergency-alert" />
        </Stack>
    );
}
