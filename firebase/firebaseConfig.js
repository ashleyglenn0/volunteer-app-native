// firebaseConfig.js

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs
} from "firebase/firestore";

// 🔐 Firebase Config for CrewHQ
const firebaseConfig = {
  apiKey: "AIzaSyDKC9TOIza_VCWoxyTgdJ6u_ebC1e_vWNM",
  authDomain: "volunteercheckin-3659e.firebaseapp.com",
  projectId: "volunteercheckin-3659e",
  storageBucket: "volunteercheckin-3659e.appspot.com", // 🔧 fixed domain
  messagingSenderId: "312312939880",
  appId: "1:312312939880:web:84dc7719d2134c847082dd",
  measurementId: "G-7X3GFKJPW3"
};

// 🔥 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔗 Firestore Collections
const scheduledVolunteersRef = collection(db, "scheduled_volunteers");
const checkInsRef = collection(db, "check_ins");
const noShowsRef = collection(db, "no_shows");

// ✅ Export to use in all screens
export {
  app,
  db,
  scheduledVolunteersRef,
  checkInsRef,
  noShowsRef,
  addDoc,
  getDocs
};
