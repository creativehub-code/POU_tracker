"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaymentReviewCard } from "@/components/admin/payment-review-card"
import { Client, Payment } from "@/types"
import { Search, Info, CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface PaymentHistoryDialogProps {
  isOpen: boolean
  onClose: () => void
  payments: Payment[]
  clients: Client[]
  onUpdate: () => void
}

export function PaymentHistoryDialog({
  isOpen,
  onClose,
  payments,
  clients,
  onUpdate
}: PaymentHistoryDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  const filteredPayments = payments
    .filter(payment => {
      // Status Filter
      if (statusFilter !== "all" && payment.status !== statusFilter) return false
      
      // Search Filter
      // Use saved clientName or lookup from clients list
      const clientName = (payment as any).clientName || clients.find(c => c.id === payment.clientId)?.name || ""
      if (searchTerm && !clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false

      // Date Filter
      if (startDate || endDate) {
          // Use requestedAt for SubAdmin since they made the request
          // Fallback to uploadedAt if requestedAt is missing
          const dateField = (payment as any).requestedAt || payment.uploadedAt
          const paymentDate = dateField instanceof Date ? dateField : new Date(dateField)
          
          // Normalize dates to midnight for comparison
          const checkDate = new Date(paymentDate)
          checkDate.setHours(0,0,0,0)

          if (startDate) {
              const start = new Date(startDate)
              start.setHours(0,0,0,0)
              if (checkDate < start) return false
          }
          if (endDate) {
              const end = new Date(endDate)
              end.setHours(0,0,0,0)
              if (checkDate > end) return false
          }
      }

      return true
    })
    .sort((a, b) => {
        // Sort by date desc
        const getDate = (p: any) => p.requestedAt instanceof Date ? p.requestedAt.getTime() : (p.uploadedAt instanceof Date ? p.uploadedAt.getTime() : 0)
        return getDate(b) - getDate(a)
    })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-full w-full h-full flex flex-col p-0 gap-0 border-0 rounded-none sm:rounded-none bg-background">
        <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
                <div>
                     <DialogTitle className="text-xl">Transaction History</DialogTitle>
                     <p className="text-sm text-muted-foreground">View and manage all payment requests.</p>
                </div>
                 <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
                    <span className="sr-only">Close</span>
                    {/* Reuse close icon from dialog or just let default X handle it? 
                        DialogContent usually has a Close button. We can hide this or add a custom one.
                        The default Close is top right.
                    */}
                 </Button>
            </div>
        </DialogHeader>

        <div className="p-4 border-b bg-muted/30 space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
                        <TabsList className="w-full sm:w-auto">
                            <TabsTrigger value="all" className="flex-1 sm:flex-none">All</TabsTrigger>
                            <TabsTrigger value="pending" className="flex-1 sm:flex-none">Pending</TabsTrigger>
                            <TabsTrigger value="approved" className="flex-1 sm:flex-none">Approved</TabsTrigger>
                            <TabsTrigger value="rejected" className="flex-1 sm:flex-none">Rejected</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by client name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Date Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                        <div className="space-y-1 w-full">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Start Date</span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full sm:w-[150px] justify-start text-left font-normal h-9 px-3 text-xs",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-1 w-full">
                             <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">End Date</span>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full sm:w-[150px] justify-start text-left font-normal h-9 px-3 text-xs",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={setEndDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    {(startDate || endDate) && (
                        <button 
                            onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
                            className="text-xs text-muted-foreground hover:text-foreground underline sm:mt-5 self-end sm:self-auto mb-1 sm:mb-0"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
            
             <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded text-blue-700 dark:text-blue-300">
                <Info className="h-3 w-3" />
                <span>Showing {filteredPayments.length} transactions</span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
            <div className="grid gap-3 max-w-2xl mx-auto">
                {filteredPayments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No transactions found matching your filters.</p>
                        <Button 
                            variant="link" 
                            onClick={() => {setStartDate(undefined); setEndDate(undefined); setSearchTerm(""); setStatusFilter("all")}} 
                            className="mt-2"
                        >
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    filteredPayments.map(payment => (
                        <PaymentReviewCard
                            key={payment.id}
                            payment={payment}
                            clientId={payment.clientId}
                            clientName={(payment as any).clientName || clients.find(c => c.id === payment.clientId)?.name}
                            requestedByName={(payment as any).requestedByName}
                            reviewedByName={(payment as any).reviewedByName}
                            onUpdate={onUpdate}
                            hideActions={true}
                        />
                    ))
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
