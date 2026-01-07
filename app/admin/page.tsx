"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, getDocs, doc, deleteDoc, writeBatch, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { type Client, type Payment } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, IndianRupee, Clock, CheckCircle, XCircle, Plus, LogOut, ChevronDown, ChevronRight, Search, LayoutDashboard, Shield, Settings, AlertCircle, Menu } from "lucide-react"
import Image from "next/image"

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CreateSubAdminDialog } from "@/components/admin/create-subadmin-dialog"
import { SubAdminDetailsDialog } from "@/components/admin/subadmin-details-dialog"
import { AssignClientToSubAdminDialog } from "@/components/admin/assign-client-dialog"
import { AllTransactionsDialog } from "@/components/admin/all-transactions-dialog"

type FilterType = "all" | "pending" | "approved" | "rejected"

export default function AdminDashboard() {
  const { userData, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  // const [addClientOpen, setAddClientOpen] = useState(false) // Removed unused state
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [showClients, setShowClients] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [subAdmins, setSubAdmins] = useState<Client[]>([])
  const [showSubAdmins, setShowSubAdmins] = useState(false)
  const [createSubAdminOpen, setCreateSubAdminOpen] = useState(false)
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<Client | null>(null)
  const [assignClientOpen, setAssignClientOpen] = useState(false)
  const [showDefaulters, setShowDefaulters] = useState(false)
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map())

  const [allTransactionsOpen, setAllTransactionsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"home" | "subadmins" | "clients" | "unpaid" | "settings">("home")
  const [clientToUnassign, setClientToUnassign] = useState<string | null>(null)

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
      
      // AUTO-SEND LOGIC: Promote 'scheduled' payments for current month to 'pending'
      const now = new Date();
      const currentMonthFull = now.toLocaleString('default', { month: 'long', year: 'numeric' }); // "January 2026"
      
      const batch = writeBatch(db)
      let updatesCount = 0

      const allPayments = paymentsSnap.docs.map(doc => {
        const data = doc.data()
        
        // Check for auto-send condition: formatted "Month Year" matches current period
        // We use data.month which stores "Month Year" string for scheduled payments
        if (data.status === 'scheduled' && data.month === currentMonthFull) {
             batch.update(doc.ref, { 
                 status: 'pending',
                 // Preserve requestedBy and subAdminId to show confirmation
                 // We don't need to re-set them if they exist, but if we updated properties we ensure they stay
             })
             updatesCount++
             // Return updated data for local state
             return {
                id: doc.id,
                ...data,
                status: 'pending',
                uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt
             } as Payment
        }

        return {
            id: doc.id,
            ...data,
            uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt
        } as Payment
      })

      if (updatesCount > 0) {
          await batch.commit()
          console.log(`Auto-promoted ${updatesCount} scheduled payments to pending.`)
      }

      // 3. Fetch All Users for Name Mapping (Admins, SubAdmins, Clients)
      const allUsersSnap = await getDocs(collection(db, "users"))
      const usersMap = new Map<string, string>()
      const subAdminsList: Client[] = []
      
      allUsersSnap.docs.forEach(doc => {
        const data = doc.data()
        usersMap.set(doc.id, data.name || "Unknown")
        if (data.role === "subadmin") {
            subAdminsList.push({ id: doc.id, ...data } as Client)
        }
      })
      setSubAdmins(subAdminsList)
      setUsersMap(usersMap)


      // 4. Merge
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
          payments: userPayments,
          subAdminName: (user as any).assignedSubAdminId ? usersMap.get((user as any).assignedSubAdminId) : undefined
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

  const handleUnassignClient = async (clientId: string) => {
    setClientToUnassign(clientId)
  }

  const confirmUnassignClient = async () => {
    if (!clientToUnassign) return
    const clientId = clientToUnassign
    try {
        const clientRef = doc(db, "users", clientId);
        await updateDoc(clientRef, {
            assignedSubAdminId: null
        });
        // Update local state for immediate feedback
        setClients(prev => prev.map(c => c.id === clientId ? {...c, assignedSubAdminId: undefined, subAdminName: undefined} : c));
        // Also close the details dialog if open (handled by parent re-render usually, or we assume it's fine)
    } catch (error) {
        console.error("Error unassigning client:", error);
        toast({
            title: "Error",
            description: "Failed to unassign client",
            variant: "destructive"
        })
    } finally {
        setClientToUnassign(null)
    }
  }

  const handleDeleteSubAdmin = async (subAdminId: string) => {
      try {
          const response = await fetch(`/api/clients?id=${subAdminId}`, {
              method: 'DELETE',
          });
          
          if (!response.ok) {
               const data = await response.json();
               throw new Error(data.error || 'Failed to delete subadmin');
          }

          // Refresh local state silently
          loadData(false);
          setSelectedSubAdmin(null);
      } catch (error) {
          console.error("Error deleting subadmin:", error);
          toast({
            title: "Error",
            description: "Failed to delete subadmin: " + (error as any).message,
            variant: "destructive",
          })
      }
  }

  const handleToggleSubAdminStatus = async (subAdminId: string, currentStatus: boolean) => {
      // Prevent event bubbling issues if any
      try {
          const subAdminRef = doc(db, "users", subAdminId)
          await updateDoc(subAdminRef, {
              terminated: !currentStatus
          })
          
          setSubAdmins(prev => prev.map(admin => 
              admin.id === subAdminId ? { ...admin, terminated: !currentStatus } : admin
          ))
          
          // Also update clients list if any logic depends on it, but mainly subadmins list
      } catch (error) {
          console.error("Error updating subadmin status:", error)
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
      {activeTab !== 'settings' && (
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-3">
             {activeTab === "home" ? (
                <>
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
                </div>
                </>
             ) : (
                <h1 className="text-xl font-bold md:text-3xl capitalize">
                    {activeTab === 'subadmins' ? 'Subadmin Management' : 
                     activeTab === 'clients' ? 'Client Management' : 
                     activeTab === 'unpaid' ? 'Unpaid Management' : 
                     activeTab}
                </h1>
             )}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <ModeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut} className="hover:text-red-600 hover:bg-red-50 hover:border-red-200">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      )}

      <main className="hidden md:block container mx-auto px-4 py-6 md:py-8">
        


        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">

          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md col-span-2 lg:col-span-1"
            onClick={() => { setFilterType("all"); loadData(false); }}
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
            className={`cursor-pointer transition-all hover:border-orange-500 hover:shadow-md ${filterType === "pending" ? "border-orange-500 ring-1 ring-orange-500" : ""}`}
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
              className={`cursor-pointer transition-all hover:border-green-500 hover:shadow-md ${filterType === "approved" ? "border-green-500 ring-1 ring-green-500" : ""}`}
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
              className={`cursor-pointer transition-all hover:border-red-500 hover:shadow-md ${filterType === "rejected" ? "border-red-500 ring-1 ring-red-500" : ""}`}
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

        {/* Subadmins Section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => setShowSubAdmins(!showSubAdmins)}
            >
              <h2 className="text-xl font-bold md:text-2xl">Subadmins</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showSubAdmins ? "" : "-rotate-90"}`} />
              </Button>
            </div>
            <Button onClick={() => setCreateSubAdminOpen(true)} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />SubAdmin
            </Button>
          </div>

          {showSubAdmins && (
            <div className="max-h-[400px] overflow-y-auto border rounded-md p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
                 {subAdmins.map((subAdmin) => (
                    <Card 
                        key={subAdmin.id} 
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedSubAdmin(subAdmin)}
                    >
                      <div className="flex items-center justify-between">
                         <div>
                            <div className="flex items-center gap-2">
                               <p className="text-sm font-semibold">{subAdmin.name}</p>
                               <Badge variant="outline" className="text-[10px] h-5 px-1.5 py-0">SubAdmin</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{subAdmin.email}</p>
                         </div>
                      </div>
                    </Card>
                 ))}
                 {subAdmins.length === 0 && (
                     <div className="col-span-full py-8 text-center text-muted-foreground">
                        <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p>No subadmins found.</p>
                     </div>
                 )}
              </div>
            </div>
          )}
        </div>

        {/* Clients Section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => setShowClients(!showClients)}
            >
              <h2 className="text-xl font-bold md:text-2xl">Client Management</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showClients ? "" : "-rotate-90"}`} />
              </Button>
            </div>
            <Button onClick={() => router.push("/admin/create-client")} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Client
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

              <div className="max-h-[600px] overflow-y-auto border rounded-md p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
                  {filteredClients.map((client) => (
                    <ClientCard 
                      key={client.id} 
                      client={client} 
                      subAdminName={(client as any).subAdminName}
                      onDelete={handleDeleteClient} 
                      onUpdate={() => loadData(false)} 
                    />
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
                      <Button onClick={() => router.push("/admin/create-client")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Client
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>

        {/* Defaulters Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between py-2">
             <div 
               className="flex items-center gap-2 cursor-pointer select-none"
               onClick={() => setShowDefaulters(!showDefaulters)}
             >
               <div>
                  <h2 className="text-xl font-bold md:text-2xl">Unpaid Current Month</h2>
                  <p className="text-xs text-muted-foreground">{currentMonth}</p>
               </div>
               <Button variant="ghost" size="sm" className="ml-2 h-8 w-8 p-0">
                 {showDefaulters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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


      
      {/* Filtered Payments List */}
      {allPayments.length > 0 && (
        <section className="hidden md:block container mx-auto px-4 py-8">
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
                .slice(0, 5) // Limit to 5 for all views
                .map((payment) => {
                  const client = clients.find(c => c.id === payment.clientId)
                  return (
                    <PaymentReviewCard
                      key={payment.id}
                      payment={payment}
                      clientId={payment.clientId}
                      clientName={client?.name}
                      requestedByName={payment.requestedBy ? usersMap.get(payment.requestedBy) : undefined}
                      reviewedByName={payment.reviewedBy ? usersMap.get(payment.reviewedBy) : undefined}
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

            {allPayments.length > 5 && (
                <div className="mt-6 text-center">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAllTransactionsOpen(true)}>
                        View All Transactions
                    </Button>
                </div>
            )}
        </section>
      )}



      </main>
      
      {/* Mobile Main */}
      <main className="block md:hidden pb-20 px-4 py-4">
          {activeTab === 'home' && (
              <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      {/* Total Payments Amount - Click to reset filter */}
                      <Card className={`col-span-2 cursor-pointer transition-all ${filterType === 'all' ? 'border-primary' : ''}`} onClick={() => { setFilterType('all'); loadData(false); }}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                              <IndianRupee className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold">₹{totalPayments.toLocaleString("en-IN")}</div>
                              <p className="text-xs text-muted-foreground">Tap to view all</p>
                          </CardContent>
                      </Card>

                      {/* Total Clients - Click to reset filter (or separate behavior? user said "all clients cards... filter payments", assumes it resets payment filter) */}
                      <Card className="cursor-pointer hover:border-primary transition-all" onClick={() => setFilterType('all')}>
                        <CardContent className="p-4 relative flex flex-col items-center justify-center text-center">
                            <Users className="absolute top-0 right-3 h-4 w-4 text-muted-foreground" />
                            <div className="text-2xl font-bold">{clients.length}</div>
                            <p className="text-xs text-muted-foreground">All Clients</p>
                        </CardContent>
                      </Card>

                       <Card 
                            className={`cursor-pointer transition-all ${filterType === 'pending' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`} 
                            onClick={() => setFilterType('pending')}
                       >
                          <CardContent className="p-4 relative flex flex-col items-center justify-center text-center">
                              <Clock className="absolute top-0 right-3 h-4 w-4 text-orange-500" />
                              <div className="text-2xl font-bold text-orange-600">{pendingPayments}</div>
                              <p className="text-xs text-muted-foreground">Pending</p>
                          </CardContent>
                      </Card>
                       <Card 
                            className={`cursor-pointer transition-all ${filterType === 'approved' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`} 
                            onClick={() => setFilterType('approved')}
                       >
                          <CardContent className="p-4 relative flex flex-col items-center justify-center text-center">
                              <CheckCircle className="absolute top-0 right-3 h-4 w-4 text-green-500" />
                              <div className="text-2xl font-bold text-green-600">{approvedPayments}</div>
                              <p className="text-xs text-muted-foreground">Approved</p>
                          </CardContent>
                      </Card>

                      <Card 
                            className={`cursor-pointer transition-all ${filterType === 'rejected' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`} 
                            onClick={() => setFilterType('rejected')}
                       >
                          <CardContent className="p-4 relative flex flex-col items-center justify-center text-center">
                              <XCircle className="absolute top-0 right-3 h-4 w-4 text-red-500" />
                              <div className="text-2xl font-bold text-red-600">{rejectedPayments}</div>
                              <p className="text-xs text-muted-foreground">Rejected</p>
                          </CardContent>
                      </Card>
                   </div>

                   <div className="space-y-4">
                       <h3 className="text-lg font-bold">
                           {filterType === 'all' && "Recent Payments"}
                           {filterType === 'pending' && "Pending Requests"}
                           {filterType === 'approved' && "Approved Payments"}
                           {filterType === 'rejected' && "Rejected Payments"}
                       </h3>
                       <div className="flex flex-col gap-4">
                           {allPayments
                                .filter(p => filterType === 'all' || p.status === filterType)
                                .slice(0, 5)
                                .map(payment => (
                                    <PaymentReviewCard 
                                        key={payment.id}
                                        payment={payment}
                                        clientId={payment.clientId}
                                        clientName={clients.find(c => c.id === payment.clientId)?.name}
                                        requestedByName={payment.requestedBy ? usersMap.get(payment.requestedBy) : undefined}
                                        reviewedByName={payment.reviewedBy ? usersMap.get(payment.reviewedBy) : undefined}
                                        onUpdate={() => loadData(false)}
                                        hideActions={false}
                                    />
                           ))}
                           {allPayments.filter(p => filterType === 'all' || p.status === filterType).length === 0 && (
                               <p className="text-center text-muted-foreground py-8">No payments found</p>
                           )}
                       </div>
                       <Button 
                            variant="outline" 
                            className="w-full mt-2" 
                            onClick={() => setAllTransactionsOpen(true)}
                        >
                            View Full History
                        </Button>
                   </div>
              </div>
          )}

          {activeTab === 'subadmins' && (
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">Subadmins</h2>
                      <Button onClick={() => setCreateSubAdminOpen(true)} size="sm" variant="outline">
                          <Plus className="mr-2 h-4 w-4" /> Add
                      </Button>
                  </div>
                  <div className="grid gap-3">
                      {subAdmins.map((subAdmin) => (
                          <Card key={subAdmin.id} className={`cursor-pointer group relative ${subAdmin.terminated ? 'opacity-70 bg-red-50 dark:bg-red-950/20' : ''}`} onClick={() => setSelectedSubAdmin(subAdmin)}>
                               <div className="p-3 flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                       <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                           <Shield className="h-5 w-5 text-primary" />
                                       </div>
                                       <div>
                                           <p className="font-semibold flex items-center gap-2">
                                               {subAdmin.name}
                                               {subAdmin.terminated && <span className="text-[10px] text-red-600 font-bold uppercase border border-red-200 bg-red-100 px-1 rounded">Terminated</span>}
                                           </p>
                                           <p className="text-xs text-muted-foreground">{subAdmin.email}</p>
                                       </div>
                                   </div>
                                   <Button 
                                    size="sm" 
                                    variant={subAdmin.terminated ? "default" : "destructive"} 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleSubAdminStatus(subAdmin.id, subAdmin.terminated || false)
                                    }}
                                   >
                                       {subAdmin.terminated ? "Activate" : "Terminate"}
                                   </Button>
                               </div>
                          </Card>
                      ))}
                      {subAdmins.length === 0 && <p className="text-center text-muted-foreground py-8">No subadmins found</p>}
                  </div>
               </div>
          )}

          {activeTab === 'clients' && (
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">Clients</h2>
                      <Button onClick={() => router.push("/admin/create-client")} size="sm" variant="outline">
                          <Plus className="mr-2 h-4 w-4" /> Add
                      </Button>
                  </div>
                   <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="grid gap-3">
                     {filteredClients.map((client) => (
                          <ClientCard 
                              key={client.id} 
                              client={client} 
                              subAdminName={(client as any).subAdminName}
                              onDelete={handleDeleteClient} 
                              onUpdate={() => loadData(false)} 
                          />
                     ))}
                     {filteredClients.length === 0 && <p className="text-center text-muted-foreground py-8">No clients found</p>}
                  </div>
               </div>
          )}

          {activeTab === 'unpaid' && (
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-red-600">Unpaid ({currentMonth})</h2>
                       <Badge variant="destructive">{defaulters.length}</Badge>
                  </div>
                  <div className="grid gap-3">
                       {defaulters.map(client => {
                           const pendingMonths = getPendingMonths(client)
                           return (
                             <Card key={client.id} className="border-red-200">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                                            <AlertCircle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{client.name}</p>
                                            <p className="text-xs text-muted-foreground">{client.email}</p>
                                        </div>
                                    </div>
                                     {pendingMonths.length > 0 && (
                                         <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">{pendingMonths.length} Pending</Badge>
                                     )}
                                </CardContent>
                             </Card>
                           )
                       })}
                       {defaulters.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                            <p>All clients have paid!</p>
                         </div>
                       )}
                  </div>
               </div>
          )}

          {activeTab === 'settings' && (
              <div className="space-y-6 pt-10">
                  <div className="flex flex-col items-center justify-center space-y-2 py-6">
                       <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full shadow-lg border-2 border-primary/10">
                         <Image src="/logo.jpg" alt="Logo" fill className="object-cover" />
                       </div>
                       <div className="text-center">
                         <h2 className="text-2xl font-bold">Admin</h2>
                         <p className="text-sm text-muted-foreground">{userData?.email}</p>
                       </div>
                  </div>
                   <Card>
                      <CardContent className="p-0">
                           <div className="flex items-center justify-between p-4 border-b">
                              <p className="font-medium">Dark Mode</p>
                              <ModeToggle />
                          </div>
                           <div className="flex items-center justify-between p-4 cursor-pointer text-red-600" onClick={handleSignOut}>
                              <p className="font-medium">Sign Out</p>
                              <LogOut className="h-4 w-4" />
                          </div>
                      </CardContent>
                  </Card>
              </div>
          )}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-lg border-t rounded-t-3xl overflow-hidden flex items-center justify-around z-50">
           <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'}`}>
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px]">Home</span>
           </button>
           <button onClick={() => setActiveTab('subadmins')} className={`flex flex-col items-center gap-1 ${activeTab === 'subadmins' ? 'text-primary' : 'text-muted-foreground'}`}>
                <Shield className="h-5 w-5" />
                <span className="text-[10px]">Subadmins</span>
           </button>
           <button onClick={() => setActiveTab('clients')} className={`flex flex-col items-center gap-1 ${activeTab === 'clients' ? 'text-primary' : 'text-muted-foreground'}`}>
                <Users className="h-5 w-5" />
                <span className="text-[10px]">Clients</span>
           </button>
            <button onClick={() => setActiveTab('unpaid')} className={`flex flex-col items-center gap-1 ${activeTab === 'unpaid' ? 'text-red-500' : 'text-muted-foreground'}`}>
                <AlertCircle className="h-5 w-5" />
                <span className="text-[10px]">Unpaid</span>
           </button>
            <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'}`}>
                <Settings className="h-5 w-5" />
                <span className="text-[10px]">Settings</span>
           </button>
      </div>

       <CreateSubAdminDialog 
            isOpen={createSubAdminOpen} 
            onClose={() => setCreateSubAdminOpen(false)} 
            onSuccess={() => loadData(false)}
        />

        <SubAdminDetailsDialog
            subAdmin={selectedSubAdmin}
            isOpen={!!selectedSubAdmin}
            onClose={() => setSelectedSubAdmin(null)}
            assignedClients={clients.filter(c => c.assignedSubAdminId === selectedSubAdmin?.id)}
            onUnassignClient={handleUnassignClient}
            onAddClient={() => setAssignClientOpen(true)}
            onDeleteSubAdmin={() => selectedSubAdmin && handleDeleteSubAdmin(selectedSubAdmin.id)}
            onToggleStatus={(id, status) => {
              handleToggleSubAdminStatus(id, status)
              setSelectedSubAdmin(prev => prev ? {...prev, terminated: !status} : null)
            }}
        />

        <AssignClientToSubAdminDialog 
            isOpen={assignClientOpen}
            onClose={() => setAssignClientOpen(false)}
            subAdminId={selectedSubAdmin?.id}
            subAdminName={selectedSubAdmin?.name}
            clients={clients} 
            onSuccess={() => loadData(false)}
        />

        <AllTransactionsDialog
            isOpen={allTransactionsOpen}
            onClose={() => setAllTransactionsOpen(false)}
            payments={allPayments}
            usersMap={usersMap}
            clients={clients}
            onUpdate={() => loadData(false)}
        />

      <footer className="py-6 text-center text-xs font-medium text-muted-foreground/30 uppercase tracking-widest">
        Special Thanks For CREATIVE HUB
      </footer>

      <AlertDialog open={!!clientToUnassign} onOpenChange={(open) => !open && setClientToUnassign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unassign this client? They will no longer be managed by their current SubAdmin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnassignClient}>
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
