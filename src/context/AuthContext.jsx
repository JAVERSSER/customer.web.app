// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          setUser({
            uid: u.uid,
            email: u.email,
            ...(snap.exists()
              ? snap.data()
              : { name: u.email, avatar: u.email[0].toUpperCase(), phone: "", address: "" }),
          });
        } catch {
          setUser({ uid: u.uid, email: u.email, name: u.email, avatar: u.email[0].toUpperCase(), phone: "", address: "" });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      return true;
    } catch (err) {
      const msgs = {
        "auth/invalid-email":      "Invalid email address.",
        "auth/user-not-found":     "No account found with this email.",
        "auth/wrong-password":     "Wrong password.",
        "auth/invalid-credential": "Wrong email or password.",
        "auth/too-many-requests":  "Too many attempts. Try again later.",
      };
      setError(msgs[err.code] || "Login failed. Please try again.");
      return false;
    }
  };

  const register = async ({ name, email, password, phone }) => {
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const u = {
        uid:       cred.user.uid,
        name:      name.trim(),
        email:     email.trim().toLowerCase(),
        phone:     phone.trim(),
        address:   "",
        avatar:    name.trim()[0].toUpperCase(),
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", cred.user.uid), u);
      return true;
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email":        "Invalid email address.",
        "auth/weak-password":        "Password should be at least 6 characters.",
      };
      setError(msgs[err.code] || "Registration failed. Please try again.");
      return false;
    }
  };

  const logout = () => signOut(auth);

  const resetPassword = async (email) => {
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      return true;
    } catch (err) {
      const msgs = {
        "auth/user-not-found": "No account found with this email.",
        "auth/invalid-email":  "Invalid email address.",
      };
      setError(msgs[err.code] || "Failed to send reset email. Try again.");
      return false;
    }
  };

  const updateProfile = async (data) => {
    const updated = { ...user, ...data };
    setUser(updated);
    try { await setDoc(doc(db, "users", user.uid), updated, { merge: true }); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, setError, login, register, logout, updateProfile, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
