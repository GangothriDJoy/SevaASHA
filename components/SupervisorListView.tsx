import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SupervisorListView({ title, data, loading, onRefresh, renderItem }: any) {
    const { width } = useWindowDimensions();
    const isLaptop = width > 768;
    const router = useRouter();

    return (
        <View style={styles.outerContainer}>
            <View style={[styles.innerContainer, { width: isLaptop ? '80%' : '100%', maxWidth: 1200 }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#1F7A6B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <TouchableOpacity onPress={onRefresh}>
                        <Ionicons name="refresh" size={24} color="#1F7A6B" />
                    </TouchableOpacity>
                </View>

                {/* List */}
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No {title.toLowerCase()} found.</Text>
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: '#F5F7FA', alignItems: 'center' },
    innerContainer: { flex: 1, backgroundColor: 'white' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: '#eee'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    listContent: { padding: 15 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});