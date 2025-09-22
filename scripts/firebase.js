import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, serverTimestamp, query, orderBy, getDoc, setDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfigStr = typeof __firebase_config !== 'undefined' 
    ? __firebase_config 
    : `{
        "apiKey": "AIzaSyCCkWPlomvz31ucHdP9ydzugNkSZ-87vIc",
        "authDomain": "familydashboard-b803e.firebaseapp.com",
        "projectId": "familydashboard-b803e",
        "storageBucket": "familydashboard-b803e.appspot.com",
        "messagingSenderId": "846068242540",
        "appId": "1:846068242540:web:df72ef9971337b0a40a049"
    }`;
const firebaseConfig = JSON.parse(firebaseConfigStr);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- PRAYER REQUEST LOGIC ---
let prayerRequestsUnsubscribe = null;
let currentPrayerDocId = null;

export async function initializeFirebase() {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Anonymous sign-in failed.", error);
    }
}

export function listenForPrayerRequests(onUpdate) {
    const prayerCollection = collection(db, "prayerRequests");
    const q = query(prayerCollection, orderBy("requestedAt", "desc"));

    prayerRequestsUnsubscribe = onSnapshot(q, (querySnapshot) => {
        const prayers = [];
        querySnapshot.forEach((doc) => {
            prayers.push({ id: doc.id, ...doc.data() });
        });
        onUpdate(prayers);
    }, (error) => {
        console.error("Error listening for prayer requests:", error);
        onUpdate([], error);
    });
}

export async function addPrayerRequest(name, requestText) {
    if (!requestText) {
        return Promise.reject("Prayer request text cannot be empty.");
    }
    return addDoc(collection(db, "prayerRequests"), {
        name: name,
        requestText: requestText,
        requestedAt: serverTimestamp(),
        status: 'current',
        answerText: null,
        answeredAt: null
    });
}

export async function updatePrayerRequest(prayerId, name, requestText) {
    if (!requestText) {
        return Promise.reject("Prayer request text cannot be empty.");
    }
    const prayerDocRef = doc(db, "prayerRequests", prayerId);
    return updateDoc(prayerDocRef, {
        name: name,
        requestText: requestText,
    });
}

export async function addPrayerAnswer(prayerId, answerText) {
     if (!answerText || !prayerId) {
        return Promise.reject("Answer text or document ID is missing.");
    }
    const prayerDocRef = doc(db, "prayerRequests", prayerId);
    return updateDoc(prayerDocRef, {
        status: 'answered',
        answerText: answerText,
        answeredAt: serverTimestamp()
    });
}

export async function updatePrayerAnswer(prayerId, answerText) {
    if (!answerText) {
        return Promise.reject("Answer text cannot be empty.");
    }
    const prayerDocRef = doc(db, "prayerRequests", prayerId);
    return updateDoc(prayerDocRef, {
        answerText: answerText,
    });
}

export function setCurrentPrayerDocId(id) {
    currentPrayerDocId = id;
}

export function getCurrentPrayerDocId() {
    return currentPrayerDocId;
}

export async function getPin(name) {
    try {
        const pinDocRef = doc(db, "pins", name);
        const docSnap = await getDoc(pinDocRef);
        if (docSnap.exists()) {
            return docSnap.data().pin;
        } else {
            console.log(`No PIN found for ${name}`);
            return null;
        }
    } catch (e) {
        console.error("Error getting PIN:", e);
        return null;
    }
}

export async function setPin(name, pin) {
    try {
        const pinDocRef = doc(db, "pins", name);
        await setDoc(pinDocRef, { pin: pin });
        console.log(`PIN set for ${name}`);
    } catch (e) {
        console.error("Error setting PIN:", e);
    }
}

export async function addDailyChallengeEntry(personName, data) {
    try {
        await addDoc(collection(db, "dailyChallenges"), {
            name: personName,
            ...data,
            timestamp: serverTimestamp()
        });
        console.log("Daily challenge entry added successfully!");
    } catch (e) {
        console.error("Error adding daily challenge entry: ", e);
    }
}

export async function hasCompletedDailyChallenge(personName) {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(
            collection(db, "dailyChallenges"),
            where("name", "==", personName),
            where("timestamp", ">=", startOfDay),
            where("timestamp", "<=", endOfDay)
        );

        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (e) {
        console.error("Error checking daily challenge completion:", e);
        return false;
    }
}