"use client"

import { useState } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Payment } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Clock, Eye, Loader2, IndianRupee, Wand2 } from "lucide-react"
import { format } from "date-fns"

interface PaymentReviewCardProps {
  payment: Payment
  clientId: string
  clientName?: string
  onUpdate: () => void
}

export function PaymentReviewCard({ payment, clientId, clientName, onUpdate }: PaymentReviewCardProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [quickRejectOpen, setQuickRejectOpen] = useState(false)
  const [amount, setAmount] = useState(payment.amount.toString())
  const [rejectionReason, setRejectionReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [approveEnabled, setApproveEnabled] = useState(false)
  const [rejectEnabled, setRejectEnabled] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const { toast } = useToast()

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    },
    approved: {
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/20",
      badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    rejected: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/20",
      badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
  }

  const config = statusConfig[payment.status]
  const Icon = config.icon

  const handleOCR = async () => {
    setOcrLoading(true)
    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageURL: payment.screenshotUrl }),
      })

      const data = await response.json()
      if (data.amount) {
        setAmount(data.amount.toString())
        toast({
          title: "OCR Complete",
          description: `Detected amount: ₹${data.amount.toLocaleString("en-IN")}`,
        })
      } else {
        toast({
          title: "OCR Failed",
          description: "Could not detect amount. Please enter manually.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("OCR error:", error)
      toast({
        title: "Error",
        description: "Failed to process image. Please enter amount manually.",
        variant: "destructive",
      })
    } finally {
      setOcrLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await updateDoc(doc(db, "payments", payment.id), {
        status: "approved",
        amount: Number.parseFloat(amount),
        reviewedAt: new Date(),
      })

      toast({
        title: "Payment Approved",
        description: `Payment of ₹${Number.parseFloat(amount).toLocaleString("en-IN")} has been approved.`,
      })

      setReviewDialogOpen(false)
      onUpdate()
    } catch (error) {
      console.error("Error approving payment:", error)
      toast({
        title: "Error",
        description: "Failed to approve payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await updateDoc(doc(db, "payments", payment.id), {
        status: "rejected",
        notes: rejectionReason,
        reviewedAt: new Date(),
      })

      toast({
        title: "Payment Rejected",
        description: "Payment has been rejected.",
      })

      setReviewDialogOpen(false)
      setQuickRejectOpen(false)
      onUpdate()
    } catch (error) {
      console.error("Error rejecting payment:", error)
      toast({
        title: "Error",
        description: "Failed to reject payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className={`${config.bg} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
        <CardContent className="p-2">
          <div className="flex items-start gap-2">
            <div className={`mt-0.5 rounded-full p-1 ${config.bg} shrink-0`}>
              <Icon className={`h-3 w-3 ${config.color}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Top Row: Name/Status and Amount */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    {clientName && (
                      <span className="text-sm font-semibold truncate capitalize text-foreground">
                          {clientName}
                      </span>
                    )}
                    <Badge variant="outline" className={`${config.badge} px-1 py-0 text-[10px] uppercase tracking-wider h-4`}>
                      {payment.status}
                    </Badge>
                </div>
                <div className="flex items-center gap-1 text-lg font-bold text-foreground shrink-0 leading-none">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    {payment.amount > 0 ? payment.amount.toLocaleString("en-IN") : "0"}
                </div>
              </div>

              {/* Bottom Row: Date/Notes and Actions */}
              <div className="flex items-end justify-between gap-2 mt-1">
                <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                  <span className="truncate">
                      {payment.uploadedAt instanceof Date
                        ? format(payment.uploadedAt, "MMM dd • h:mm a")
                        : "Just now"}
                  </span>
                  {payment.status === "rejected" && payment.notes && (
                    <span className="text-red-600 line-clamp-1">Note: {payment.notes}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {payment.status === "pending" && (
                    <>
                      {payment.screenshotUrl && (
                        <Button size="sm" className="h-7 text-xs px-2" onClick={() => setReviewDialogOpen(true)}>
                          Review
                        </Button>
                      )}
                      
                      {/* Safe Reject Button */}
                      <div 
                        onMouseEnter={() => setRejectEnabled(true)}
                        onMouseLeave={() => setRejectEnabled(false)}
                        className="inline-block"
                      >
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="h-7 text-xs px-2" 
                          onClick={() => setQuickRejectOpen(true)}
                          disabled={!rejectEnabled || loading}
                        >
                          <XCircle className="mr-1.5 h-3 w-3" />
                          Reject
                        </Button>
                      </div>

                      {/* Safe Approve Button */}
                      <div 
                        onMouseEnter={() => setApproveEnabled(true)}
                        onMouseLeave={() => setApproveEnabled(false)}
                        className="inline-block"
                      >
                        <Button 
                          size="sm" 
                          className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700 text-white" 
                          onClick={handleApprove}
                          disabled={!approveEnabled || loading}
                        >
                          <CheckCircle className="mr-1.5 h-3 w-3" />
                          Approve
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image/Details Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2">
             <div className="relative aspect-[9/16] max-h-[70vh] overflow-hidden rounded-lg bg-muted">
              <img
                src={payment.screenshotUrl || "/placeholder.svg"}
                alt="Payment screenshot"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-4">
               <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
                  <p className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-5 w-5 mr-1" />
                    {payment.amount.toLocaleString("en-IN")}
                  </p>
               </div>
               
               {payment.month && (
                 <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Month</h3>
                    <p className="text-base font-medium">{payment.month}</p>
                 </div>
               )}

               {payment.description && (
                 <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                    <p className="text-base">{payment.description}</p>
                 </div>
               )}

               <div>
                 <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                 <Badge variant="outline" className={`${config.badge} mt-1`}>
                    {payment.status.toUpperCase()}
                 </Badge>
               </div>

               {payment.status === "rejected" && payment.notes && (
                 <div className="rounded-md bg-red-50 p-3 dark:bg-red-950/20">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Rejection Reason</h3>
                    <p className="text-sm text-red-600 dark:text-red-300">{payment.notes}</p>
                 </div>
               )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Reject Dialog */}
      <Dialog open={quickRejectOpen} onOpenChange={setQuickRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="quick-rejection">Rejection Reason</Label>
                <Textarea
                  id="quick-rejection"
                  placeholder="Enter reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                 <Button variant="ghost" onClick={() => setQuickRejectOpen(false)} disabled={loading}>Cancel</Button>
                 <Button variant="destructive" onClick={handleReject} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Confirm Rejection
                 </Button>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review Payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-muted">
              <img
                src={payment.screenshotUrl || "/placeholder.svg"}
                alt="Payment screenshot"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 {payment.month && (
                   <div className="space-y-1">
                      <Label className="text-muted-foreground">Month</Label>
                      <p className="font-medium">{payment.month}</p>
                   </div>
                 )}
                 {payment.description && (
                   <div className="col-span-2 space-y-1">
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="font-medium bg-muted p-2 rounded-md text-sm">{payment.description}</p>
                   </div>
                 )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading || ocrLoading}
                    min="0"
                    step="0.01"
                  />
                  <Button variant="outline" onClick={handleOCR} disabled={loading || ocrLoading}>
                    {ocrLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        OCR
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click OCR to automatically detect the amount, or enter manually
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection">Rejection Reason (optional)</Label>
                <Textarea
                  id="rejection"
                  placeholder="Enter reason if rejecting payment"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={handleReject} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Reject
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
