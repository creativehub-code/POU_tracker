"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { IndianRupee, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/")
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await signIn(email, password)
      // No need to manually redirect or set loading false on success
      // The auth listener in useEffect will handle the redirect
    } catch (err: any) {
      console.error(err)
      // Check for common Firebase auth errors
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.message?.includes("invalid-credential")
      ) {
        setError("Invalid username and password")
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred")
      }
      setLoading(false)
    }
  }

  // Show full screen loader while checking auth status to prevent login form flash
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-background via-secondary/30 to-background p-4 pt-24 md:justify-center md:pt-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <Image 
              src="/logo.jpg" 
              alt="PayTrack Logo" 
              fill 
              className="object-cover"
              priority
            />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">POU EMI</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              powered by AL MANSAH EMI TEAM
            </p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-center text-sm font-medium text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/50 p-3 text-xs text-accent-foreground">
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              <p>Admin-controlled access only. No public signup available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
