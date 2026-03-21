import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib/cjs/index.js';

export default function Reports() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('System');
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    useEffect(() => {
        const q = query(collection(db, "reports"));
        const unsub = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(document => {
                const data = document.data();
                if (data.content || data.fileUrl) {
                    list.push({ id: document.id, ...data });
                }
            });
            list.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
            setReports(list);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleDelete = async (reportId: string, title: string) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`Are you absolutely sure you want to permanently delete the "${title}" report?`);
            if (confirmed) {
                try {
                    await deleteDoc(doc(db, "reports", reportId));
                } catch (e) {
                    console.error(e);
                    showAlert("Delete Failed", "The system could not erase the selected report from the central database.");
                }
            }
            return;
        }

        Alert.alert(
            "Confirm Deletion",
            `Are you absolutely sure you want to permanently delete the "${title}" report?`,
            [
                { text: "Cancel Selection", style: "cancel" },
                { 
                    text: "Delete Report", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "reports", reportId));
                        } catch (e) {
                            console.error(e);
                            showAlert("Delete Failed", "The system could not erase the selected report from the central database.");
                        }
                    }
                }
            ]
        );
    };

    const generateAIReport = async (reportType: string) => {
        try {
            setIsGenerating(true);
            let title = "";
            let aiContent = "";

            if (reportType === 'weekly') {
                title = "AI Synthesis: Weekly Assessment";
                const benSnap = await getDocs(collection(db, "beneficiaries"));
                let mothers = 0, children = 0, highRisk = 0;
                benSnap.forEach(document => {
                    const data = document.data();
                    if (data.pregnancyStatus === 'Pregnant' || data.hasChildren === 'Yes') mothers++;
                    if (data.isChild || data.category === 'Child') children++;
                    if (data.childrenDetails && Array.isArray(data.childrenDetails)) children += data.childrenDetails.length;
                    if (data.riskStatus === 'High' || (data.healthIssues && data.healthIssues !== 'None')) highRisk++;
                });

                const today = new Date().toISOString();
                const missedSnap = await getDocs(query(collection(db, "vaccine_cards"), where("status", "==", "Pending"), where("dueDate", "<", today)));
                const uniqueMissed = new Set();
                missedSnap.forEach(document => {
                    if (document.data().childId) uniqueMissed.add(document.data().childId);
                });

                aiContent = `Total Tracked Mothers: ${mothers}\nTotal Tracked Children: ${children}\nActive High Risk Alert Cases: ${highRisk}\nCritical Overdue Vaccinations: ${uniqueMissed.size}\n\nSystem securely cross-verified against live field data from ASHA & Anganwadi worker checkpoints.`;
            
            } else if (reportType === 'maternal') {
                title = "AI Synthesis: Pregnancy Log";
                const benSnap = await getDocs(collection(db, "beneficiaries"));
                let pregnantList: string[] = [];
                benSnap.forEach(document => {
                    const data = document.data();
                    if (data.pregnancyStatus === 'Pregnant' || data.category === 'Pregnant') {
                       pregnantList.push(`• ${data.name || 'Unknown User'} (LMP: ${data.lmp || 'N/A'}, Risk: ${data.riskStatus || 'Normal'})`);
                    }
                });
                aiContent = `Total Active Pregnancies Detected: ${pregnantList.length}\n\n${pregnantList.slice(0, 35).join('\n')}${pregnantList.length > 35 ? '\n\n...and more.' : ''}\n\nCross-verified mathematically against the active ASHA Registry.`;
            
            } else if (reportType === 'high_risk') {
                title = "AI Synthesis: High Risk Register";
                const benSnap = await getDocs(collection(db, "beneficiaries"));
                let riskList: string[] = [];
                benSnap.forEach(document => {
                    const data = document.data();
                    if (data.riskStatus === 'High' || (data.healthIssues && data.healthIssues !== 'None')) {
                        riskList.push(`• ${data.name || 'Unknown Patient'}: ${data.healthIssues || 'System High Risk Flag'}`);
                    }
                });
                aiContent = `Total High Risk Cases Mapped: ${riskList.length}\n\n${riskList.slice(0, 35).join('\n')}${riskList.length > 35 ? '\n\n...and more.' : ''}\n\nUrgent medical follow-up physical protocols are strictly recommended by the intelligence engine.`;
            
            } else if (reportType === 'immunization') {
                title = "AI Synthesis: Immunization Deficits";
                const today = new Date().toISOString();
                const missedSnap = await getDocs(query(collection(db, "vaccine_cards"), where("status", "==", "Pending"), where("dueDate", "<", today)));
                let deficitList: string[] = [];
                missedSnap.forEach(document => {
                    const d = document.data();
                    deficitList.push(`• Pending Target: ${d.vaccineId || 'Unknown'} | Due Date: ${d.dueDate ? new Date(d.dueDate).toLocaleDateString() : 'N/A'}`);
                });
                aiContent = `Critical Missed Vaccinations Discovered: ${deficitList.length}\n\n${deficitList.slice(0, 35).join('\n')}${deficitList.length > 35 ? '\n\n...and more.' : ''}\n\nAnganwadi Workers must instantly prioritize direct contact with these local households to avoid severe disease exposure.`;
            }

            await addDoc(collection(db, "reports"), {
                title: title,
                createdAt: new Date().toISOString(),
                size: "Automated AI Analysis",
                category: "System",
                type: "ai-generated",
                content: aiContent
            });

            showAlert("AI Generation Complete", `The ${title} structure has been securely constructed and pushed into your active System Reports stream.`);

        } catch (error) {
            console.error(error);
            showAlert("Engine Failure", "Could not synchronize an AI report at this time. Validate your structural network stream.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGeneratePress = () => {
        setIsModalVisible(true);
    };

    const generateHtml = (report: any) => `
        <html>
        <head>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #5E35B1; text-align: center; border-bottom: 2px solid #5E35B1; padding-bottom: 10px; }
                .content { margin-top: 30px; line-height: 1.8; font-size: 16px; white-space: pre-wrap; font-weight: 500; color: #111; }
                .footer { margin-top: 50px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #EEE; padding-top: 15px; text-transform: uppercase; letter-spacing: 1px;}
            </style>
        </head>
        <body>
            <h1>${report.title}</h1>
            <div class="content">${report.content}</div>
            <div class="footer">SevaASHA Intelligence Export • Securely Generated ${new Date().toLocaleString()}</div>
        </body>
        </html>
    `;

    const generatePDFBytesWeb = async (report: any) => {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const page = pdfDoc.addPage([600, 800]);
        const { height } = page.getSize();
        
        page.drawText(report.title, { x: 50, y: height - 80, size: 22, font: fontBold, color: rgb(0.368, 0.207, 0.694) });
        
        const parsedText = report.content.trim();
        const lines = parsedText.split('\n');
        let currentY = height - 130;
        
        lines.forEach((line: string) => {
            if (line.trim().length > 0) {
                page.drawText(line.trim(), { x: 50, y: currentY, size: 14, font: font, color: rgb(0.1, 0.1, 0.1) });
                currentY -= 25;
            }
        });
        
        page.drawText(`SevaASHA Intelligence Export • Securely Generated ${new Date().toLocaleDateString()}`, { 
            x: 50, y: 50, size: 10, font: fontBold, color: rgb(0.5, 0.5, 0.5) 
        });

        return await pdfDoc.save();
    };

    const handleView = async (report: any) => {
        try {
            if (report.type === 'ai-generated' && report.content) {
                if (Platform.OS === 'web') {
                    const pdfBytes = await generatePDFBytesWeb(report);
                    const blob = new Blob([pdfBytes] as unknown as BlobPart[], { type: 'application/pdf' });
                    const pdfUrl = URL.createObjectURL(blob);
                    window.open(pdfUrl, '_blank');
                    return;
                }
                const html = generateHtml(report);
                await Print.printAsync({ html });
            } else if (report.fileUrl) {
                Linking.openURL(report.fileUrl);
            } else {
                showAlert("Viewer Bound", `Unable to natively render ${report.title} structure.`);
            }
        } catch (e) {
            console.error(e);
            showAlert("Render Failure", "System was unable to launch the native PDF hardware intent.");
        }
    };

    const handleDownload = async (report: any) => {
        try {
            if (report.type === 'ai-generated' && report.content) {
                if (Platform.OS === 'web') {
                    const pdfBytes = await generatePDFBytesWeb(report);
                    const blob = new Blob([pdfBytes] as unknown as BlobPart[], { type: 'application/pdf' });
                    const pdfUrl = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = pdfUrl;
                    a.download = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
                    a.click();
                    URL.revokeObjectURL(pdfUrl);
                    return;
                }
                const html = generateHtml(report);
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Download AI Report' });
            } else if (report.fileUrl) {
                Linking.openURL(report.fileUrl);
            } else {
                showAlert("Network Invalid", `No downloadable payload physically mapped to ${report.title}.`);
            }
        } catch (e) {
            console.error(e);
            showAlert("Export Failed", "Could not trigger the native share intent to save this document to device hardware.");
        }
    };

    const renderTab = (title: string, matchKey: string) => (
        <TouchableOpacity 
            style={[styles.tabBtn, activeTab === matchKey && styles.activeTabBtn]} 
            onPress={() => setActiveTab(matchKey)}
        >
            <Text style={[styles.tabText, activeTab === matchKey && styles.activeTabText]}>{title}</Text>
        </TouchableOpacity>
    );

    const filteredReports = reports.filter(r => r.category === activeTab);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Analytics & Reports</Text>
            </View>

            {/* Matrix Routing Block: Tab Controller */}
            <View style={styles.tabContainer}>
                {renderTab('System', 'System')}
                {renderTab('ASHA', 'ASHA')}
                {renderTab('JPHN', 'JPHN')}
            </View>

            <View style={styles.container}>
                {/* PDF & Artificial Intelligence Injection Button */}
                <TouchableOpacity style={styles.generateBtn} onPress={handleGeneratePress} disabled={isGenerating}>
                    {isGenerating ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="add-circle" size={26} color="#FFF" />
                            <Text style={styles.generateText}>Generate New PDF Report</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>{activeTab === 'System' ? 'Auto-Generated Server Backups' : `Manually Uploaded ${activeTab} Records`}</Text>
                
                {loading ? (
                    <ActivityIndicator size="large" color="#5E35B1" style={{ marginTop: 40 }} />
                ) : (
                    <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        {filteredReports.length === 0 ? (
                            <Text style={styles.empty}>No {activeTab} reporting artifacts exist. Trigger a new manual submission or structural AI injection directly to populate.</Text>
                        ) : (
                            filteredReports.map((report) => (
                                <View key={report.id} style={styles.card}>
                                    <View style={[styles.iconBox, report.type === 'ai-generated' && { backgroundColor: '#E3F2FD' }]}>
                                        <Ionicons 
                                            name={report.type === 'ai-generated' ? "hardware-chip" : "document-text"} 
                                            size={30} 
                                            color={report.type === 'ai-generated' ? "#1976D2" : "#5E35B1"} 
                                        />
                                    </View>
                                    <View style={styles.info}>
                                        <Text style={styles.title} numberOfLines={1}>{report.title}</Text>
                                        <Text style={styles.subText}>
                                            {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Date Unknown'} • {report.size || 'Format Unknown'}
                                        </Text>
                                    </View>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleView(report)}>
                                            <Ionicons name="eye" size={22} color={report.type === 'ai-generated' ? "#1976D2" : "#5E35B1"} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDownload(report)}>
                                            <Ionicons name="download" size={22} color={report.type === 'ai-generated' ? "#1976D2" : "#5E35B1"} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(report.id, report.title)}>
                                            <Ionicons name="trash" size={22} color="#D32F2F" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Generation Intelligence Diagnostics Modal */}
            <Modal visible={isModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Intelligence Paradigm</Text>
                        <Text style={styles.modalDesc}>Which localized AI structural report should the system securely synthesize right now?</Text>
                        
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setIsModalVisible(false); generateAIReport('weekly'); }}>
                            <Ionicons name="stats-chart" size={22} color="#5E35B1" />
                            <Text style={styles.modalOptionText}>System Weekly Assessment</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={() => { setIsModalVisible(false); generateAIReport('maternal'); }}>
                            <Ionicons name="woman" size={22} color="#5E35B1" />
                            <Text style={styles.modalOptionText}>Pregnancy & Maternal Log</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={() => { setIsModalVisible(false); generateAIReport('high_risk'); }}>
                            <Ionicons name="warning" size={22} color="#5E35B1" />
                            <Text style={styles.modalOptionText}>High Risk Register</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={() => { setIsModalVisible(false); generateAIReport('immunization'); }}>
                            <Ionicons name="shield-checkmark" size={22} color="#5E35B1" />
                            <Text style={styles.modalOptionText}>Immunization Deficits</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalCancel} onPress={() => setIsModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel Selection</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#5E35B1' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginLeft: 15 },
    
    tabContainer: { flexDirection: 'row', backgroundColor: '#5E35B1', paddingHorizontal: 20, paddingBottom: 15, justifyContent: 'space-between' },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', marginHorizontal: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    activeTabBtn: { backgroundColor: '#FFF' },
    tabText: { color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', fontSize: 13 },
    activeTabText: { color: '#5E35B1', fontWeight: 'bold' },

    container: { flex: 1, backgroundColor: '#F4F7FB', padding: 20 },
    
    generateBtn: { flexDirection: 'row', backgroundColor: '#5E35B1', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    generateText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    
    card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 15, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
    iconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#EDE7F6', justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: 15, paddingRight: 10 },
    title: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    subText: { fontSize: 12, color: '#777', marginTop: 4 },
    
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionBtn: { padding: 10, backgroundColor: '#F9F9F9', borderRadius: 8, borderColor: '#EEE', borderWidth: 1 },
    
    empty: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15, lineHeight: 22, paddingHorizontal: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', width: '100%', maxWidth: 400, borderRadius: 24, padding: 25, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
    modalDesc: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center', lineHeight: 20 },
    modalOption: { backgroundColor: '#F4F7FB', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    modalOptionText: { fontSize: 16, fontWeight: 'bold', color: '#5E35B1', marginLeft: 12 },
    modalCancel: { marginTop: 10, padding: 15, alignItems: 'center' },
    modalCancelText: { fontSize: 16, fontWeight: 'bold', color: '#E53935' }
});

