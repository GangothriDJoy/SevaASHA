const handleRegister = async () => {
    // 1. Check if fields are empty
    if (!mobile || !password || !fullName || !role) {
        Alert.alert("Error", "Please fill in all fields.");
        return;
    }

    // 2. Secretly create the fake email for Firebase Auth
    const authEmail = `${mobile}@sevaasha.com`;

    try {
        // 3. Create the user in Firebase Authentication (This securely hashes the password!)
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
        const user = userCredential.user;

        // 4. Save their extra details (Name, Role, etc.) into our Firestore Database
        // We use their unique Firebase 'uid' as the document name so it perfectly matches!
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: fullName,
            mobile: mobile,
            role: role,
            status: role === "Supervisor" ? "Approved" : "Pending", // Auto-approve admin, pending for workers
            createdAt: new Date().toISOString()
        });

        // 5. Success! Tell the user and send them to the login page
        Alert.alert(
            "Registration Successful!", 
            role === "Supervisor" ? "You can now log in." : "Your account is pending Admin approval."
        );
        router.replace("/auth");

    } catch (error: any) {
        // If Firebase throws an error (like phone number already exists), show it
        console.error("Firebase Error:", error);
        
        if (error.code === 'auth/email-already-in-use') {
            Alert.alert("Error", "This mobile number is already registered!");
        } else if (error.code === 'auth/weak-password') {
            Alert.alert("Error", "Password should be at least 6 characters.");
        } else {
            Alert.alert("Registration Failed", error.message);
        }
    }
};
