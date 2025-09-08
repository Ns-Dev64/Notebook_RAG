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
import { Loader2, Brain, Sparkles, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    identifier: "",
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
      const response = await api.login(formData)

      if (response.success && response.user && response.token) {
        login(response.token, response.user)
        toast({
          title: "Welcome back!",
          description: response.message || "You have been signed in successfully.",
        })
        router.push("/chat")
      } else {
        toast({
          title: "Login failed",
          description: response.error || "Invalid credentials. Please try again.",
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg animate-pulse-glow">
            <Brain className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Welcome Back to <span className="text-primary">NoteMind</span>
          </h1>
          <p className="text-muted-foreground">Continue your AI-powered note-taking journey</p>
        </div>

        <Card className="backdrop-blur-sm bg-card/80 border-border/50 shadow-2xl animate-scale-in">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-serif font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Sign In
            </CardTitle>
            <CardDescription className="text-base">Access your intelligent workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2 animate-slide-in-left" style={{ animationDelay: "0.1s" }}>
                <Label htmlFor="identifier" className="text-sm font-medium text-foreground">
                  Email or Username
                </Label>
                <div className="focus-enhanced rounded-lg">
                  <Input
                    id="identifier"
                    name="identifier"
                    type="text"
                    placeholder="Enter your email or username"
                    value={formData.identifier}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="input-glow h-12 text-base border-border/60 bg-input/50 placeholder:text-muted-foreground/60 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-2 animate-slide-in-left" style={{ animationDelay: "0.2s" }}>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="focus-enhanced rounded-lg">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
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
                className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 animate-slide-in-left group"
                style={{ animationDelay: "0.3s" }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center animate-slide-in-left" style={{ animationDelay: "0.4s" }}>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">New to NoteMind?</span>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors duration-200 group"
                >
                  Create your account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <p className="text-xs text-muted-foreground">Trusted by students, researchers, and professionals worldwide</p>
        </div>
      </div>
    </div>
  )
}
