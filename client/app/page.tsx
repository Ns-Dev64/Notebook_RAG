"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, MessageSquare, Mic, Upload, Brain, Sparkles, ArrowRight } from "lucide-react"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    setIsVisible(true)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-2xl font-serif font-bold text-foreground">NoteMind</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button onClick={() => router.push("/login")} variant="ghost">
                Sign In
              </Button>
              <Button onClick={() => router.push("/signup")} className="animate-pulse-glow">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"></div>
        <div className="container mx-auto px-4 text-center relative">
          <div className={`transition-all duration-1000 ${isVisible ? "animate-fade-in-up opacity-100" : "opacity-0"}`}>
            <Badge variant="secondary" className="mb-6 animate-float">
              <Sparkles className="h-4 w-4 mr-2" />
              AI-Powered Intelligence
            </Badge>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground mb-6 text-balance leading-tight">
              Revolutionize Your
              <span className="text-primary"> Note-Taking</span>
              <br />
              with AI
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto text-pretty leading-relaxed">
              Your intelligent notebook assistant that transforms documents into conversations, generates podcasts, and
              amplifies your productivity with cutting-edge AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                onClick={() => router.push("/signup")}
                size="lg"
                className="text-lg px-8 py-6 animate-pulse-glow group"
              >
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of note-taking with our comprehensive AI-powered toolkit
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: Upload,
                title: "Smart Upload",
                description:
                  "Upload PDFs, DOCX, PPTX, and multimedia files. Our AI instantly analyzes and organizes your content.",
                color: "text-primary",
              },
              {
                icon: MessageSquare,
                title: "AI Conversations",
                description:
                  "Chat naturally with your documents. Ask questions, get summaries, and discover insights you never knew existed.",
                color: "text-accent",
              },
              {
                icon: Mic,
                title: "Podcast Magic",
                description:
                  "Transform any topic or document into engaging podcasts. Perfect for learning on-the-go or content creation.",
                color: "text-primary",
              },
              {
                icon: FileText,
                title: "Smart Organization",
                description:
                  "AI-powered categorization and search. Find exactly what you need, when you need it, effortlessly.",
                color: "text-accent",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <CardHeader className="text-center">
                  <feature.icon
                    className={`h-12 w-12 ${feature.color} mb-4 mx-auto group-hover:scale-110 transition-transform duration-300`}
                  />
                  <CardTitle className="text-xl font-serif">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-card border-t border-border/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-2xl font-serif font-bold">NoteMind</span>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
              Your intelligent notebook assistant that transforms documents into conversations, generates podcasts, and
              amplifies your productivity with cutting-edge AI. A hobby project exploring the future of note-taking.
            </p>
            <div className="border-t border-border/50 pt-8 text-muted-foreground">
              <p>&copy; 2025 NoteMind. A passion project built with AI-powered innovation.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
