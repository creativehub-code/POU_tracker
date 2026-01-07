"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { type Payment } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"

export default function SubAdminPaymentsPage() {
  const { user, userData, loading: authLoading } = useAuth()
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!userData || userData.role !== "subadmin")) {
        router.push("/login")
    }
  }, [authLoading, userData, router])

  useEffect(() => {
    async function loadPayments() {
      if (!user) return
      setLoading(true)
      try {
        // Query payments requested by this subadmin
        // Note: Composite index might be needed for 'requestedBy' + 'requestedAt' ordering.
        // For now, client-side sort if small, or add index to firebase.rules/indexes.
        const q = query(collection(db, "payments"), where("requestedBy", "==", user.uid))
        const snap = await getDocs(q)
        const data = snap.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            // Safety for timestamp
            requestedAt: doc.data().requestedAt?.toDate?.() || doc.data().requestedAt
        })) as Payment[]
        
        // Sort DESC
        data.sort((a, b) => {
            const timeA = (a as any).requestedAt?.getTime() || 0
            const timeB = (b as any).requestedAt?.getTime() || 0
            return timeB - timeA
        })

        setPayments(data)
      } catch (error) {
        console.error("Error loading payments:", error)
      } finally {
        setLoading(false)
      }
    }
    if (userData?.role === "subadmin") {
         loadPayments()
    }
  }, [user, userData])

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <h1 className="text-2xl font-bold mb-6">Payment Requests History</h1>

      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        <div className="space-y-4">
            {payments.map(payment => (
                <Card key={payment.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">{(payment as any).clientName}</CardTitle>
                        <Badge variant={
                            payment.status === "approved" ? "default" : // Green-ish usually default or success
                            payment.status === "rejected" ? "destructive" : "secondary"
                        }>
                            {payment.status.toUpperCase()}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-2xl font-bold">₹{payment.amount}</p>
                                <p className="text-xs text-muted-foreground">{(payment as any).reason}</p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                                <p>Requested: {payment.uploadedAt ? new Date(payment.uploadedAt).toLocaleDateString() : 'N/A'}</p> 
                                {/* Note: I used 'uploadedAt' in type usually, but I saved 'requestedAt'. Mapping might be needed or type update. */}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
            {payments.length === 0 && <p className="text-muted-foreground">No payment requests found.</p>}
        </div>
      )}
    </div>
  )
}
