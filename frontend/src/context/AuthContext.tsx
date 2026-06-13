"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: "doctor" | "admin" | "viewer";
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<UserProfile>;
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<UserProfile>;
  loginAsDemo: (role: "doctor" | "admin") => void;
  logout: () => Promise<void>;
  getToken: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync authenticated user with the backend database
  const syncUserWithBackend = async (uid: string, name: string, email: string, role: string = "doctor"): Promise<UserProfile> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer mock_${uid}_${name.replace(/ /g, "-")}_${email}_${role}`
        },
        body: JSON.stringify({ id: uid, name, email, role })
      });
      if (response.ok) {
        const syncedUser = await response.json();
        return {
          uid: syncedUser.id,
          name: syncedUser.name,
          email: syncedUser.email,
          role: syncedUser.role as "doctor" | "admin" | "viewer"
        };
      }
    } catch (e) {
      console.warn("Backend user sync skipped/failed. Using local client model:", e);
    }
    return { uid, name, email, role: role as "doctor" | "admin" | "viewer" };
  };

  useEffect(() => {
    // Check if demo user is stored in localStorage
    const savedDemoUser = localStorage.getItem("eyeq_demo_user");
    if (savedDemoUser) {
      setUser(JSON.parse(savedDemoUser));
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const profile = await syncUserWithBackend(
            firebaseUser.uid,
            firebaseUser.displayName || "Clinical User",
            firebaseUser.email || "user@eyeq.innovate"
          );
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth state transition error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credentials = await signInWithPopup(auth, provider);
      const profile = await syncUserWithBackend(
        credentials.user.uid,
        credentials.user.displayName || "Google Specialist",
        credentials.user.email || ""
      );
      setUser(profile);
      return profile;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const credentials = await signInWithEmailAndPassword(auth, email, pass);
      const profile = await syncUserWithBackend(
        credentials.user.uid,
        credentials.user.displayName || "Clinical Specialist",
        credentials.user.email || ""
      );
      setUser(profile);
      return profile;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const credentials = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(credentials.user, { displayName: name });
      const profile = await syncUserWithBackend(
        credentials.user.uid,
        name,
        email
      );
      setUser(profile);
      return profile;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const loginAsDemo = async (role: "doctor" | "admin") => {
    setLoading(true);
    const demoProfile: UserProfile = {
      uid: role === "admin" ? "demo_admin_id" : "demo_doctor_id",
      name: role === "admin" ? "Dr. Evelyn Ross (Admin)" : "Dr. Alex Carter",
      email: role === "admin" ? "evelyn.ross@eyeq.innovate" : "alex.carter@eyeq.innovate",
      role: role
    };
    
    // Sync with backend to ensure the DB has our demo user
    const synced = await syncUserWithBackend(demoProfile.uid, demoProfile.name, demoProfile.email, demoProfile.role);
    localStorage.setItem("eyeq_demo_user", JSON.stringify(synced));
    setUser(synced);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem("eyeq_demo_user");
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signout failed:", e);
    }
    setUser(null);
    setLoading(false);
  };

  const getToken = () => {
    if (!user) return "";
    // Build a mock authorization header token that the backend can parse in BYPASS mode
    return `mock_${user.uid}_${user.name.replace(/ /g, "-")}_${user.email}_${user.role}`;
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, loginAsDemo, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
