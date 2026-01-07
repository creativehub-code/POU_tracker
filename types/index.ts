export type PaymentStatus = "pending" | "approved" | "rejected" | "scheduled"

export interface Payment {
  id: string
  clientId: string
  clientName?: string
  subAdminId?: string
  requestedBy?: string // UID of SubAdmin who requested
  requestedAt?: any // Timestamp
  amount: number
  status: PaymentStatus
  screenshotUrl?: string // Legacy or optional if client uploads
  uploadedAt: any // Legacy timestamp
  description?: string
  reason?: string // Replaces description or alias
  month?: string // e.g., "December 2024"
  notes?: string // Admin rejection notes
  reviewedBy?: string // UID of Admin who reviewed
  scheduledFor?: { month: string, year: string } // For scheduled/prepaid payments
}

export interface Client {
  id: string
  name: string
  email: string
  role: "admin" | "subadmin" | "client"
  assignedSubAdminId?: string
  targetAmount: number
  fixedAmount: number
  terminated?: boolean
  initialPassword?: string // Stored for admin reference only
  payments: Payment[]
}
