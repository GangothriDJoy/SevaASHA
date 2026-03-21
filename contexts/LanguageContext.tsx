import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const translations: any = {
    "English": {
        "settings": "Settings",
        "preferences": "Preferences",
        "language_selection": "Language Selection",
        "push_notifications": "Push Notifications",
        "data_storage": "Data & Storage",
        "offline_mode": "Offline Mode",
        "offline_desc": "Save records locally when internet is unavailable",
        "sync_data": "Sync Data Now",
        "support": "Support",
        "help_faq": "Help & FAQ",
        "contact_admin": "Contact Admin",
        "contact_worker": "Contact ASHA Worker",
        "log_out": "Log Out",
        "select_language": "Select Language",
        "cancel": "Cancel",
        "welcome_back": "Welcome back",
        "monthly_visits": "Monthly Visits Completed",
        "immunization": "Immunization Due",
        "high_risk": "High-Risk Pregnancies",
        "recent_alerts": "Recent Notifications",
        "emergency_sos": "EMERGENCY SOS",
        "emergency_desc": "Press to alert supervisor of a high-risk medical emergency."
    },
    "Hindi": {
        "settings": "सेटिंग्स",
        "preferences": "प्राथमिकताएं",
        "language_selection": "भाषा चयन",
        "push_notifications": "पुश सूचनाएँ",
        "data_storage": "डेटा और संग्रहण",
        "offline_mode": "ऑफ़लाइन मोड",
        "offline_desc": "इंटरनेट न होने पर रिकॉर्ड स्थानीय रूप से सहेजें",
        "sync_data": "अभी डेटा सिंक करें",
        "support": "सहयोग",
        "help_faq": "मदद और सामान्य प्रश्न",
        "contact_admin": "व्यवस्थापक से संपर्क करें",
        "contact_worker": "आशा कार्यकर्ता से संपर्क करें",
        "log_out": "लॉग आउट",
        "select_language": "भाषा चुनें",
        "cancel": "रद्द करें",
        "welcome_back": "वापसी पर स्वागत है",
        "monthly_visits": "मासिक दौरे पूरे हुए",
        "immunization": "टीकाकरण देय",
        "high_risk": "उच्च जोखिम वाली गर्भावस्था",
        "recent_alerts": "हाल की सूचनाएं",
        "emergency_sos": "आपातकालीन SOS",
        "emergency_desc": "उच्च-जोखिम चिकित्सा आपातकाल के पर्यवेक्षक को सचेत करने के लिए दबाएँ।"
    },
    "Malayalam": {
        "settings": "ക്രമീകരണങ്ങൾ",
        "preferences": "മുൻഗണനകൾ",
        "language_selection": "ഭാഷ തിരഞ്ഞെടുക്കൽ",
        "push_notifications": "പുഷ് അറിയിപ്പുകൾ",
        "data_storage": "ഡാറ്റയും സംഭരണവും",
        "offline_mode": "ഓഫ്‌ലൈൻ മോഡ്",
        "offline_desc": "ഇന്റർനെറ്റ് ലഭ്യമല്ലാത്തപ്പോൾ റെക്കോർഡുകൾ പ്രാദേശികമായി സംരക്ഷിക്കുക",
        "sync_data": "ഇപ്പോൾ ഡാറ്റ സമന്വയിപ്പിക്കുക",
        "support": "പിന്തുണ",
        "help_faq": "സഹായവും പതിവ് ചോദ്യങ്ങളും",
        "contact_admin": "അഡ്മിനെ ബന്ധപ്പെടുക",
        "contact_worker": "ആശാ വർക്കറെ ബന്ധപ്പെടുക",
        "log_out": "പുറത്തുകടക്കുക",
        "select_language": "ഭാഷ തിരഞ്ഞെടുക്കുക",
        "cancel": "റദ്ദാക്കുക",
        "welcome_back": "തിരികെ സ്വാഗതം",
        "monthly_visits": "പ്രതിമാസ സന്ദർശനങ്ങൾ പൂർത്തിയായി",
        "immunization": "പ്രതിരോധ കുത്തിവയ്പ്പ്",
        "high_risk": "ഉയർന്ന അപകടസാധ്യതയുള്ള ഗർഭധാരണം",
        "recent_alerts": "സമീപകാല അറിയിപ്പുകൾ",
        "emergency_sos": "അടിയന്തര എസ്.ഒ.എസ്",
        "emergency_desc": "മെഡിക്കൽ അത്യാഹിതത്തെക്കുറിച്ച് സൂപ്പർവൈസറെ അറിയിക്കാൻ അമർത്തുക."
    }
};

const LanguageContext = createContext<any>(null);

export const LanguageProvider = ({ children }: any) => {
    const [language, setLanguageState] = useState("English");

    useEffect(() => {
        let mounted = true;
        AsyncStorage.getItem('language').then(lang => {
            if (mounted && lang) { 
                const shortLang = lang.includes("Hindi") ? "Hindi" : lang.includes("Malayalam") ? "Malayalam" : "English";
                setLanguageState(shortLang); 
                AsyncStorage.setItem('language', shortLang);
            }
        }).catch(() => {});
        return () => { mounted = false; };
    }, []);

    const setLanguage = async (val: string) => {
        const shortLang = val.includes("Hindi") ? "Hindi" : val.includes("Malayalam") ? "Malayalam" : "English";
        setLanguageState(shortLang);
        await AsyncStorage.setItem('language', shortLang);
    };

    const t = (key: string) => {
        return translations[language]?.[key] || translations["English"][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => useContext(LanguageContext);
