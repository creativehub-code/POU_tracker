"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from "firebase/firestore"
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
  Settings,
  LayoutList,
  Home,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PaymentCard } from "@/components/client/payment-card"
import { ModeToggle } from "@/components/mode-toggle"

type Payment = {
  id: string
  clientId: string
  amount: number
  status: "pending" | "approved" | "rejected" | "scheduled"
  screenshotUrl: string
  uploadedAt: Date
  month?: string
  requestedBy?: string
  reviewedBy?: string
}

type User = {
  name: string
  email: string
  role: string
  fixedAmount?: number
  targetAmount?: number
}

export default function ClientDashboard() {
  const { user, userData, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // State
  // userData removed (using context)

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"home" | "history" | "settings">("home")
  
  // Filter state
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "scheduled">("all")

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
    }).sort((a, b) => {
        const dateA = a.uploadedAt instanceof Date ? a.uploadedAt.getTime() : 0;
        const dateB = b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : 0;
        return dateB - dateA;
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

      {activeTab !== 'settings' && (
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        {activeTab === 'home' ? (
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
        </div>
        ) : (
        <div className="container mx-auto flex h-16 items-center px-4">
             <h1 className="text-xl font-bold">Payment History</h1>
        </div>
        )}
      </header>
      )}


 
      {/* Mobile Tab Content */}
      <main className="md:hidden container mx-auto px-4 py-4 pb-24"> 
        {activeTab === 'home' && (
          <div className="space-y-6">


                     <div className="flex flex-col gap-0.5 items-start text-left mb-4">
                    <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    {progress >= 100 ? (
                        <p className="text-xs text-green-600">your progress has completed</p>
                    ) : isCurrentMonthApproved ? (
                        <p className="text-xs text-green-600">your payment for this month completed</p>
                    ) : (
                        <p className="text-xs text-red-500">your payment for this month pending</p>
                    )}
                    </div>
                
                     <div className="flex h-30 flex-col items-start justify-between rounded-lg border bg-card p-4 shadow-sm mb-4">
                        <div className="flex w-full items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Total Paid Amount</p>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold text-green-600 mt-2">₹{approvedTotal}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
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
                    <Progress value={progress} className="h-2 mb-4" />

             <div className="grid grid-cols-3 gap-2">
                <Card 
                    className="cursor-pointer hover:border-orange-500 transition-all"
                    onClick={() => { setActiveTab('history'); setFilter('pending'); }}
                >
                    <CardContent className="flex flex-col items-center justify-center p-2 text-center">
                    <Clock className="h-4 w-4 text-orange-500 mb-1" />
                    <span className="text-lg font-bold text-orange-500">{pendingCount}</span>
                    <span className="text-xs text-muted-foreground">Pending</span>
                    </CardContent>
                </Card>
                <Card 
                    className="cursor-pointer hover:border-green-500 transition-all"
                    onClick={() => { setActiveTab('history'); setFilter('approved'); }}
                >
                    <CardContent className="flex flex-col items-center justify-center p-2 text-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mb-1" />
                    <span className="text-lg font-bold text-green-600">{approvedCount}</span>
                    <span className="text-xs text-muted-foreground">Approved</span>
                    </CardContent>
                </Card>
                <Card 
                    className="cursor-pointer hover:border-red-500 transition-all"
                    onClick={() => { setActiveTab('history'); setFilter('rejected'); }}
                >
                    <CardContent className="flex flex-col items-center justify-center p-2 text-center">
                    <XCircle className="h-4 w-4 text-red-500 mb-1" />
                    <span className="text-lg font-bold text-red-500">{rejectedCount}</span>
                    <span className="text-xs text-muted-foreground">Rejected</span>
                    </CardContent>
                </Card>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Recent Transactions</h2>
                    <Button variant="link" className="text-xs h-auto p-0" onClick={() => setActiveTab('history')}>
                        View All
                    </Button>
                </div>
                {payments
                    .filter(p => p.status !== 'scheduled')
                    .slice(0, 5)
                    .map((p) => (
                    <PaymentCard 
                        key={p.id} 
                        payment={p} 
                    />
                ))}
                {payments.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">No recent transactions</p>
                )}
             </div>
          </div>
        )}

        {activeTab === 'history' && (
            <div className="space-y-4">
                 <h2 className="text-xl font-bold"></h2>
                 
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {['all', 'pending', 'approved', 'rejected', 'scheduled'].map((f) => (
                        <Badge 
                            key={f}
                            variant={filter === f ? "default" : "outline"} 
                            className="cursor-pointer whitespace-nowrap capitalize"
                            onClick={() => setFilter(f as any)}
                        >
                            {f}
                        </Badge>
                    ))}
                </div>

                {filteredPayments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <ImageIcon className="h-12 w-12 opacity-20 mb-2" />
                        <p>No {filter === 'all' ? '' : filter} payments found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredPayments.map((p) => (
                            <PaymentCard 
                                key={p.id} 
                                payment={p} 
                            />
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="space-y-6 pt-10">
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                     <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-primary/10 shadow-lg">
                        <img src="/logo.jpg" alt="Profile" className="h-full w-full object-cover" />
                     </div>
                     <div className="text-center">
                        <h2 className="text-2xl font-bold">{userData?.name}</h2>
                        <p className="text-muted-foreground">{userData?.email}</p>
                     </div>
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-0 divide-y">
                             <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <Settings className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium">Appearance</span>
                                </div>
                                <ModeToggle />
                             </div>
                             
                             <div 
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors text-red-600"
                                onClick={handleSignOut}
                             >
                                <div className="flex items-center gap-3">
                                    <LogOut className="h-5 w-5" />
                                    <span className="font-medium">Sign Out</span>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                    
                     <div className="text-center text-xs text-muted-foreground pt-8">
                        <p>App Version 1.0.0</p>
                        <p className="mt-1">Powered by Creative Hub</p>
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* Desktop Main (Unchanged) */}
      <main className="hidden md:block container mx-auto px-4 pt-0 pb-0">
        {/* USER CARD - Kept as is for now, can be removed if 'User Card' implies the top card with progress */}
        <Card className="mb-0 -mt-4 border-0 bg-transparent shadow-none md:mt-0 md:border md:bg-card md:shadow-sm">
          <CardHeader className="p-0">
            <div className="flex flex-col gap-0.5 items-start text-left ml-2">
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
            {/* Desktop View */}

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

        <div className="flex items-center justify-center gap-2 mb-6 text-muted-foreground text-sm">
          <p>Please contact your SubAdmin for payment requests.</p>
        </div>

        {/* STATUS */}
        <div className="my-4 grid grid-cols-3 gap-2">
          <Card 
            className={`cursor-pointer transition-all ${filter === 'pending' ? 'border-orange-500 ring-1 ring-orange-500' : ''}`}
            onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
          >
            <CardContent className="flex flex-col items-start pt-0 px-3 pb-0 md:p-4">
              <div className="flex w-full items-center justify-between gap-1 -mt-3">
                <p className="text-xs font-medium text-muted-foreground">Pending</p>
                <Clock className="h-3 w-3 text-orange-500" />
              </div>
              <span className="text-xl font-bold text-orange-500 mt-5 -mb-3">{pendingCount}</span>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'approved' ? 'border-green-600 ring-1 ring-green-600' : ''}`}
            onClick={() => setFilter(filter === 'approved' ? 'all' : 'approved')}
          >
            <CardContent className="flex flex-col items-start pt-0 px-3 pb-0 md:p-4">
              <div className="flex w-full items-center justify-between gap-1 -mt-3">
                <p className="text-xs font-medium text-muted-foreground">Approved</p>
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-xl font-bold text-green-600 mt-5 -mb-3">{approvedCount}</span>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${filter === 'rejected' ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            onClick={() => setFilter(filter === 'rejected' ? 'all' : 'rejected')}
          >
            <CardContent className="flex flex-col items-start pt-0 px-3 pb-0 md:p-4">
              <div className="flex w-full items-center justify-between gap-1 -mt-3">
                <p className="text-xs font-medium text-muted-foreground">Rejected</p>
                <XCircle className="h-3 w-3 text-red-500" />
              </div>
              <span className="text-xl font-bold text-red-500 mt-5 -mb-3">{rejectedCount}</span>
            </CardContent>
          </Card>
        </div>

        {/* HISTORY */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Payment History</h2>
        </div>
        
        {/* Filter Buttons */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
           {['all', 'pending', 'approved', 'rejected', 'scheduled'].map((f) => (
                <Badge 
                    key={f}
                    variant={filter === f ? "default" : "outline"} 
                    className="cursor-pointer whitespace-nowrap capitalize"
                    onClick={() => setFilter(f as any)}
                >
                    {f}
                </Badge>
           ))}
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
            {filteredPayments.map((p) => (
                <PaymentCard 
                    key={p.id} 
                    payment={p} 
                />
            ))}
          </div>
        )}
      </main>



      <footer className="py-6 text-center text-xs font-medium text-muted-foreground/30 uppercase tracking-widest">
        Special Thanks For CREATIVE HUB
      </footer>
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-lg border-t flex items-center justify-around z-50 rounded-t-3xl shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
           <button 
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
                <div className={`p-1 rounded-full ${activeTab === 'home' ? 'bg-primary/10' : ''}`}>
                    <Home className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">Home</span>
           </button>
           <button 
                onClick={() => setActiveTab('history')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
                <div className={`p-1 rounded-full ${activeTab === 'history' ? 'bg-primary/10' : ''}`}>
                    <LayoutList className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">History</span>
           </button>
           <button 
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
                <div className={`p-1 rounded-full ${activeTab === 'settings' ? 'bg-primary/10' : ''}`}>
                    <Settings className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">Settings</span>
           </button>
      </div>
    </div>
  )
}
