"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Payment, Client } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import { PaymentReviewCard } from "@/components/admin/payment-review-card"

export default function ClientPaymentHistoryPage() {
    const { user, userData, loading: authLoading } = useAuth()
    const router = useRouter()
    const params = useParams()
    const clientId = params.clientId as string

    const [client, setClient] = useState<Client | null>(null)
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
    const [monthFilter, setMonthFilter] = useState<string>("all")

    useEffect(() => {
        if (!authLoading && (!userData || userData.role !== "subadmin")) {
            router.push("/login")
        }
    }, [userData, authLoading, router])

    const fetchPaymentData = async () => {
        if (!user || !clientId) return
        setLoading(true)
        try {
            // Fetch Client Details (only if not loaded, or just refresh it)
            if (!client) {
                const clientRef = doc(db, "users", clientId)
                const clientSnap = await getDoc(clientRef)
                
                if (clientSnap.exists()) {
                    setClient({ id: clientSnap.id, ...clientSnap.data() } as Client)
                }
            }

            // Fetch Payments
            const paymentsQ = query(
                collection(db, "payments"), 
                where("clientId", "==", clientId)
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
            setLoading(false)
        }
    }

    useEffect(() => {
        if (userData?.role === "subadmin") {
            fetchPaymentData()
        }
    }, [user, userData, clientId])

    // Derive unique months from payments
    const availableMonths = Array.from(new Set(payments.map(p => p.month).filter(Boolean)))

    const filteredPayments = payments.filter(payment => {
        const statusMatch = statusFilter === "all" || payment.status === statusFilter
        const monthMatch = monthFilter === "all" || payment.month === monthFilter
        return statusMatch && monthMatch
    })

    if (loading || authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!client && !loading) {
         return (
            <div className="container mx-auto px-4 py-8">
                <p>Client not found.</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
         )
    }

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen pb-24">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">{client?.name || 'Loading...'}</h1>
                <p className="text-muted-foreground text-sm">{client?.email}</p>
            </div>

            <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {/* Status Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {(["all", "pending", "approved", "rejected"] as const).map((status) => (
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
                                {availableMonths.map(month => (
                                    <SelectItem key={month} value={month!}>{month}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Payment List */}
                <div className="space-y-4">
                    {filteredPayments.map(payment => (
                        <PaymentReviewCard 
                            key={payment.id} 
                            payment={payment} 
                            clientId={clientId}
                            clientName={client?.name}
                            requestedByName={(payment as any).requestedByName} 
                            reviewedByName={(payment as any).reviewedByName} 
                            onUpdate={fetchPaymentData}
                            hideActions={true}
                        />
                    ))}
                    {filteredPayments.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                            <p>No payments found matching criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
