"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Users, IndianRupee, CreditCard, LogOut, Send, AlertCircle, Clock, CheckCircle, XCircle, Settings, Calendar, Search, LayoutDashboard } from "lucide-react"
import Image from "next/image"
import { ModeToggle } from "@/components/mode-toggle"
import { CreatePaymentRequestDialog } from "@/components/subadmin/create-payment-request-dialog"
import { AssignedClientsDialog } from "@/components/subadmin/assigned-clients-dialog"
import { ClientDetailsDialog } from "@/components/subadmin/client-details-dialog"
import { PaymentHistoryDialog } from "@/components/subadmin/payment-history-dialog"
import { PaymentReviewCard } from "@/components/admin/payment-review-card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, ChevronDown, ChevronUp } from "lucide-react"
import type { Payment, Client } from "@/types"
import { useSwipe } from "@/hooks/use-swipe"

export default function SubAdminDashboard() {
    const { user, userData, loading: authLoading, signOut } = useAuth()
    const router = useRouter()
    
    const [stats, setStats] = useState({
        totalClients: 0,
        totalRequests: 0
    })
    const [clients, setClients] = useState<Client[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"home" | "clients" | "unpaid" | "scheduled" | "settings">("home")
    const [isRequestOpen, setIsRequestOpen] = useState(false)
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [unpaidClients, setUnpaidClients] = useState<Client[]>([])
    const [isUnpaidOpen, setIsUnpaidOpen] = useState(false)
    const [isClientsDialogOpen, setIsClientsDialogOpen] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [mobileSearchTerm, setMobileSearchTerm] = useState("")
    
    // Filters
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "scheduled">("all")

    // Swipe Logic
    const tabs = ["home", "clients", "unpaid", "scheduled", "settings"] as const
    
    const handleSwipeLeft = () => {
      const currentIndex = tabs.indexOf(activeTab as any)
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      }
    }
  
    const handleSwipeRight = () => {
      const currentIndex = tabs.indexOf(activeTab as any)
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1])
      }
    }
  
    const swipeHandlers = useSwipe({ onSwipedLeft: handleSwipeLeft, onSwipedRight: handleSwipeRight })

  useEffect(() => {
    if (!authLoading) {
      if (!userData || userData.role !== "subadmin") {
        router.push("/login")
      }
    }
  }, [userData, authLoading, router])


  const loadStats = async (showLoading = true) => {
    if (!user) return
    if (showLoading) setLoading(true)
    try {
      // Fetch assigned clients
      const clientsQ = query(collection(db, "users"), where("assignedSubAdminId", "==", user.uid))
      const clientsSnap = await getDocs(clientsQ)
      const clientsData = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]
      
      // Check for unpaid clients for current month
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      
      // Fetch all approved payments for the current month
      const paymentsRef = collection(db, "payments")
      const monthPaymentsQuery = query(
            paymentsRef, 
            where("month", "==", currentMonth),
            where("status", "==", "approved"),
            where("requestedBy", "==", user.uid)
      )
      const monthPaymentsSnap = await getDocs(monthPaymentsQuery)
      const paidClientIds = new Set(monthPaymentsSnap.docs.map(doc => doc.data().clientId))

      const unpaid = clientsData.filter(client => !paidClientIds.has(client.id))
      setUnpaidClients(unpaid)

      // Sort assigned clients: Unpaid first, then by name
      clientsData.sort((a, b) => {
            const aUnpaid = !paidClientIds.has(a.id)
            const bUnpaid = !paidClientIds.has(b.id)
            
            if (aUnpaid && !bUnpaid) return -1
            if (!aUnpaid && bUnpaid) return 1
            return a.name.localeCompare(b.name)
      })

      setClients(clientsData)
      
      // Fetch total payment requests by this subadmin
      const paymentsQ = query(collection(db, "payments"), where("requestedBy", "==", user.uid))
      const paymentsSnap = await getDocs(paymentsQ)
      
      const paymentsData = paymentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          uploadedAt: doc.data().uploadedAt?.toDate?.() || new Date(),
          requestedAt: doc.data().requestedAt?.toDate?.() || new Date(),
      })) as Payment[]

      // Sort by date desc
      paymentsData.sort((a, b) => {
          const timeA = (a as any).requestedAt instanceof Date ? (a as any).requestedAt.getTime() : 0
          const timeB = (b as any).requestedAt instanceof Date ? (b as any).requestedAt.getTime() : 0
          return timeB - timeA
      })

      setPayments(paymentsData)
      setStats({
        totalClients: clientsSnap.size,
        totalRequests: paymentsSnap.size
      })

    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {

    if (userData?.role === "subadmin") {
        loadStats()
    }
  }, [user, userData])

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {activeTab !== 'settings' && (
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {activeTab === "home" ? (
              <>
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
                  <Image src="/logo.jpg" alt="Logo" fill className="object-cover" />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-none md:text-xl">{userData?.name || "SubAdmin"}</h1>
                  <p className="text-xs text-muted-foreground">{userData?.email}</p>
                </div>
              </>
            ) : (
              <h1 className="text-xl font-bold">
                {activeTab === "clients" && "Clients"}
                {activeTab === "unpaid" && "Unpaid "}
                {activeTab === "scheduled" && "Scheduled "}
              </h1>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>
      )}

      {/* Desktop View */}
      <main className="hidden md:block container mx-auto px-4 py-8">

        
        {/* Statistics Grid */}
        <div className="space-y-4">
            {/* Row 1: Total Requests (Full Width) */}
            <Card className={`hover:border-primary transition-all flex flex-col justify-between ${filter === 'all' ? 'border-primary' : ''}`} onClick={() => { setFilter('all'); loadStats(false); }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{stats.totalRequests}</div>
                    <p className="text-xs text-muted-foreground">All time requests made</p>
                </CardContent>
            </Card>

            {/* Row 2: Status Cards & Clients */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card 
                    className="hover:border-primary cursor-pointer transition-all flex flex-col justify-between" 
                    onClick={() => setIsClientsDialogOpen(true)}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalClients}</div>
                        <p className="text-xs text-muted-foreground">Manage clients</p>
                    </CardContent>
                </Card>

                <Card 
                    className={`cursor-pointer transition-all flex flex-col justify-between ${filter === 'pending' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'hover:border-orange-500'}`}
                    onClick={() => setFilter('pending')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-600">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                            {payments.filter(p => p.status === 'pending').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Awaiting</p>
                    </CardContent>
                </Card>

                <Card 
                    className={`cursor-pointer transition-all flex flex-col justify-between ${filter === 'approved' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'hover:border-green-500'}`}
                    onClick={() => setFilter('approved')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                            {payments.filter(p => p.status === 'approved').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                    </CardContent>
                </Card>

                <Card 
                    className={`cursor-pointer transition-all flex flex-col justify-between ${filter === 'rejected' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'hover:border-red-500'}`}
                    onClick={() => setFilter('rejected')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                            {payments.filter(p => p.status === 'rejected').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Rejected</p>
                    </CardContent>
                </Card>
                
                 <Card 
                    className={`cursor-pointer transition-all flex flex-col justify-between ${filter === 'scheduled' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'hover:border-blue-500'}`}
                    onClick={() => setFilter('scheduled')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600">Scheduled</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                            {payments.filter(p => p.status === 'scheduled').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Prepaid</p>
                    </CardContent>
                </Card>
            </div>
        </div>

        {!userData?.terminated && (
        <div className="flex items-center justify-between mt-8 px-1 cursor-pointer transition-all hover:opacity-80" onClick={() => setIsRequestOpen(true)}>
            <span className="text-xl font-bold">Payment Request</span>
            <Button 
                size="sm" 
                variant="outline" 
                className="h-8 w-8 p-0 rounded-full"
            >
                <Send className="h-4 w-4" />
            </Button>
        </div>
        )}

        <div className="mt-8">
            <div 
                className="flex items-center justify-between px-1 cursor-pointer transition-all hover:opacity-80"
                onClick={() => setIsUnpaidOpen(!isUnpaidOpen)}
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-red-600">Unpaid Clients</span>
                    <span className="text-red-600 font-bold">{unpaidClients.length}</span>
                </div>
                 <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0 rounded-full"
                >
                    {isUnpaidOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>
            
            {isUnpaidOpen && (
                <div className="mt-4 space-y-4">
                    {unpaidClients.map(client => (
                        <Card key={client.id} className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden border-red-200 dark:border-red-900" onClick={() => setSelectedClient(client)}>
                             <CardContent className="p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                        <AlertCircle className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold truncate">{client.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                     <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-900/10">Unpaid</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {unpaidClients.length === 0 && (
                         <div className="text-center py-4 text-muted-foreground">
                            <p>No clients yet</p>
                        </div>
                    )}
                </div>
            )}
        </div>



        {/* History Section */}
        {/* History Section */}
        <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">
                {filter === "all" && "Payment Requests History"}
                {filter === "pending" && "Pending Payment Requests"}
                {filter === "approved" && "Approved Payment Requests"}
                {filter === "rejected" && "Rejected Payment Requests"}
                {filter === "scheduled" && "Scheduled Payment Requests"}
            </h2>
            
            <div className="space-y-4">
                {payments
                    .filter(p => filter === "all" || p.status === filter)
                    .slice(0, 5) // Show only latest 5 for all views
                    .map(payment => (
                        <PaymentReviewCard 
                            key={payment.id} 
                            payment={payment} 
                            clientId={payment.clientId}
                            clientName={(payment as any).clientName} 
                            requestedByName={(payment as any).requestedByName}
                            reviewedByName={(payment as any).reviewedByName}
                            onUpdate={() => loadStats(false)} 
                            hideActions={true}
                        />
                    ))}
                 {payments.filter(p => filter === "all" || p.status === filter).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No payment requests found.</p>
                    </div>
                 )}

                 {payments.length > 0 && (
                     <div className="mt-4 text-center">
                        <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
                            View Full History
                        </Button>
                    </div>
                 )}
            </div>
        </div>
      </main>

      {/* Mobile View */}
      <main 
        className="block md:hidden pb-20 px-4 py-6 min-h-screen"
        {...swipeHandlers}
      >
        {activeTab === "home" && (
            <div className="space-y-4">
                <h2 className="text-xl font-bold">Assalamu alikum</h2>
                
                 {/* Stats Grid for Mobile */}
                  <Card className={`hover:border-primary transition-all flex flex-col justify-between ${filter === 'all' ? 'border-primary' : ''}`} onClick={() => { setFilter("all"); loadStats(false); }}>
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                         <CreditCard className="h-4 w-4 text-muted-foreground" />
                     </CardHeader>
                     <CardContent>
                         <div className="text-4xl font-bold">{stats.totalRequests}</div>
                         <p className="text-xs text-muted-foreground">All time requests made</p>
                     </CardContent>
                 </Card>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="hover:border-primary transition-all flex flex-col justify-between" onClick={() => setActiveTab("clients")}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Clients</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalClients}</div>
                            <p className="text-[10px] text-muted-foreground">Manage clients</p>
                        </CardContent>
                    </Card>

                     <Card className={`hover:border-orange-500 transition-all flex flex-col justify-between ${filter === 'pending' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`} onClick={() => setFilter("pending")}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-600">Pending</CardTitle>
                            <Clock className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                                {payments.filter(p => p.status === 'pending').length}
                            </div>
                            <p className="text-[10px] text-muted-foreground">Awaiting</p>
                        </CardContent>
                    </Card>

                     <Card className={`hover:border-green-500 transition-all flex flex-col justify-between ${filter === 'approved' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`} onClick={() => setFilter("approved")}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                                {payments.filter(p => p.status === 'approved').length}
                            </div>
                            <p className="text-[10px] text-muted-foreground">Paid</p>
                        </CardContent>
                    </Card>

                     <Card className={`hover:border-red-500 transition-all flex flex-col justify-between ${filter === 'rejected' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`} onClick={() => setFilter("rejected")}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-red-600">Rejected</CardTitle>
                            <XCircle className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                                {payments.filter(p => p.status === 'rejected').length}
                            </div>
                            <p className="text-[10px] text-muted-foreground">Rejected</p>
                        </CardContent>
                    </Card>
                </div>

                {!userData?.terminated && (
                <div className="flex items-center justify-between mt-6 px-1 cursor-pointer transition-all hover:opacity-80" onClick={() => setIsRequestOpen(true)}>
                    <span className="text-xl font-bold">Payment Request</span>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0 rounded-full"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                )}

                <div className="mt-8">
                     <h2 className="text-xl font-bold mb-4">
                        {filter === "all" && "Payment Requests History"}
                        {filter === "pending" && "Pending Requests"}
                        {filter === "approved" && "Approved Payments"}
                        {filter === "rejected" && "Rejected Payments"}
                        {filter === "scheduled" && "Scheduled Payments"}
                    </h2>

                    <div className="space-y-4">
                        {payments
                            .filter(p => filter === "all" || p.status === filter)
                            .slice(0, 5) // Limit to 5 for all mobile views
                            .map(payment => (
                                <PaymentReviewCard 
                                    key={payment.id} 
                                    payment={payment} 
                                    clientId={payment.clientId}
                                    clientName={(payment as any).clientName} 
                                    requestedByName={(payment as any).requestedByName}
                                    reviewedByName={(payment as any).reviewedByName}
                                    onUpdate={() => loadStats(false)} 
                                    hideActions={true}
                                />
                            ))}
                         {payments.filter(p => filter === "all" || p.status === filter).length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No payment requests found.</p>
                            </div>
                         )}

                         {payments.length > 0 && (
                            <div className="mt-2">
                                <Button variant="outline" className="w-full" onClick={() => setIsHistoryOpen(true)}>
                                    View Full History
                                </Button>
                            </div>
                         )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === "clients" && (
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                        placeholder="Search clients..." 
                        className="pl-9"
                        value={mobileSearchTerm}
                        onChange={(e) => setMobileSearchTerm(e.target.value)}
                    />
                </div>
                <div className="grid gap-3">
                    {clients
                        .filter(c => c.name.toLowerCase().includes(mobileSearchTerm.toLowerCase()) || c.email.toLowerCase().includes(mobileSearchTerm.toLowerCase()))
                        .map(client => {
                             const isUnpaid = unpaidClients.some(u => u.id === client.id)
                             return (
                        <Card 
                            key={client.id} 
                            className={`cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${isUnpaid ? 'border-red-200 dark:border-red-900' : ''}`}
                            onClick={() => setSelectedClient(client)}
                        >
                                    <CardContent className="p-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isUnpaid ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-primary/10 text-primary'}`}>
                                                {isUnpaid ? <AlertCircle className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold truncate text-base">{client.name}</h3>
                                                <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                                            </div>
                                        </div>
                                        {isUnpaid && (
                                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-900/10 shrink-0">Unpaid</Badge>
                                        )}
                                    </CardContent>
                                </Card>
                             )
                        })
                    }
                    {clients.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No clients found</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === "unpaid" && (
            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-red-600">Unpaid Clients</h2>
                    <span className="text-red-600 font-bold text-lg">{unpaidClients.length}</span>
                 </div>
                 
                 <div className="grid gap-3">
                    {unpaidClients.map(client => (
                        <Card key={client.id} className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden border-red-200 dark:border-red-900" onClick={() => setSelectedClient(client)}>
                            <CardContent className="p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                        <AlertCircle className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold truncate">{client.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-900/10 shrink-0">Unpaid</Badge>
                            </CardContent>
                        </Card>
                    ))}
                    {unpaidClients.length === 0 && (
                         <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <p>No clients found</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === "scheduled" && (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold text-blue-600">Scheduled Payments</h2>
                     <span className="text-blue-600 font-bold text-lg">
                        {payments.filter(p => p.status === 'scheduled').length}
                     </span>
                </div>

                <div className="space-y-3">
                    {payments
                        .filter(p => p.status === 'scheduled')
                        .map(payment => (
                             <PaymentReviewCard 
                                key={payment.id} 
                                payment={payment} 
                                clientId={payment.clientId}
                                clientName={(payment as any).clientName} 
                                requestedByName={(payment as any).requestedByName}
                                reviewedByName={(payment as any).reviewedByName}
                                onUpdate={() => {}} 
                                hideActions={true}
                            />
                        ))
                    }
                    {payments.filter(p => p.status === 'scheduled').length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                             <Calendar className="h-12 w-12 opacity-20 mb-2" />
                             <p>No scheduled payments.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === "settings" && (
            <div className="space-y-6 pt-10">
                <div className="flex flex-col items-center justify-center space-y-2 py-6">
                     <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full shadow-lg border-2 border-primary/10">
                       <Image src="/logo.jpg" alt="Logo" fill className="object-cover" />
                     </div>
                     <div className="text-center">
                       <h2 className="text-2xl font-bold">{userData?.name || "SubAdmin"}</h2>
                       <p className="text-sm text-muted-foreground">{userData?.email}</p>
                     </div>
                </div>
                
                <Card>
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    {userData?.role === 'subadmin' ? <Users className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                                </div>
                                <div>
                                    <p className="font-medium">Theme</p>
                                    <p className="text-xs text-muted-foreground">Toggle dark mode</p>
                                </div>
                            </div>
                            <ModeToggle />
                        </div>

                        <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={handleSignOut}
                        >
                             <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                    <LogOut className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-red-600">Sign Out</p>
                                    <p className="text-xs text-muted-foreground">Log out of your account</p>
                                </div>
                             </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-center text-xs text-muted-foreground pt-8">
                     <p>App Version 1.0.0</p>
                     <p className="mt-1">Powered by Creative Hub</p>
                </div>
            </div>
        )}
      
        <footer className="py-6 text-center text-xs font-medium text-muted-foreground/30 uppercase tracking-widest">
            Special Thanks For CREATIVE HUB
        </footer>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/20 backdrop-blur-lg border-t rounded-t-3xl flex items-center justify-around z-50">
           <button 
                onClick={() => setActiveTab("home")}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === "home" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
           >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-medium">Home</span>
           </button>
           <button 
                onClick={() => setActiveTab("clients")}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === "clients" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
           >
                <Users className="h-5 w-5" />
                <span className="text-[10px] font-medium">Clients</span>
           </button>
           <button 
                onClick={() => setActiveTab("unpaid")}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === "unpaid" ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
           >
                <AlertCircle className="h-5 w-5" />
                <span className="text-[10px] font-medium">Unpaid</span>
           </button>
           <button 
                onClick={() => setActiveTab("scheduled")}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === "scheduled" ? "text-blue-500" : "text-muted-foreground hover:text-blue-500"}`}
           >
                <Calendar className="h-5 w-5" />
                <span className="text-[10px] font-medium">Scheduled</span>
           </button>
           <button 
                onClick={() => setActiveTab("settings")}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === "settings" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
           >
                <Settings className="h-5 w-5" />
                <span className="text-[10px] font-medium">Settings</span>
           </button>
      </div>
      
      {activeTab !== "settings" && !userData?.terminated && (
      <div className="fixed bottom-24 right-6 md:bottom-6 z-40">
        <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-background/20 backdrop-blur-md text-primary border border-primary hover:bg-primary/10"
            onClick={() => setIsRequestOpen(true)}
        >
            <Send className="h-6 w-6" />
        </Button>
      </div>
      )}
      
      {userData?.terminated && (
          <div className="fixed bottom-24 left-4 right-4 z-50 bg-destructive/90 backdrop-blur-md text-destructive-foreground p-4 rounded-lg shadow-lg text-center animate-in slide-in-from-bottom-5">
              <p className="font-bold">Account Terminated</p>
              <p className="text-sm">You cannot create new requests.</p>
          </div>
      )}

      <CreatePaymentRequestDialog 
        isOpen={isRequestOpen} 
        onClose={() => setIsRequestOpen(false)} 
        onSuccess={() => loadStats(false)}
      />

      <ClientDetailsDialog
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
      />
      <PaymentHistoryDialog 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        payments={payments}
        clients={clients}
        onUpdate={() => loadStats(false)}
      />
      <AssignedClientsDialog 
        isOpen={isClientsDialogOpen} 
        onClose={() => setIsClientsDialogOpen(false)} 
        clients={clients}
        unpaidClientIds={new Set(unpaidClients.map(c => c.id))}
      />
    </div>
  )
}
