import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FAMILY_MEMBERS } from '../config.js';
import { showPrayerListView, showAddRequestView, showEditRequestView, showAnswerRequestView, renderPrayerLists, checkRecentPrayerRequests, setAllPrayers } from './ui.js';

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
let prayerRequestsUnsubscribe = null; // To hold the listener
let currentPrayerDocId = null; // To hold the ID of the prayer being answered

export async function initializePrayerRequests() {
    const openBtn = document.getElementById('open-prayer-modal');
    const closeBtn = document.getElementById('close-prayer-modal');
    const modalOverlay = document.getElementById('prayer-modal-overlay');
    const addNewBtn = document.getElementById('add-new-prayer-request-btn');
    const cancelBtn = document.getElementById('cancel-prayer-request-btn');
    const submitRequestBtn = document.getElementById('submit-prayer-request-btn');
    const submitAnswerBtn = document.getElementById('submit-prayer-answer-btn');

    openBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'flex';
        showPrayerListView(); // This ensures the initial view is correct
    });
    closeBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        showPrayerListView(); // Reset view on close
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.style.display = 'none';
            showPrayerListView(); // Reset view on close
        }
    });

    addNewBtn.addEventListener('click', showAddRequestView);
    cancelBtn.addEventListener('click', showPrayerListView);
    submitRequestBtn.addEventListener('click', handleAddPrayerRequest);
    submitAnswerBtn.addEventListener('click', handleAddPrayerAnswer);

    try {
        // **FIX:** Force anonymous sign-in for this specific project, ignoring environment tokens.
        await signInAnonymously(auth);
        listenForPrayerRequests(); // Attach listener AFTER successful sign-in
    } catch (error) {
        console.error("Anonymous sign-in failed.", error);
    }
}

function listenForPrayerRequests() {
    const prayerCollection = collection(db, "prayerRequests");
    const q = query(prayerCollection, orderBy("requestedAt", "desc"));

    prayerRequestsUnsubscribe = onSnapshot(q, (querySnapshot) => {
        const prayers = [];
        querySnapshot.forEach((doc) => {
            prayers.push({ id: doc.id, ...doc.data() });
        });
        setAllPrayers(prayers);
        renderPrayerLists();
        checkRecentPrayerRequests(prayers);
    }, (error) => {
        console.error("Error listening for prayer requests:", error);
        document.getElementById('current-requests-list').innerHTML = `<p class="text-red-400">Could not load requests. Check security rules.</p>`;
    });
}

async function handleAddPrayerRequest() {
    const requestInput = document.getElementById('prayer-request-text');
    const requestText = requestInput.value.trim();
    const name = document.getElementById('prayer-requester-name').value;
    
    if (!requestText) {
        console.warn("Prayer request text cannot be empty.");
        requestInput.classList.add('error');
        setTimeout(() => requestInput.classList.remove('error'), 2000);
        return;
    }
    try {
        await addDoc(collection(db, "prayerRequests"), {
            name: name,
            requestText: requestText,
            requestedAt: serverTimestamp(),
            status: 'current',
            answerText: null,
            answeredAt: null
        });
        showPrayerListView();
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

export async function handleUpdateRequest() {
    const requestInput = document.getElementById('prayer-request-text');
    const requestText = requestInput.value.trim();
    const name = document.getElementById('prayer-requester-name').value;
    const prayerId = document.getElementById('edit-prayer-id').value;

    if (!requestText) {
        console.warn("Prayer request text cannot be empty.");
        requestInput.classList.add('error');
        setTimeout(() => requestInput.classList.remove('error'), 2000);
        return;
    }

    try {
        const prayerDocRef = doc(db, "prayerRequests", prayerId);
        await updateDoc(prayerDocRef, {
            name: name,
            requestText: requestText,
            //Do NOT update requestedAt
        });
        showPrayerListView();
    } catch (e) {
        console.error("Error updating document: ", e);
    
    }
}

async function handleAddPrayerAnswer() {
    const answerInput = document.getElementById('prayer-answer-text');
    const answerText = answerInput.value.trim();
     if (!answerText || !currentPrayerDocId) {
        console.error("Answer text or document ID is missing.");
         if (!answerText) {
             answerInput.classList.add('error');
             setTimeout(() => answerInput.classList.remove('error'), 2000);
         }
        return;
    }
    const prayerDocRef = doc(db, "prayerRequests", currentPrayerDocId);
    try {
        await updateDoc(prayerDocRef, {
            status: 'answered',
            answerText: answerText,
            answeredAt: serverTimestamp()
        });
        showPrayerListView();
        currentPrayerDocId = null; // Reset
    } catch (e) {
        console.error("Error updating document: ", e);
    }
}

export async function handleUpdateAnswer() {
    const answerInput = document.getElementById('prayer-answer-text');
    const answerText = answerInput.value.trim();
    const prayerId = document.getElementById('edit-prayer-id').value;

    if (!answerText) {
        console.warn("Answer text cannot be empty.");
        answerInput.classList.add('error');
        setTimeout(() => answerInput.classList.remove('error'), 2000);
        return;
    }

    try {
        const prayerDocRef = doc(db, "prayerRequests", prayerId);
        await updateDoc(prayerDocRef, {
            answerText: answerText,
        });
        showPrayerListView();
    } catch (e) {
        console.error("Error updating document: ", e);
    }
}

export function setCurrentPrayerDocId(id) {
    currentPrayerDocId = id;
}
