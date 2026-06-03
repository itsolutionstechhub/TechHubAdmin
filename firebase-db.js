// TechHub Firebase SDK Helper Functions
// Using official Firebase JS SDK v10.8.0 via CDN

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where, 
  increment,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// User's Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBu1t-Aag-lH-YW9m__Qu2nwSwsherJFk4",
  authDomain: "techhub-a270f.firebaseapp.com",
  projectId: "techhub-a270f",
  storageBucket: "techhub-a270f.firebasestorage.app",
  messagingSenderId: "620602462312",
  appId: "1:620602462312:web:7d97cc1e73578b2586ebdd",
  measurementId: "G-HEQRV641Y8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// -------------------------------------------------------------
// Authentication Wrapper Functions
// -------------------------------------------------------------

export function loginAdmin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutAdmin() {
  return signOut(auth);
}

export function checkAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function registerFirstAdmin(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// Check if first admin has been registered
export async function checkIfAdminRegistered() {
  try {
    const setupDocRef = doc(db, "settings", "setup");
    const snap = await getDoc(setupDocRef);
    if (snap.exists() && snap.data().adminRegistered === true) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking setup flag, assuming registered for security:", error);
    return true; // Safe fallback
  }
}

// Mark admin registration as completed
export async function markAdminAsRegistered() {
  const setupDocRef = doc(db, "settings", "setup");
  return setDoc(setupDocRef, { adminRegistered: true }, { merge: true });
}

// -------------------------------------------------------------
// Site Settings & Page Content Wrapper Functions
// -------------------------------------------------------------

export async function getSiteSettings() {
  try {
    const docRef = doc(db, "settings", "site");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    // Return default settings if none exist
    return {
      name: "TechHub",
      logoText: "TechHub",
      logoUrl: "",
      contactEmail: "info@techhub.com",
      contactPhone: "+1 (234) 567-890",
      socialFb: "https://facebook.com",
      socialX: "https://x.com",
      categories: [
        { id: "tech-news", name: "Tech News" },
        { id: "repair-articles", name: "Repair Articles" },
        { id: "store", name: "Store" }
      ]
    };
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return null;
  }
}

export async function saveSiteSettings(settingsData) {
  const docRef = doc(db, "settings", "site");
  return setDoc(docRef, settingsData, { merge: true });
}

export async function getPagesContent() {
  try {
    const docRef = doc(db, "settings", "pages");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    // Return defaults if none exist
    return {
      about: "<h2>About TechHub</h2><p>Welcome to TechHub, your number one source for all things tech news, step-by-step repair articles, direct software downloads, and premium tech products. We're dedicated to giving you the very best tech insights, with a focus on reliability, accuracy, and customer satisfaction.</p>",
      contact: "<h2>Contact Us</h2><p>If you have any questions, suggestions, or need help with a repair or purchase, please reach out to us. We will get back to you as soon as possible.</p>",
      privacy: "<h2>Privacy Policy</h2><p>Your privacy is important to us. It is TechHub's policy to respect your privacy regarding any information we may collect from you across our website. We only ask for personal information when we truly need it to provide a service to you.</p>",
      terms: "<h2>Terms & Conditions</h2><p>By accessing our website, you agree to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>",
      disclaimer: "<h2>Disclaimer</h2><p>All the information on this website is published in good faith and for general information purpose only. TechHub does not make any warranties about the completeness, reliability, and accuracy of this information.</p>"
    };
  } catch (error) {
    console.error("Error fetching pages content:", error);
    return null;
  }
}

export async function savePagesContent(pagesData) {
  const docRef = doc(db, "settings", "pages");
  return setDoc(docRef, pagesData, { merge: true });
}

// -------------------------------------------------------------
// Posts CRUD & Interactions Wrapper Functions
// -------------------------------------------------------------

export async function getPosts(categoryFilter = null) {
  try {
    let q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    if (categoryFilter) {
      q = query(collection(db, "posts"), where("category", "==", categoryFilter), orderBy("createdAt", "desc"));
    }
    const querySnapshot = await getDocs(q);
    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    return posts;
  } catch (error) {
    console.error("Error getting posts:", error);
    return [];
  }
}

export async function getPostById(id) {
  try {
    const docRef = doc(db, "posts", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting post ${id}:`, error);
    return null;
  }
}

export async function addPost(postData) {
  const postRef = collection(db, "posts");
  const data = {
    ...postData,
    views: 0,
    createdAt: serverTimestamp()
  };
  return addDoc(postRef, data);
}

export async function updatePost(id, postData) {
  const docRef = doc(db, "posts", id);
  return updateDoc(docRef, {
    ...postData,
    updatedAt: serverTimestamp()
  });
}

export async function deletePost(id) {
  const docRef = doc(db, "posts", id);
  return deleteDoc(docRef);
}

export async function incrementViews(id) {
  try {
    const docRef = doc(db, "posts", id);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    console.error(`Error incrementing views for ${id}:`, error);
  }
}

// -------------------------------------------------------------
// Storage Wrapper Functions
// -------------------------------------------------------------

export async function uploadImageFile(file) {
  try {
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const storageRef = ref(storage, `posts/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to storage:", error);
    throw error;
  }
}
