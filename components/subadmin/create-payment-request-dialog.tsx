"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, AlertCircle, Plus, Calendar } from "lucide-react"
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Client } from "@/types"

interface CreatePaymentRequestDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface PrepaidDetail {
    amount: string
    description: string
    month: string
    year: string
    id: number // internal id for list rendering
}

export function CreatePaymentRequestDialog({ isOpen, onClose, onSuccess }: CreatePaymentRequestDialogProps) {
  const { user, userData } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  
  const [selectedClientId, setSelectedClientId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }))
  const [year, setYear] = useState(new Date().getFullYear().toString())
  
  const [isPrepaid, setIsPrepaid] = useState(false)
  const [duration, setDuration] = useState("1")
  const [prepaidDetails, setPrepaidDetails] = useState<PrepaidDetail[]>([])

  useEffect(() => {
    async function loadClients() {
      if (!user || !isOpen) return
      setLoadingClients(true)
      try {
        const q = query(collection(db, "users"), where("assignedSubAdminId", "==", user.uid))
        const snap = await getDocs(q)
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]
        setClients(data)
      } catch (error) {
        console.error("Error loading clients:", error)
        toast({
            title: "Error",
            description: "Failed to load clients.",
            variant: "destructive"
        })
      } finally {
        setLoadingClients(false)
      }
    }
    loadClients()
  }, [user, isOpen, toast])

  // Effect to generate prepaid details when configuration changes
  useEffect(() => {
    if (!isPrepaid) return

    const numberOfMonths = parseInt(duration) || 1
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const startMonthIndex = months.indexOf(month)
    const startYear = parseInt(year)

    setPrepaidDetails(prev => {
        // If the number of months matches, try to preserve edits, otherwise regenerate dates but keep amount/desc if possible
        // For simplicity and correctness with dates, we regenerte the structure but map values if index exists
        
        const newDetails: PrepaidDetail[] = []

        for (let i = 0; i < numberOfMonths; i++) {
            const currentMonthIndex = (startMonthIndex + i) % 12
            const yearOffset = Math.floor((startMonthIndex + i) / 12)
            const currentYear = (startYear + yearOffset).toString()
            const currentMonthName = months[currentMonthIndex]

            // specific logic: if we have a previous value at this index, use its amount/description?
            // User likely wants to set base amount and propagate, OR edit individually. 
            // Let's propagate the MAIN amount/description to all if they are empty, or keep existing.
            // Actually simplest UX: If main Amount changes, prompt or auto-update? 
            // Let's just initialize with main amount/desc if it's a fresh generation or completely new row
            
            const existing = prev[i]
            
            newDetails.push({
                id: i,
                amount: existing?.amount || amount,
                description: existing?.description || description || `Prepayment (${currentMonthName} ${currentYear})`,
                month: currentMonthName,
                year: currentYear
            })
        }
        return newDetails
    })
  }, [isPrepaid, duration, month, year, amount, description])


  const updatePrepaidDetail = (index: number, field: keyof PrepaidDetail, value: string) => {
      setPrepaidDetails(prev => {
          const newDetails = [...prev]
          newDetails[index] = { ...newDetails[index], [field]: value }
          return newDetails
      })
  }

  const handleSubmit = async () => {
    if (!user || !user.uid) {
      toast({ title: "Error", description: "You must be logged in to create a request.", variant: "destructive" })
      return
  }
  
  if (!selectedClientId) {
        toast({ title: "Validation Error", description: "Please select a client.", variant: "destructive" })
        return
    }

    if (!isPrepaid && (!amount || parseFloat(amount) <= 0)) {
         toast({ title: "Validation Error", description: "Please enter a valid amount.", variant: "destructive" })
         return
    }

    setLoading(true)
    try {
        const client = clients.find(c => c.id === selectedClientId)
        const requestsToCreate = []

        if (isPrepaid) {
            // Validate all prepaid rows
            for (const item of prepaidDetails) {
                 if (!item.amount || parseFloat(item.amount) <= 0) {
                     throw new Error(`Invalid amount for ${item.month} ${item.year}`)
                 }
            }

            for (const item of prepaidDetails) {
                 requestsToCreate.push({
                    clientId: selectedClientId,
                    clientName: client?.name || "Unknown",
                    amount: parseFloat(item.amount),
                    description: item.description,
                    status: "scheduled", // NEW STATUS
                    type: "request", 
                    tag: "prepaid",
                    requestedBy: user.uid,
                  subAdminId: user.uid, // Added for rule compliance and data consistency
                  requestedByName: userData?.name || user.displayName || user.email || "SubAdmin",
                    uploadedAt: serverTimestamp(), 
                    requestedAt: serverTimestamp(),
                    screenshotUrl: "", 
                    month: `${item.month} ${item.year}`,
                    scheduledFor: { month: item.month, year: item.year } // Helper for query
                })
            }
        } else {
             requestsToCreate.push({
                clientId: selectedClientId,
                clientName: client?.name || "Unknown",
                amount: parseFloat(amount),
                description: description || "Payment Request",
                status: "pending",
                type: "request", 
                tag: "regular",
                requestedBy: user.uid,
              subAdminId: user.uid, // Added for rule compliance
              requestedByName: userData?.name || user.displayName || user.email || "SubAdmin",
                uploadedAt: serverTimestamp(), 
                requestedAt: serverTimestamp(),
                screenshotUrl: "", 
                month: `${month} ${year}`
            })
        }
      
      await Promise.all(requestsToCreate.map(req => addDoc(collection(db, "payments"), req)))

        toast({
            title: "Request(s) Created",
            description: `Successfully created ${requestsToCreate.length} payment request(s).`,
        })
        
        onClose()
        
        if (onSuccess) {
            onSuccess()
        }

        // Reset form
        setSelectedClientId("")
        setAmount("")
        setDescription("")
        setIsPrepaid(false)
        setDuration("1")

    } catch (error: any) {
        console.error("Error creating request:", error)
        toast({
            title: "Error",
            description: error.message || "Failed to create payment request.",
            variant: "destructive"
        })
    } finally {
        setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment Request</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="client">Client</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={loadingClients || loading}>
                <SelectTrigger>
                    <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select a client"} />
                </SelectTrigger>
                <SelectContent>
                    {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                    {clients.length === 0 && !loadingClients && (
                        <div className="p-2 text-sm text-muted-foreground text-center">No assigned clients found</div>
                    )}
                </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Checkbox id="prepaid" checked={isPrepaid} onCheckedChange={(checked) => setIsPrepaid(checked as boolean)} disabled={loading} />
            <Label htmlFor="prepaid">Is Prepayment?</Label>
          </div>

          {!isPrepaid ? (
             <>
                <div className="grid gap-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                    min="0"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                    id="description"
                    placeholder="Reason for payment"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Month</Label>
                        <Select value={month} onValueChange={setMonth} disabled={loading}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Year</Label>
                        <Select value={year} onValueChange={setYear} disabled={loading}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
             </>
          ) : (
            <div className="space-y-4 border rounded-md p-4 bg-slate-50 dark:bg-slate-900/50">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="grid gap-2">
                        <Label>Start Month</Label>
                        <Select value={month} onValueChange={setMonth} disabled={loading}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Start Year</Label>
                        <Select value={year} onValueChange={setYear} disabled={loading}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2 col-span-2">
                        <Label>Duration (Months)</Label>
                        <Select value={duration} onValueChange={setDuration} disabled={loading}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[2, 3, 4, 5, 6, 9, 12].map(d => (
                                    <SelectItem key={d} value={d.toString()}>{d} Months</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 </div>

                 <div className="space-y-3 mt-4">
                     <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Breakdown</Label>
                     {prepaidDetails.map((detail, index) => (
                         <div key={detail.id} className="grid gap-3 p-3 border rounded-lg bg-background relative animate-in fade-in slide-in-from-top-1">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                     <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-auto p-1 px-2 font-medium text-sm flex items-center gap-2 hover:bg-muted">
                                                <Calendar className="h-4 w-4 text-primary" />
                                                <span>{detail.month} {detail.year}</span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-4" align="start">
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium leading-none">Reschedule</h4>
                                                    <p className="text-sm text-muted-foreground">Change the date for this payment.</p>
                                                </div>
                                                <div className="grid gap-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="grid gap-2">
                                                            <Label>Month</Label>
                                                            <Select 
                                                                value={detail.month} 
                                                                onValueChange={(val) => updatePrepaidDetail(index, 'month', val)}
                                                            >
                                                                <SelectTrigger className="w-[110px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label>Year</Label>
                                                            <Select 
                                                                value={detail.year} 
                                                                onValueChange={(val) => updatePrepaidDetail(index, 'year', val)}
                                                            >
                                                                <SelectTrigger className="w-[80px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map(y => (
                                                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                     </Popover>
                                 </div>
                                 <div className="text-xs text-muted-foreground">Month {index + 1}</div>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                 <Input 
                                    placeholder="Amount" 
                                    type="number" 
                                    value={detail.amount} 
                                    onChange={(e) => updatePrepaidDetail(index, 'amount', e.target.value)}
                                    className="h-8"
                                 />
                                 <Input 
                                    placeholder="Description" 
                                    value={detail.description} 
                                    onChange={(e) => updatePrepaidDetail(index, 'description', e.target.value)}
                                    className="h-8"
                                 />
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedClientId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPrepaid ? "Schedule Requests" : "Create Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

