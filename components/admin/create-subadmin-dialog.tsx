"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, ChevronDown, ChevronRight, Users } from "lucide-react"
import { collection, getDocs, query, where, doc, writeBatch, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Client } from "@/types"

interface CreateSubAdminDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateSubAdminDialog({ isOpen, onClose, onSuccess }: CreateSubAdminDialogProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showClientsSection, setShowClientsSection] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadClients()
    } else {
        // Reset form on close
        setName("")
        setEmail("")
        setPassword("")
        setSelectedClients([])
        setSearchTerm("")
    }
  }, [isOpen])

  const loadClients = async () => {
    try {
      // Fetch only clients who are NOT assigned to a subadmin yet? 
      // Or maybe allow reassignment? Let's just fetch all clients for now.
      // Based on user request "adding client to the under that subadmin", implying assignment.

      const q = query(collection(db, "users"), where("role", "==", "client"))
      const querySnapshot = await getDocs(q)
      const clientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[]
      
      // Filter out clients who already have a subadmin assigned if we want to enforce exclusive assignment,
      // but for flexibility, maybe just show them all and let admin decide.
      // Let's sort alphabetically
      clientsData.sort((a, b) => a.name.localeCompare(b.name))
      
      setClients(clientsData)
    } catch (error) {
      console.error("Error loading clients:", error)
      toast({
        title: "Error",
        description: "Failed to load clients.",
        variant: "destructive",
      })
    }
  }

  const handleClientToggle = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = await user?.getIdToken()
      
      // 1. Create SubAdmin via API (which handles Auth creation and basic Firestore doc)
      const response = await fetch("/api/admin/create-subadmin", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create SubAdmin")
      }

      const newSubAdminId = data.uid // Assuming API returns the new UID

      // 2. Assign selected clients to this new SubAdmin
      if (selectedClients.length > 0 && newSubAdminId) {
          const batch = writeBatch(db)
          selectedClients.forEach(clientId => {
              const clientRef = doc(db, "users", clientId)
              batch.update(clientRef, { 
                  assignedSubAdminId: newSubAdminId,
                  // We might want to store subAdminName loosely for easier display, but ID is source of truth
              })
          })
          await batch.commit()
      }

      toast({
        title: "Success",
        description: `SubAdmin ${name} created and ${selectedClients.length} clients assigned.`,
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Error creating subadmin:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create SubAdmin.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full w-full h-[100dvh] p-0 sm:max-w-3xl sm:h-auto sm:max-h-[85vh] sm:rounded-2xl border-0 flex flex-col gap-0 overflow-hidden bg-background/95 backdrop-blur-xl">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create SubAdmin</DialogTitle>
          <DialogDescription>
            Add a new SubAdmin and assign clients to them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6 max-w-4xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sa-name">Full Name</Label>
                <Input
                  id="sa-name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sa-email">Email Address</Label>
                <Input
                  id="sa-email"
                  type="email"
                  placeholder="subadmin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sa-password">Password</Label>
                <Input
                  id="sa-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <div
                    className="flex items-center gap-2 cursor-pointer select-none group"
                    onClick={() => setShowClientsSection(!showClientsSection)}
                 >
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <Label className="text-base font-semibold cursor-pointer block">Assign Clients</Label>
                        <span className="text-xs text-muted-foreground">Select clients to manage</span>
                    </div>
                    <Button type="button" variant="ghost" className="h-6 w-6 p-0 hover:bg-transparent ml-2">
                        {showClientsSection ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {selectedClients.length} Selected
                    </span>
                 </div>
              </div>
              
              {showClientsSection && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search clients by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors"
                        />
                    </div>

                    <div className="border rounded-xl p-2 h-[350px] overflow-y-auto space-y-2 bg-muted/10 scroller">
                        {filteredClients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <Search className="h-8 w-8 opacity-20" />
                                <p className="text-sm">No clients found matching "{searchTerm}"</p>
                            </div>
                        ) : (
                            filteredClients
                                .sort((a, b) => {
                                    const aSelected = selectedClients.includes(a.id);
                                    const bSelected = selectedClients.includes(b.id);
                                    if (aSelected === bSelected) return 0;
                                    return aSelected ? -1 : 1;
                                })
                                .map(client => {
                                const isAssigned = !!client.assignedSubAdminId;
                                const isSelected = selectedClients.includes(client.id);
                                return (
                                <div 
                                    key={client.id} 
                                    onClick={() => !isAssigned && handleClientToggle(client.id)}
                                    className={`
                                        flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer group
                                        ${isAssigned ? 'opacity-50 cursor-not-allowed bg-muted border-transparent' : 
                                          isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-background hover:border-primary/50 border-transparent shadow-sm'}
                                    `}
                                >
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Checkbox 
                                            id={`client-${client.id}`} 
                                            checked={isSelected}
                                            onCheckedChange={() => !isAssigned && handleClientToggle(client.id)}
                                            disabled={isAssigned}
                                            className={isSelected ? "border-primary" : ""}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <Label 
                                                className={`text-sm font-medium cursor-pointer ${isAssigned ? 'cursor-not-allowed' : ''}`}
                                            >
                                                {client.name}
                                            </Label>
                                            {isAssigned && (
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Assigned</Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors truncate max-w-[200px]">
                                            {client.email}
                                        </div>
                                    </div>
                                </div>
                            )})
                        )}
                    </div>
                </div>
              )}
            </div>
          </div>
        </form>
        </div>
        
        <div className="p-4 sm:p-6 border-t bg-background mt-auto">
            <DialogFooter className="sm:justify-end gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                    </>
                ) : (
                    "Create & Assign"
                )}
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
