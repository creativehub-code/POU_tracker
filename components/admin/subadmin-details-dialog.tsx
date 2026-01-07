"use client"

import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Button } from "@/components/ui/button"
import { Client } from "@/types"
import { Mail, User, Key, Plus, Trash2, Eye, EyeOff, ShieldCheck, ShieldBan } from "lucide-react"

interface SubAdminDetailsDialogProps {
  subAdmin: Client | null
  isOpen: boolean
  onClose: () => void
  assignedClients: Client[]
  onUnassignClient: (clientId: string) => void
  onAddClient: () => void
  onDeleteSubAdmin: () => void
  onToggleStatus: (subAdminId: string, currentStatus: boolean) => void
}

export function SubAdminDetailsDialog({ subAdmin, isOpen, onClose, assignedClients, onUnassignClient, onAddClient, onDeleteSubAdmin, onToggleStatus }: SubAdminDetailsDialogProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  if (!subAdmin) return null

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full w-full h-[100dvh] p-0 sm:max-w-full sm:h-[100dvh] sm:rounded-none border-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
            <DialogHeader>
            <DialogTitle>SubAdmin Details</DialogTitle>
            <DialogDescription>
                Managed clients for this SubAdmin.
            </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
                <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{subAdmin.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{subAdmin.email}</span>
                        </div>
                        {subAdmin.initialPassword && (
                            <div className="flex items-center gap-2">
                                <Key className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-mono bg-white/50 px-1.5 py-0.5 rounded">
                                    {showPassword ? subAdmin.initialPassword : "••••••••"}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-1"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className={`h-8 w-8 ${subAdmin.terminated ? "hover:bg-green-100 dark:hover:bg-green-900/20" : "hover:bg-red-100 dark:hover:bg-red-900/20"}`}
                            onClick={() => {
                                onToggleStatus(subAdmin.id, subAdmin.terminated || false)
                            }}
                            title={subAdmin.terminated ? "Activate" : "Terminate"}
                        >
                            {subAdmin.terminated ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldBan className="h-5 w-5 text-red-600" />}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteDialogOpen(true)}
                            title="Delete SubAdmin"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Assigned Clients ({assignedClients.length})</h4>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAddClient}>
                        <Plus className="mr-1 h-3 w-3" /> Add Client
                    </Button>
                </div>
                    
                    <div className="border rounded-md divide-y h-full overflow-y-auto">
                        {assignedClients.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No clients assigned.
                            </div>
                        ) : (
                            assignedClients.map(client => (
                                <div key={client.id} className="p-3 flex items-center justify-between hover:bg-muted/30">
                                    <div>
                                        <p className="text-sm font-medium">{client.name}</p>
                                        <p className="text-xs text-muted-foreground">{client.email}</p>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                                        <span>{client.payments?.length || 0} Payments</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => onUnassignClient(client.id)}
                                            title="Unassign Client"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                </div>
                            ))
                        )}
                    </div>

                </div>
            </div>
        </div>

        <div className="p-6 border-t bg-background mt-auto">
             <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SubAdmin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {subAdmin.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                setDeleteDialogOpen(false)
                onDeleteSubAdmin()
            }} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
