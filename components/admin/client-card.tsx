"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type Client } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import { useToast } from "@/hooks/use-toast"
import { Eye, Trash2, IndianRupee, ChevronDown } from "lucide-react"
import { ClientDetailsDialog } from "./client-details-dialog"

interface ClientCardProps {
  client: Client
  subAdminName?: string
  onDelete: (id: string) => Promise<void>
  onUpdate: () => void
}

export function ClientCard({ client, subAdminName, onDelete, onUpdate }: ClientCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const approvedPayments = client.payments ? client.payments.filter((p) => p.status === "approved") : []
  const totalPaid = approvedPayments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = client.fixedAmount > 0 ? client.fixedAmount - totalPaid : client.targetAmount - totalPaid
  const progress =
    client.fixedAmount > 0
      ? Math.min((totalPaid / client.fixedAmount) * 100, 100)
      : client.targetAmount > 0
        ? Math.min((totalPaid / client.targetAmount) * 100, 100)
        : 0

  const handleDelete = async () => {
    setLoading(true)
    try {
      await onDelete(client.id)
      toast({
        title: "Success",
        description: `Client ${client.name} has been removed.`,
      })
    } catch (error) {
      console.error("Error deleting client:", error)
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{client.name}</CardTitle>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0" 
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{client.email}</p>
              {subAdminName && (
                <p className="text-xs text-blue-600 mt-1 font-medium">Assigned to: {subAdminName}</p>
              )}
            </div>
          </div>
        </CardHeader>
        {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex flex-row items-center justify-between gap-2 overflow-x-auto text-sm pb-2">
            <div className="shrink-0 space-y-1">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-semibold text-green-600">₹{totalPaid.toLocaleString("en-IN")}</p>
            </div>
            <div className="shrink-0 space-y-1">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-semibold text-orange-600">₹{remaining.toLocaleString("en-IN")}</p>
            </div>
            {client.fixedAmount > 0 && (
              <div className="shrink-0 space-y-1">
                <p className="text-xs text-muted-foreground">Fixed Amount</p>
                <p className="flex items-center gap-1 font-semibold">
                  <IndianRupee className="h-3 w-3" />
                  {client.fixedAmount.toLocaleString("en-IN")}
                </p>
              </div>
            )}
            {client.targetAmount > 0 && (
              <div className="shrink-0 space-y-1">
                <p className="text-xs text-muted-foreground">Target Amount</p>
                <p className="flex items-center gap-1 font-semibold">
                  <IndianRupee className="h-3 w-3" />
                  {client.targetAmount.toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent"
              onClick={() => setShowDetails(true)}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={loading}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </CardContent>
        )}
      </Card>

      <ClientDetailsDialog 
        client={client} 
        isOpen={showDetails} 
        onClose={() => setShowDetails(false)} 
        onUpdate={onUpdate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {client.name}? This action cannot be undone and will remove all associated
              payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
