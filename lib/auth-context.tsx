"use client"

import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth } from "@/lib/firebase"
import { db } from "@/lib/firebase"

type UserData = {
  id: string
  name: string
  email: string
  role: "admin" | "subadmin" | "client"
  assignedSubAdminId?: string // Only for clients
  createdBy?: string
  createdAt?: any
  // Legacy or optional fields
  targetAmount?: number
  fixedAmount?: number
  terminated?: boolean
}

type AuthContextType = {
  user: any
  userData: UserData | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setUserData(null)
        setLoading(false)
        return
      }

      const snap = await getDoc(doc(db, "users", firebaseUser.uid))
      if (!snap.exists()) {
        console.error("User exists in Auth but not Firestore")
        setUser(null)
        setUserData(null)
        setLoading(false)
        return
      }

      setUser(firebaseUser)
      setUserData({ id: snap.id, ...snap.data() } as UserData)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signOut = async () => {
    await fbSignOut(auth)
    setUser(null)
    setUserData(null)
  }

  const value = useMemo(() => ({
    user,
    userData,
    loading,
    signIn,
    signOut
  }), [user, userData, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}
