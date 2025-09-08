"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Brain, Sparkles, ArrowRight, CheckCircle } from "lucide-react"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await api.signup(formData)

      if (response.success && response.user) {
        toast({
          title: "Account created successfully!",
          description: response.message || "Welcome to NoteMind.",
        })
        // Redirect to login since signup doesn't return token
        router.push("/login")
      } else {
        toast({
          title: "Signup failed",
          description: response.error || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/3 left-1/4 w-56 h-56 bg-primary/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4 shadow-lg animate-pulse-glow">
            <Brain className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Join <span className="text-accent">NoteMind</span>
          </h1>
          <p className="text-muted-foreground">Start your AI-powered note-taking journey today</p>
        </div>

        <Card className="backdrop-blur-sm bg-card/80 border-border/50 shadow-2xl animate-scale-in">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-serif font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Create Account
            </CardTitle>
            <CardDescription className="text-base">Get started with intelligent note-taking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2 animate-slide-in-left" style={{ animationDelay: "0.1s" }}>
                <Label htmlFor="userName" className="text-sm font-medium text-foreground">
                  Username
                </Label>
                <div className="focus-enhanced rounded-lg">
                  <Input
                    id="userName"
                    name="userName"
                    type="text"
                    placeholder="Choose a unique username"
                    value={formData.userName}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="input-glow h-12 text-base border-border/60 bg-input/50 placeholder:text-muted-foreground/60 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-2 animate-slide-in-left" style={{ animationDelay: "0.2s" }}>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <div className="focus-enhanced rounded-lg">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="input-glow h-12 text-base border-border/60 bg-input/50 placeholder:text-muted-foreground/60 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-2 animate-slide-in-left" style={{ animationDelay: "0.3s" }}>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="focus-enhanced rounded-lg">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="input-glow h-12 text-base border-border/60 bg-input/50 placeholder:text-muted-foreground/60 transition-all duration-200"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-200 animate-slide-in-left group"
                style={{ animationDelay: "0.4s" }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </Button>
            </form>

            <div className="space-y-3 animate-slide-in-left" style={{ animationDelay: "0.5s" }}>
              <div className="text-xs text-muted-foreground text-center mb-3">What you'll get:</div>
              <div className="grid grid-cols-1 gap-2">
                {["AI-powered note organization", "Smart file uploads & analysis", "Podcast generation from notes"].map(
                  (feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="text-center animate-slide-in-left" style={{ animationDelay: "0.6s" }}>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Already have an account?</span>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors duration-200 group"
                >
                  Sign in instead
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
          <p className="text-xs text-muted-foreground">
            By creating an account, you agree to our terms of service and privacy policy
          </p>
        </div>
      </div>
    </div>
  )
}
