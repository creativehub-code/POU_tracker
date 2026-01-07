"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { type Client } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, ArrowLeft } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function SubAdminClientsPage() {
  const { user, userData, loading: authLoading } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [requestLoading, setRequestLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && (!userData || userData.role !== "subadmin")) {
        router.push("/login")
    }
  }, [authLoading, userData, router])

  useEffect(() => {
    async function loadClients() {
      if (!user) return
      setLoading(true)
      try {
        const q = query(collection(db, "users"), where("assignedSubAdminId", "==", user.uid))
        const snap = await getDocs(q)
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]
        setClients(data)
      } catch (error) {
        console.error("Error loading clients:", error)
      } finally {
        setLoading(false)
      }
    }
    if (userData?.role === "subadmin") {
         loadClients()
    }
  }, [user, userData])

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !user) return

    setRequestLoading(true)
    try {
        await addDoc(collection(db, "payments"), {
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            subAdminId: user.uid, // requestedBy
            requestedBy: user.uid, // Explicit as per prompt
            amount: Number(amount),
            reason,
            status: "pending",
            requestedAt: new Date(),
            month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }) // Auto-set month for now
        })

        toast({ title: "Success", description: "Payment request created successfully." })
        setDialogOpen(false)
        setAmount("")
        setReason("")
    } catch (error: any) {
        console.error("Error creating request:", error)
        toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
        setRequestLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>
      
      <h1 className="text-2xl font-bold mb-6">Assigned Clients</h1>
      
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map(client => (
                <Card key={client.id}>
                    <CardHeader>
                        <CardTitle>{client.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                    </CardHeader>
                    <CardContent>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full" onClick={() => setSelectedClient(client)}>
                                    <Plus className="mr-2 h-4 w-4" /> Create Request
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Request Payment for {client.name}</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateRequest} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Amount (₹)</Label>
                                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reason / Note</Label>
                                        <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Monthly Fee" required />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={requestLoading}>
                                        {requestLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Submit Request"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            ))}
            {clients.length === 0 && <p>No clients assigned.</p>}
        </div>
      )}
    </div>
  )
}
