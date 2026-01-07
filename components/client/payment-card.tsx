"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Clock, XCircle, Eye, IndianRupee, Calendar } from "lucide-react"
import { format } from "date-fns"
import type { Payment } from "@/types"

interface PaymentCardProps {
  payment: Payment
}

export function PaymentCard({ payment }: PaymentCardProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)

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
    scheduled: {
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
  } as const

  const config = statusConfig[payment.status]
  const Icon = config.icon

  return (
    <>
      <Card className={config.bg}>
        <CardContent className="p-2 md:p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-full p-2 ${config.bg}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="outline" className={config.badge}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Badge>
                  {payment.status === "approved" && payment.amount > 0 && (
                    <span className="flex items-center text-sm font-semibold text-green-600">
                      <IndianRupee className="h-3 w-3" />
                      {payment.amount.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {payment.uploadedAt instanceof Date
                    ? format(payment.uploadedAt, "MMM dd, yyyy • h:mm a")
                    : "Just now"}
                </p>
                {payment.status === "rejected" && payment.notes && (
                  <p className="mt-2 text-sm text-red-600">{payment.notes}</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setImageDialogOpen(true)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="w-[90%] max-w-2xl rounded-lg p-3 md:p-6">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:gap-6 md:grid-cols-2">
             <div className="relative aspect-[9/16] max-h-[30vh] overflow-hidden rounded-lg bg-muted md:max-h-[70vh]">
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

               <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Date & Time</h3>
                  <p className="text-base font-medium">
                    {payment.uploadedAt instanceof Date
                      ? format(payment.uploadedAt, "MMM dd, yyyy • h:mm a")
                      : "N/A"}
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
    </>
  )
}
