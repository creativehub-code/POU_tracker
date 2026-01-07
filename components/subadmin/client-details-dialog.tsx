"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Payment, Client } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Calendar, ArrowLeft } from "lucide-react"
import { PaymentReviewCard } from "@/components/admin/payment-review-card"

interface ClientDetailsDialogProps {
    client: Client | null
    isOpen: boolean
    onClose: () => void
}

export function ClientDetailsDialog({ client, isOpen, onClose }: ClientDetailsDialogProps) {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "scheduled">("all")
    const [monthFilter, setMonthFilter] = useState<string>("all")

    useEffect(() => {
        if (isOpen && client) {
            fetchPaymentData()
        } else {
            // Reset state when closed
            setPayments([])
            setLoading(true)
            setStatusFilter("all")
            setMonthFilter("all")
        }
    }, [isOpen, client])

    const fetchPaymentData = async (showLoading = true) => {
        if (!client) return
        if (showLoading) setLoading(true)
        try {
            // Fetch Payments
            const paymentsQ = query(
                collection(db, "payments"), 
                where("clientId", "==", client.id)
            )
            const paymentsSnap = await getDocs(paymentsQ)
            const paymentsData = paymentsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                uploadedAt: doc.data().uploadedAt?.toDate?.() || new Date(),
                requestedAt: doc.data().requestedAt?.toDate?.() || new Date(),
            })) as Payment[]

            // Sort by date desc
            paymentsData.sort((a, b) => {
                    const timeA = (a as any).requestedAt instanceof Date ? (a as any).requestedAt.getTime() : 0
                    const timeB = (b as any).requestedAt instanceof Date ? (b as any).requestedAt.getTime() : 0
                    return timeB - timeA
            })

            setPayments(paymentsData)

        } catch (error) {
            console.error("Error loading data:", error)
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    // Derive unique months from payments
    const availableMonths = Array.from(new Set(payments.map(p => p.month).filter(Boolean)))

    const filteredPayments = payments.filter(payment => {
        const statusMatch = statusFilter === "all" || payment.status === statusFilter
        const monthMatch = monthFilter === "all" || payment.month === monthFilter
        return statusMatch && monthMatch
    })

    if (!client) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-full w-full h-[100dvh] p-0 sm:max-w-full sm:h-[100dvh] sm:rounded-none border-0 flex flex-col bg-background">
                <div className="flex-1 overflow-y-auto p-6 pb-20">
                    <div className="flex items-center gap-2 mb-6">
                        <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <DialogTitle className="text-2xl font-bold">{client.name}</DialogTitle>
                            <DialogDescription>
                                {client.email}
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            {/* Status Filter */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {(["all", "pending", "approved", "rejected", "scheduled"] as const).map((status) => (
                                    <Badge
                                        key={status}
                                        variant={statusFilter === status ? "default" : "outline"}
                                        className="cursor-pointer whitespace-nowrap capitalize px-4 py-1"
                                        onClick={() => setStatusFilter(status)}
                                    >
                                        {status}
                                    </Badge>
                                ))}
                            </div>

                            {/* Month Filter */}
                            <div className="w-[200px]">
                                <Select value={monthFilter} onValueChange={setMonthFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Months</SelectItem>
                                        {availableMonths.map((month: any) => (
                                            <SelectItem key={month} value={month}>{month}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Payment List */}
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredPayments.map(payment => (
                                    <PaymentReviewCard 
                                        key={payment.id} 
                                        payment={payment} 
                                        clientId={client.id}
                                        clientName={client.name}
                                        requestedByName={(payment as any).requestedByName} 
                                        reviewedByName={(payment as any).reviewedByName} 
                                        onUpdate={() => fetchPaymentData(false)}
                                        hideActions={true}
                                    />
                                ))}
                                {filteredPayments.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                                        <Calendar className="h-12 w-12 opacity-20 mb-2" />
                                        <p>No payments found matching criteria.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-background mt-auto hidden md:block">
                     <Button onClick={onClose} className="w-full">Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
