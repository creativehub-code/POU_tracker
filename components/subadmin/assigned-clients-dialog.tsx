"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, Users, AlertCircle } from "lucide-react"
import type { Client } from "@/types"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface AssignedClientsDialogProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  unpaidClientIds?: Set<string>
}

export function AssignedClientsDialog({ isOpen, onClose, clients, unpaidClientIds }: AssignedClientsDialogProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] h-[100vh] p-0 rounded-none flex flex-col gap-0 bg-background">
        <div className="border-b p-4 flex items-center gap-4 bg-card">
           <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
           </Button>
           <DialogTitle className="text-xl font-bold">Assigned Clients ({clients.length})</DialogTitle>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search clients..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredClients.map(client => {
                        const isUnpaid = unpaidClientIds?.has(client.id)
                        return (
                            <Card 
                                key={client.id} 
                                className={`cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${isUnpaid ? 'border-red-200 dark:border-red-900' : ''}`}
                                onClick={() => {
                                    onClose() // Close dialog before navigating
                                    router.push(`/subadmin/clients/${client.id}`)
                                }}
                            >
                                <CardContent className="p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${isUnpaid ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-primary/10 text-primary'}`}>
                                            {isUnpaid ? <AlertCircle className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold truncate text-lg">{client.name}</h3>
                                            <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                                        </div>
                                    </div>
                                    {isUnpaid && (
                                         <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-900/10 shrink-0">Unpaid</Badge>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
                
                {filteredClients.length === 0 && (
                     <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No clients found.</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
