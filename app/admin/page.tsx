"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { type Client, type Payment } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, IndianRupee, Clock, CheckCircle, XCircle, Plus, LogOut, ChevronDown, ChevronRight, Search } from "lucide-react"
import Image from "next/image"
import { AddClientDialog } from "@/components/admin/add-client-dialog"
import { ClientCard } from "@/components/admin/client-card"
import { PaymentReviewCard } from "@/components/admin/payment-review-card"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type FilterType = "all" | "pending" | "approved" | "rejected"

export default function AdminDashboard() {
  const { userData, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [showClients, setShowClients] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showDefaulters, setShowDefaulters] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!userData || userData.role !== "admin") {
        router.push("/login")
      }
    }
  }, [userData, authLoading, router])

  useEffect(() => {
    if (userData?.role === "admin") {
      loadData()
    }
  }, [userData])

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      // 1. Fetch Users
      const usersQuery = query(collection(db, "users"), where("role", "==", "client"))
      const usersSnap = await getDocs(usersQuery)
      
      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Omit<Client, "payments">[]

      // 2. Fetch All Payments
      // Optimization: In a large app, you'd fetch per-user or paginate. 
      // For now, fetching all is fine for the admin dashboard overview.
      const paymentsSnap = await getDocs(collection(db, "payments"))
      const allPayments = paymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert timestamp if needed, though 'any' type handles it for display usually
        uploadedAt: doc.data().uploadedAt?.toDate?.() || doc.data().uploadedAt
      })) as Payment[]

      // 3. Merge
      const clientsWithPayments: Client[] = usersData.map(user => {
        const userPayments = allPayments.filter(p => p.clientId === user.id)
        // Sort payments by uploadedAt desc
        userPayments.sort((a, b) => {
           const timeA = a.uploadedAt?.getTime?.() || 0
           const timeB = b.uploadedAt?.getTime?.() || 0
           return timeB - timeA
        })
        
        return {
          ...user,
          payments: userPayments
        }
      })

      setClients(clientsWithPayments)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients?id=${clientId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete client');
      }

      // Refresh local state silently
      loadData(false);
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error; // Re-throw so child component handles UI feedback
    }
  }

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

  const allPayments = clients.flatMap((c) => c.payments)
  const totalPayments = allPayments.reduce((sum, p) => (p.status === "approved" ? sum + p.amount : sum), 0)
  const pendingPayments = allPayments.filter((p) => p.status === "pending").length
  const approvedPayments = allPayments.filter((p) => p.status === "approved").length
  const rejectedPayments = allPayments.filter((p) => p.status === "rejected").length

  // Filter clients based on search term
  const filteredClients = clients.filter((client) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower)
    )
  })

  /* ------------------ DEFAULTERS LOGIC ------------------ */
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
  
  const defaulters = clients.filter(c => {
    // Check if they have an APPROVED payment for the current month
    const hasApprovedCurrent = c.payments?.some(
      p => p.month === currentMonth && p.status === "approved"
    )
    return !hasApprovedCurrent
  }).sort((a, b) => a.name.localeCompare(b.name))

  const getPendingMonths = (client: Client) => {
    // Find all unique months where status is 'pending'
    const months = client.payments
      .filter(p => p.status === "pending")
      .map(p => p.month)
      .filter((m): m is string => !!m)
    
    return Array.from(new Set(months))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
              <Image 
                src="/logo.jpg" 
                alt="PayTrack Logo" 
                fill 
                className="object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none md:text-3xl">
                <span className="font-normal text-xs text-muted-foreground md:text-xl md:text-foreground">Assalamu alaikum</span> Admin
              </h1>
              <p className="text-xs font-normal text-muted-foreground md:text-sm">
                {new Date().toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              {userData?.isDemo && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Demo Mode
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut} className="hover:text-red-600 hover:bg-red-50 hover:border-red-200">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        


        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md col-span-2 lg:col-span-1"
            onClick={() => setFilterType("all")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalPayments.toLocaleString("en-IN")}</div>
              <p className="text-xs text-muted-foreground">Approved amount</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => setFilterType("all")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
              <p className="text-xs text-muted-foreground">Active accounts</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-orange-500 hover:shadow-md"
            onClick={() => setFilterType("pending")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingPayments}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-green-500 hover:shadow-md"
            onClick={() => setFilterType("approved")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedPayments}</div>
              <p className="text-xs text-muted-foreground">Verified payments</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-red-500 hover:shadow-md"
            onClick={() => setFilterType("rejected")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedPayments}</div>
              <p className="text-xs text-muted-foreground">Declined payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Clients Section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold md:text-2xl">Client Management</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClients(!showClients)}
                className="flex items-center gap-1"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showClients ? "" : "-rotate-90"}`} />
                {showClients ? "Hide" : "Show"}
              </Button>
            </div>
            <Button onClick={() => setAddClientOpen(true)} size="sm" className="md:size-default">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>

          {showClients && (
            <>
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search clients by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
                {filteredClients.map((client) => (
                  <ClientCard key={client.id} client={client} onDelete={handleDeleteClient} onUpdate={() => loadData(false)} />
                ))}
              </div>

              {filteredClients.length === 0 && clients.length > 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-2 text-lg font-medium">No clients found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
                  </CardContent>
                </Card>
              )}

              {clients.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-2 text-lg font-medium">No clients found</p>
                    <p className="mb-4 text-sm text-muted-foreground">Add your first client to get started</p>
                    <Button onClick={() => setAddClientOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Client
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Defaulters Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between py-2">
             <div className="flex items-center gap-2">
               <div>
                  <h2 className="text-xl font-bold md:text-2xl">Unpaid Current Month</h2>
                  <p className="text-xs text-muted-foreground">{currentMonth}</p>
               </div>
               <Button variant="ghost" size="sm" onClick={() => setShowDefaulters(!showDefaulters)} className="ml-2">
                 {showDefaulters ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}
                 {showDefaulters ? "Hide" : "Show"}
               </Button>
             </div>
             <Badge variant={defaulters.length > 0 ? "destructive" : "secondary"}>
               {defaulters.length} Clients
             </Badge>
          </div>
          
          {showDefaulters && (
            <div className="animate-in slide-in-from-top-2 duration-200 mt-2">
               {defaulters.length === 0 ? (
                 <div className="py-8 text-center text-muted-foreground">
                   <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
                   <p>Great job! All clients have paid for {currentMonth}.</p>
                 </div>
               ) : (
                 <div className="max-h-[400px] overflow-y-auto border rounded-md">
                    {defaulters.map((client) => {
                       const pendingMonths = getPendingMonths(client)
                       // If current month is pending, it implies they TRIED to pay but it's not approved yet.
                       // If no record exists, they are just "unpaid".
                       
                       return (
                         <div key={client.id} className="flex items-center justify-between border-b p-3 last:border-0 hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground">
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{client.name}</p>
                                <p className="text-xs text-muted-foreground">{client.email}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                               {pendingMonths.length > 0 ? (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                                        {pendingMonths.length} Pending Request{pendingMonths.length !== 1 && 's'}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Pending Payments - {client.name}</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-2 pt-2">
                                         {pendingMonths.map((m, i) => (
                                           <div key={i} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                             <span className="font-medium">{m}</span>
                                             <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-600">Pending Approval</Badge>
                                           </div>
                                         ))}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                               ) : (
                                  <Badge variant="outline" className="text-muted-foreground">No Requests</Badge>
                               )}
                            </div>
                         </div>
                       )
                    })}
                 </div>
               )}
            </div>
          )}
        </div>

</main>
      
      {/* Filtered Payments List */}
      {allPayments.length > 0 && (
        <section className="container mx-auto px-4 py-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold md:text-2xl">
                {filterType === "all" && "All Payments"}
                {filterType === "pending" && "Pending Reviews"}
                {filterType === "approved" && "Approved Payments"}
                {filterType === "rejected" && "Rejected Payments"}
              </h2>
              
               <div className="flex flex-wrap gap-2">
                <Badge
                  variant={filterType === "all" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90"
                  onClick={() => setFilterType("all")}
                >
                  All ({allPayments.length})
                </Badge>
                <Badge
                  variant={filterType === "pending" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90"
                  onClick={() => setFilterType("pending")}
                >
                  Pending ({pendingPayments})
                </Badge>
                <Badge
                  variant={filterType === "approved" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90"
                  onClick={() => setFilterType("approved")}
                >
                  Approved ({approvedPayments})
                </Badge>
                <Badge
                  variant={filterType === "rejected" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90"
                  onClick={() => setFilterType("rejected")}
                >
                  Rejected ({rejectedPayments})
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {allPayments
                .filter((p) => filterType === "all" || p.status === filterType)
                .sort((a, b) => {
                   // Sort by date desc
                   const dateA = a.uploadedAt instanceof Date ? a.uploadedAt.getTime() : 0;
                   const dateB = b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : 0;
                   return dateB - dateA;
                })
                .map((payment) => {
                  const client = clients.find(c => c.id === payment.clientId)
                  return (
                    <PaymentReviewCard
                      key={payment.id}
                      payment={payment}
                      clientId={payment.clientId}
                      clientName={client?.name}
                      onUpdate={() => loadData(false)} 
                    />
                  )
                })}
            </div>
            
             {allPayments.filter((p) => filterType === "all" || p.status === filterType).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                   <p>No payments found for this filter.</p>
                </div>
             )}
        </section>
      )}

      <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} onSuccess={loadData} />

      <footer className="py-6 text-center text-xs font-medium text-muted-foreground/30 uppercase tracking-widest">
        Special Thanks For CREATIVE HUB
      </footer>
    </div>
  )
}
