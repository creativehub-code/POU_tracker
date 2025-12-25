export type PaymentStatus = "pending" | "approved" | "rejected"

export interface Payment {
  id: string
  clientId: string
  amount: number
  status: PaymentStatus
  screenshotUrl?: string
  uploadedAt: any // items from Firestore often have Timestamp
  description?: string
  month?: string // e.g., "December 2024"
  notes?: string // Admin rejection notes
}

export interface Client {
  id: string
  name: string
  email: string
  role: "admin" | "client"
  targetAmount: number
  fixedAmount: number
  isDemo?: boolean
  initialPassword?: string // Stored for admin reference only
  payments: Payment[]
}
