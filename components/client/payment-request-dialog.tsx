"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FileText } from "lucide-react"

interface PaymentRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitRequest: (data: PaymentRequestData) => Promise<void>
}

export interface PaymentRequestData {
  amount: number
  description: string
  month: string
}

export function PaymentRequestDialog({
  open,
  onOpenChange,
  onSubmitRequest,
}: PaymentRequestDialogProps) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [month, setMonth] = useState(getCurrentMonth())
  const [loading, setLoading] = useState(false)

  function getCurrentMonth() {
    const now = new Date()
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  function getMonthOptions() {
    const options = []
    const now = new Date()
    
    // Current month
    options.push(getCurrentMonth())
    
    // Previous 6 months
    for (let i = 1; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      options.push(date.toLocaleDateString("en-US", { month: "long", year: "numeric" }))
    }
    
    // Next 3 months
    for (let i = 1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      options.push(date.toLocaleDateString("en-US", { month: "long", year: "numeric" }))
    }
    
    return options
  }

  const getData = (): PaymentRequestData => ({
    amount: parseFloat(amount) || 0,
    description,
    month,
  })

  const handleSubmitRequest = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return
    }

    setLoading(true)
    try {
      await onSubmitRequest(getData())
      resetForm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }



  const resetForm = () => {
    setAmount("")
    setDescription("")
    setMonth(getCurrentMonth())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Request</DialogTitle>
          <DialogDescription>
            Enter payment details to submit a request or send money directly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Month */}
          <div className="space-y-2">
            <Label htmlFor="month">Month *</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter payment description or notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={handleSubmitRequest}
              disabled={!amount || parseFloat(amount) <= 0 || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Submit Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
