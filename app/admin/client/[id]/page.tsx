"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Client, Payment } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, IndianRupee, ArrowLeft, User, Mail, Target, Key, Eye, EyeOff } from "lucide-react"
import { PaymentReviewCard } from "@/components/admin/payment-review-card"

export default function ClientDetailPage() {
  const { userData, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!userData || userData.role !== "admin") {
        router.push("/login")
      }
    }
  }, [userData, authLoading, router])

  useEffect(() => {
    if (userData?.role === "admin" && clientId) {
      loadClientData()
    }
  }, [userData, clientId])

  const loadClientData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      
      // 1. Fetch client document
      const clientDoc = await getDoc(doc(db, "users", clientId))
      
      if (!clientDoc.exists()) {
        setClient(null)
        setLoading(false)
        return
      }

      // 2. Fetch payments for this client
      const paymentsQuery = query(
        collection(db, "payments"),
        where("clientId", "==", clientId)
      )
      const paymentsSnap = await getDocs(paymentsQuery)
      
      const paymentsData = paymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate?.() || doc.data().uploadedAt
      })) as Payment[]

      // Sort by uploadedAt desc
      paymentsData.sort((a, b) => {
        const timeA = a.uploadedAt?.getTime?.() || 0
        const timeB = b.uploadedAt?.getTime?.() || 0
        return timeB - timeA
      })

      const clientData: Client = {
        id: clientDoc.id,
        ...clientDoc.data(),
        payments: paymentsData
      } as Client

      setClient(clientData)
      setPayments(paymentsData)
    } catch (error) {
      console.error("Error loading client data:", error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const handleUpdateFixedAmount = async (newAmount: number) => {
    if (!client) return
    try {
      await updateDoc(doc(db, "users", client.id), {
        fixedAmount: newAmount
      })
      setClient({ ...client, fixedAmount: newAmount })
    } catch (error) {
      console.error("Error updating fixed amount:", error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="mb-4 text-muted-foreground">Client not found</p>
        <Button onClick={() => router.push("/admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const approvedPayments = payments.filter((p) => p.status === "approved")
  const totalPaid = approvedPayments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = client.fixedAmount > 0 ? client.fixedAmount - totalPaid : client.targetAmount - totalPaid
  const progress =
    client.fixedAmount > 0
      ? Math.min((totalPaid / client.fixedAmount) * 100, 100)
      : client.targetAmount > 0
        ? Math.min((totalPaid / client.targetAmount) * 100, 100)
        : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <IndianRupee className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none md:text-xl">Client Details</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Client Info */}
        <Card className="mb-6 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle className="text-xl">{client.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{client.email}</p>
                </div>
              </div>
              {client.initialPassword && (
                <div className="flex items-start gap-3">
                  <Key className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Initial Password</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono">
                        {showPassword ? client.initialPassword : '••••••••'}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Target Amount</p>
                  <p className="text-sm font-medium">₹{client.targetAmount.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <IndianRupee className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fixed Amount</p>
                  <p className="text-sm font-medium">₹{client.fixedAmount.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-sm font-semibold text-green-600">₹{totalPaid.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-semibold">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>₹{totalPaid.toLocaleString("en-IN")} paid</span>
                <span>₹{remaining.toLocaleString("en-IN")} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Section */}
        <div>
          <h2 className="mb-4 text-xl font-bold md:text-2xl">Payment History</h2>
          {payments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <IndianRupee className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-lg font-medium">No payments yet</p>
                <p className="text-sm text-muted-foreground">Waiting for client to upload payment screenshots</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <PaymentReviewCard key={payment.id} payment={payment} clientId={clientId} onUpdate={() => loadClientData(false)} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
