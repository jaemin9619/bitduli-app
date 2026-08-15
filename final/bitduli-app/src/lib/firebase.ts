import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyC-mjm5e8ZJUYM9Qo60bwixy4jjAaOkWJU",
  authDomain: "jbproject7-0705-c1d9.firebaseapp.com",
  projectId: "jbproject7-0705-c1d9",
  storageBucket: "jbproject7-0705-c1d9.firebasestorage.app",
  messagingSenderId: "972300553612",
  appId: "1:972300553612:web:9023605dc818c7b4461aa9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = getFirestore(app);
const functions = getFunctions(app, "asia-northeast3");

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");

export { app, auth, db, functions, googleProvider, signInWithPopup, signOut };

