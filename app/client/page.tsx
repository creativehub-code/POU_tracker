"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  IndianRupee,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  ImageIcon,
  Wallet,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PaymentCard } from "@/components/client/payment-card"
import { PaymentRequestDialog, type PaymentRequestData } from "@/components/client/payment-request-dialog"
import { ModeToggle } from "@/components/mode-toggle"

type Payment = {
  id: string
  clientId: string
  amount: number
  status: "pending" | "approved" | "rejected"
  screenshotUrl: string
  uploadedAt: Date
  month?: string
}

export default function ClientDashboard() {
  const { user, userData, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  
  // Filter state
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  /* ------------------ AUTH GUARD ------------------ */
  useEffect(() => {
    if (!authLoading) {
      if (!user || userData?.role !== "client") {
        router.replace("/login")
      }
    }
  }, [user, userData, authLoading, router])

  /* ------------------ LOAD PAYMENTS ------------------ */
  useEffect(() => {
  if (user?.uid) {
    loadPayments()
  }
}, [user?.uid])

const loadPayments = async () => {
  try {
    setLoading(true)

    const q = query(
      collection(db, "payments"),
      where("clientId", "==", user.uid)
    )

    const snap = await getDocs(q)

    const list: Payment[] = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.() ?? null,
      } as Payment
    })

    setPayments(list)
  } catch (err) {
    console.error("LOAD PAYMENTS ERROR:", err)
    toast({
      title: "Error",
      description: "Failed to load payments",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}


  /* ------------------ PAYMENT REQUEST ------------------ */
  const handleSubmitRequest = async (data: PaymentRequestData) => {
    if (!user) return

    try {
      await addDoc(collection(db, "payments"), {
        clientId: user.uid,
        amount: data.amount,
        description: data.description,
        month: data.month,
        status: "pending",
        uploadedAt: Timestamp.now(),
      })

      toast({ 
        title: "Request Submitted", 
        description: `Payment request for ₹${data.amount} submitted successfully` 
      })
      loadPayments()
    } catch (error) {
      console.error("SUBMIT REQUEST ERROR:", error)
      toast({
        title: "Error",
        description: "Failed to submit payment request",
        variant: "destructive",
      })
    }
  }



  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  /* ------------------ LOADING ------------------ */
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  /* ------------------ CALCULATIONS ------------------ */
  const approvedTotal = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.amount, 0)

  const target = userData?.fixedAmount || userData?.targetAmount || 0
  const remaining = target - approvedTotal
  const progress = target ? Math.min((approvedTotal / target) * 100, 100) : 0

  /* ------------------ RATE LIMIT ------------------ */
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayRequestCount = payments.filter((p) => {
    if (!p.uploadedAt) return false
    const date = new Date(p.uploadedAt)
    date.setHours(0, 0, 0, 0)
    return date.getTime() === today.getTime()
  }).length

  const isQuotaExceeded = todayRequestCount >= 5

  const pendingCount = payments.filter((p) => p.status === "pending").length
  const approvedCount = payments.filter((p) => p.status === "approved").length
  const rejectedCount = payments.filter((p) => p.status === "rejected").length

  /* ------------------ FILTER ------------------ */
  // filter state moved to top
  const filteredPayments = payments.filter((p) => filter === "all" || p.status === filter)

  /* ------------------ CURRENT MONTH STATUS ------------------ */
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
  
  // Check if payment for current month is approved
  const isCurrentMonthApproved = payments.some(
    (p) => p.month === currentMonth && p.status === "approved"
  )


  /* ------------------ UI (UNCHANGED) ------------------ */
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-lg">
              <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-normal md:text-lg">Assalamu alikum</h3>
                <h1 className="text-lg font-bold md:text-2xl">{userData?.name},</h1>
              </div>
              <p className="text-xs font-normal text-muted-foreground md:text-sm">
                {userData?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut} className="hover:text-red-600 hover:bg-red-50 hover:border-red-200">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-0 pb-0">
        {/* USER CARD - Kept as is for now, can be removed if 'User Card' implies the top card with progress */}
        <Card className="mb-0 -mt-4 border-0 bg-transparent shadow-none md:mt-0 md:border md:bg-card md:shadow-sm">
          <CardHeader className="p-0">
            <div className="flex flex-col gap-0.5 items-start text-left ml-8">
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              {progress >= 100 ? (
                <p className="text-xs text-green-600">
                  your progress has completed
                </p>
              ) : isCurrentMonthApproved ? (
                <p className="text-xs text-green-600">
                  your payment for this month completed
                </p>
              ) : (
                <p className="text-xs text-red-500">
                  your payment for this month pending
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Mobile View */}
            {/* Mobile View */}
            {/* Mobile View */}
            <div className="space-y-3 md:hidden">
              <div className="flex h-auto flex-col items-start justify-between rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex w-full items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Total Paid Amount</p>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-5xl font-bold text-green-600 mt-2">₹{approvedTotal}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex h-28 flex-col items-start justify-between rounded-lg border bg-card p-3 shadow-sm">
                  <div className="flex w-full items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Remaining</p>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold text-orange-500">₹{remaining}</p>
                </div>
                <div className="flex h-28 flex-col items-start justify-between rounded-lg border bg-card p-3 shadow-sm">
                  <div className="flex w-full items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Progress</p>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold">{progress.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-card p-3">
                <p className="text-xl font-bold text-green-600">₹{approvedTotal}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="rounded-lg bg-card p-3">
                <p className="text-xl font-bold text-orange-500">₹{remaining}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
              <div className="rounded-lg bg-card p-3">
                <p className="text-xl font-bold">{progress.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Progress</p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={() => setRequestDialogOpen(true)}
            disabled={progress >= 100 || isQuotaExceeded}
          >
            <Send className="mr-2 h-4 w-4" />
            Make Request
          </Button>
          {isQuotaExceeded && (
            <p className="text-center text-xs text-red-500">
              Your quota for today has been exceeded
            </p>
          )}
        </div>

        {/* STATUS */}
        <div className="my-4 grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-2 text-center md:p-4">
              <span className="text-xl font-bold text-orange-500 md:text-2xl">{pendingCount}</span>
              <p className="text-xs text-gray-400">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-2 text-center md:p-4">
              <span className="text-xl font-bold text-green-600 md:text-2xl">{approvedCount}</span>
              <p className="text-xs text-gray-400">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-2 text-center md:p-4">
              <span className="text-xl font-bold text-red-500 md:text-2xl">{rejectedCount}</span>
              <p className="text-xs text-gray-400">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* HISTORY */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Payment History</h2>
        </div>
        
        {/* Filter Buttons */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
           <Badge 
             variant={filter === "all" ? "default" : "outline"} 
             className="cursor-pointer whitespace-nowrap"
             onClick={() => setFilter("all")}
           >
             All
           </Badge>
           <Badge 
             variant={filter === "pending" ? "default" : "outline"} 
             className="cursor-pointer whitespace-nowrap"
             onClick={() => setFilter("pending")}
           >
             Pending
           </Badge>
           <Badge 
             variant={filter === "approved" ? "default" : "outline"} 
             className="cursor-pointer whitespace-nowrap"
             onClick={() => setFilter("approved")}
           >
             Approved
           </Badge>
           <Badge 
             variant={filter === "rejected" ? "default" : "outline"} 
             className="cursor-pointer whitespace-nowrap"
             onClick={() => setFilter("rejected")}
           >
             Rejected
           </Badge>
        </div>

        {filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p>No {filter === "all" ? "" : filter} payments found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((p) => <PaymentCard key={p.id} payment={p} />)}
          </div>
        )}
      </main>

      {/* PAYMENT REQUEST DIALOG */}
      <PaymentRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        onSubmitRequest={handleSubmitRequest}
      />

      <footer className="py-6 text-center text-xs font-medium text-muted-foreground/30 uppercase tracking-widest">
        Special Thanks For CREATIVE HUB
      </footer>
    </div>
  )
}
