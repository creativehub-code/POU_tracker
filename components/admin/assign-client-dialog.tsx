"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Loader2 } from "lucide-react"
import { Client } from "@/types"
import { doc, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

interface AssignClientToSubAdminDialogProps {
  isOpen: boolean
  onClose: () => void
  subAdminId: string | undefined
  subAdminName: string | undefined
  clients: Client[] // All clients, filtered internally
  onSuccess: () => void
}

export function AssignClientToSubAdminDialog({ 
    isOpen, 
    onClose, 
    subAdminId, 
    subAdminName, 
    clients, 
    onSuccess 
}: AssignClientToSubAdminDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
        setSearchTerm("")
        setSelectedClients([])
    }
  }, [isOpen])

  // Filter clients: show only those NOT assigned to ANY subadmin (assignedSubAdminId is null/undefined)
  // Or maybe allow reassignment? Let's stick to unassigned ones for simplicity, or show all but disable assigned ones?
  // User asked "add more clients", implies picking from pool.
  // I will show ALL clients but clearly mark/disable those assigned to prevent accidental stealing, OR allow stealing if that's desired.
  // Let's allow stealing but with a warning visual.
  // Actually, usually you want to assign UNASSIGNED users. Let's filter for unassigned + users assigned to THIS subadmin (already in list, so redundant).
  // Better: Show All, but disable ones assigned to OTHER subadmins? Or just show Unassigned ones.
  // Let's show UNASSIGNED ones primarily.
  
  const availableClients = clients.filter(c => !c.assignedSubAdminId);

  const filteredClients = availableClients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggle = (clientId: string) => {
    setSelectedClients(prev => 
        prev.includes(clientId) 
            ? prev.filter(id => id !== clientId) 
            : [...prev, clientId]
    )
  }

  const handleSubmit = async () => {
    if (!subAdminId || selectedClients.length === 0) return;
    setLoading(true);
    try {
        const batch = writeBatch(db);
        selectedClients.forEach(clientId => {
            const ref = doc(db, "users", clientId);
            batch.update(ref, { assignedSubAdminId: subAdminId });
        });
        await batch.commit();
        
        toast({ title: "Success", description: `Assigned ${selectedClients.length} clients to ${subAdminName}` });
        onSuccess();
        onClose();
    } catch (error) {
        console.error("Error assigning clients:", error);
        toast({ title: "Error", description: "Failed to assign clients", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Clients to {subAdminName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search unassigned clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>

            <div className="border rounded-md p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {filteredClients.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                        {availableClients.length === 0 ? "No unassigned clients available." : "No matching clients found."}
                    </p>
                ) : (
                    filteredClients.map(client => (
                        <div key={client.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                            <Checkbox 
                                id={`assign-${client.id}`}
                                checked={selectedClients.includes(client.id)}
                                onCheckedChange={() => handleToggle(client.id)}
                            />
                            <Label htmlFor={`assign-${client.id}`} className="flex-1 cursor-pointer font-normal">
                                <span className="font-medium">{client.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{client.email}</span>
                            </Label>
                        </div>
                    ))
                )}
            </div>
            
            <div className="text-xs text-muted-foreground">
                {selectedClients.length} clients selected
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || selectedClients.length === 0}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Assign Clients"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
