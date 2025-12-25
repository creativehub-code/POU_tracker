"use client"

import { useState } from "react"
import { type Client, type Payment } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { IndianRupee, ArrowLeft, User, Mail, Target, Key, Eye, EyeOff, X } from "lucide-react"
import { PaymentReviewCard } from "@/components/admin/payment-review-card"

import { Badge } from "@/components/ui/badge"

interface ClientDetailsDialogProps {
  client: Client
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

type FilterType = "all" | "pending" | "approved" | "rejected"

export function ClientDetailsDialog({ client, isOpen, onClose, onUpdate }: ClientDetailsDialogProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>("all")

  if (!isOpen) return null

  // Calculate stats directly from client object, similar to details page logic
  const approvedPayments = client.payments ? client.payments.filter((p) => p.status === "approved") : []
  const totalPaid = approvedPayments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = client.fixedAmount > 0 ? client.fixedAmount - totalPaid : client.targetAmount - totalPaid
  const progress =
    client.fixedAmount > 0
      ? Math.min((totalPaid / client.fixedAmount) * 100, 100)
      : client.targetAmount > 0
        ? Math.min((totalPaid / client.targetAmount) * 100, 100)
        : 0

  // Sort payments by date desc (though they should already be sorted from admin page, safe to ensure)
  const sortedPayments = [...(client.payments || [])].sort((a, b) => {
    const timeA = a.uploadedAt instanceof Date ? a.uploadedAt.getTime() : 0 
    const timeB = b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : 0 // Handle potential missing uploadedAt
    return timeB - timeA
  })
  
  const filteredPayments = sortedPayments.filter(p => filterType === "all" || p.status === filterType)

  const pendingPayments = sortedPayments.filter(p => p.status === "pending").length
  const approvedCount = sortedPayments.filter(p => p.status === "approved").length
  const rejectedCount = sortedPayments.filter(p => p.status === "rejected").length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom-10 duration-200">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
             <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-accent">
                <ArrowLeft className="h-5 w-5" />
             </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <IndianRupee className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none md:text-xl">Client Details</h1>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto container mx-auto px-4 py-6 md:py-8">
        {/* Client Info */}
        <Card className="mb-6 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle className="text-xl">{client.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{client.email}</p>
                </div>
              </div>
              {client.initialPassword && (
                <div className="flex items-start gap-3">
                  <Key className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Initial Password</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono">
                        {showPassword ? client.initialPassword : '••••••••'}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Target Amount</p>
                  <p className="text-sm font-medium">₹{client.targetAmount.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <IndianRupee className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fixed Amount</p>
                  <p className="text-sm font-medium">₹{client.fixedAmount.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-sm font-semibold text-green-600">₹{totalPaid.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-semibold">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>₹{totalPaid.toLocaleString("en-IN")} paid</span>
                <span>₹{remaining.toLocaleString("en-IN")} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Section */}
        <div>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold md:text-2xl">Payment History</h2>
            <div className="flex flex-wrap gap-2">
                <Badge
                  variant={filterType === "all" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90"
                  onClick={() => setFilterType("all")}
                >
                  All ({sortedPayments.length})
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
                  Approved ({approvedCount})
                </Badge>
                <Badge
                  variant={filterType === "rejected" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90"
                  onClick={() => setFilterType("rejected")}
                >
                  Rejected ({rejectedCount})
                </Badge>
              </div>
          </div>
          
          {filteredPayments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <IndianRupee className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-lg font-medium">No payments yet</p>
                <p className="text-sm text-muted-foreground">
                    {filterType === "all" ? "Waiting for client to upload payment screenshots" : `No ${filterType} payments found`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <PaymentReviewCard 
                  key={payment.id} 
                  payment={payment} 
                  clientId={client.id} 
                  onUpdate={onUpdate} 
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
