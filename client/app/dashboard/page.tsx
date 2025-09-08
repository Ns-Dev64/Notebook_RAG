"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { ProtectedRoute } from "@/components/protected-route"
import { ProfileDialog } from "@/components/profile-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, LogOut, Activity, Clock } from "lucide-react"

interface Conversation {
  _id: string
  createdAt: string
  messages: Array<{ role: string; content: string }>
  updatedAt: string
  userId: string
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const response = await api.getConversations()
      setConversations(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error("Failed to load conversations:", error)
      setConversations([])
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">NoteMind Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.userName}</p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <ProfileDialog />
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - AI Chat */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    AI Chat
                  </CardTitle>
                  <CardDescription>
                    Chat with AI, upload files, and generate podcasts - all in one place
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Start Your AI Conversation</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Upload documents, ask questions, or generate podcasts with our AI assistant
                    </p>
                    <Button onClick={() => router.push("/chat")} size="lg">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open AI Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Activity */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {conversations.length > 0 ? (
                    <div className="space-y-3">
                      {conversations.slice(0, 5).map((convo) => (
                        <div
                          key={convo._id}
                          className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => router.push(`/chat?convo=${convo._id}`)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {convo.messages.length > 0
                                  ? convo.messages[0].content.slice(0, 40) +
                                    (convo.messages[0].content.length > 40 ? "..." : "")
                                  : `Chat ${convo._id.slice(0, 8)}`}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">
                                  {new Date(convo.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground ml-2">{convo.messages.length} msgs</div>
                          </div>
                        </div>
                      ))}

                      {conversations.length > 5 && (
                        <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => router.push("/chat")}>
                          View All Conversations
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Start a conversation to see your activity here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
