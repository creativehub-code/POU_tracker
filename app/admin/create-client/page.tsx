"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

type SubAdmin = {
  id: string
  name: string
  email: string
}

export default function CreateClientPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [assignedSubAdminId, setAssignedSubAdminId] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([])
  const [loadingSubAdmins, setLoadingSubAdmins] = useState(true)
  const [loading, setLoading] = useState(false)
  
  const { user, userData, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading) {
      if (!user || userData?.role !== "admin") {
        router.replace("/login")
      }
    }
  }, [user, userData, authLoading, router])

  useEffect(() => {
    async function fetchSubAdmins() {
      try {
        const q = query(collection(db, "users"), where("role", "==", "subadmin"))
        const snapshot = await getDocs(q)
        const admins = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SubAdmin[]
        setSubAdmins(admins)
      } catch (error) {
        console.error("Error fetching subadmins:", error)
        toast({
          title: "Error",
          description: "Failed to load SubAdmins. verify your permissions.",
          variant: "destructive"
        })
      } finally {
        setLoadingSubAdmins(false)
      }
    }

    if (user && userData?.role === "admin") {
        fetchSubAdmins()
    }
  }, [user, userData, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignedSubAdminId) {
        toast({
            title: "Error",
            description: "Please assign a SubAdmin.",
            variant: "destructive"
        })
        return
    }
    
    setLoading(true)

    try {
      const token = await user?.getIdToken()
      
      const response = await fetch("/api/admin/create-client", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          password,
          assignedSubAdminId,
          targetAmount: Number(targetAmount)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Client")
      }

      toast({
        title: "Success",
        description: `Client ${name} created and assigned successfully.`,
      })

      router.push("/admin")
    } catch (error: any) {
      console.error("Error creating client:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create Client.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Client</CardTitle>
          <CardDescription>
            Create a new Client and assign them to a SubAdmin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name</Label>
              <Input
                id="name"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subadmin">Assign SubAdmin</Label>
              <Select onValueChange={setAssignedSubAdminId} value={assignedSubAdminId} required>
                <SelectTrigger>
                  <SelectValue placeholder={loadingSubAdmins ? "Loading..." : "Select SubAdmin"} />
                </SelectTrigger>
                <SelectContent>
                  {subAdmins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name} ({admin.email})
                    </SelectItem>
                  ))}
                  {subAdmins.length === 0 && !loadingSubAdmins && (
                    <SelectItem value="none" disabled>No SubAdmins found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
               <Label htmlFor="targetAmount">Target Amount (Optional)</Label>
               <Input
                 id="targetAmount"
                 type="number"
                 placeholder="50000"
                 value={targetAmount}
                 onChange={(e) => setTargetAmount(e.target.value)}
               />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Client"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
