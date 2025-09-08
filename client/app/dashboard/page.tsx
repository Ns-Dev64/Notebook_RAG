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
import { MessageSquare, LogOut, Activity, Clock, FileText, Play, ArrowRight } from "lucide-react"

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getConversations()
      setConversations(Array.isArray(response.data) ? response.data: [])
    } catch (error) {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const getRecentFileUploads = () => {
    const fileUploads: Array<{ convoId: string; fileName: string; date: string }> = []

    conversations.forEach((convo) => {
      convo.messages.forEach((msg) => {
        if (msg.content.startsWith("Uploaded ")) {
          fileUploads.push({
            convoId: convo._id,
            fileName: msg.content.replace("Uploaded ", ""),
            date: convo.updatedAt,
          })
        }
      })
    })

    return fileUploads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3)
  }

  const recentUploads = getRecentFileUploads()

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
            <div className="lg:col-span-2 space-y-6">
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

              {loading ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-primary" />
                      Loading Your Conversations...
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Loading your recent conversations...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : conversations.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-primary" />
                      Pickup Where You Left
                    </CardTitle>
                    <CardDescription>Continue your recent conversations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {conversations.slice(0, 2).map((convo) => (
                        <Card
                          key={convo._id}
                          className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] border-2 hover:border-primary/20"
                          onClick={() => router.push("/chat")}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm mb-1 truncate">
                                  {convo.messages.length > 0
                                    ? convo.messages[0].content.slice(0, 35) +
                                      (convo.messages[0].content.length > 35 ? "..." : "")
                                    : `Chat ${convo._id.slice(0, 8)}`}
                                </h4>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(convo.updatedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground ml-2" />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{convo.messages.length} messages</span>
                              <Button size="sm" variant="outline">
                                Continue
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-primary" />
                      Get Started with NoteMind
                    </CardTitle>
                    <CardDescription>Here's what you can do with NoteMind</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors">
                        <FileText className="h-8 w-8 text-primary mb-3" />
                        <h4 className="font-medium mb-2">Upload Documents</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Upload PDFs, Word docs, or PowerPoint files to chat about their content
                        </p>
                        <Button size="sm" variant="outline" onClick={() => router.push("/chat")}>
                          Start Uploading
                        </Button>
                      </div>
                      <div className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors">
                        <Play className="h-8 w-8 text-primary mb-3" />
                        <h4 className="font-medium mb-2">Generate Podcasts</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Turn your conversations into engaging audio podcasts
                        </p>
                        <Button size="sm" variant="outline" onClick={() => router.push("/chat")}>
                          Create Podcast
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
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
                  {loading ? (
                    <div className="text-center py-6">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading activity...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-6">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{error}</p>
                      <Button size="sm" variant="ghost" onClick={loadConversations} className="mt-2">
                        Try Again
                      </Button>
                    </div>
                  ) : conversations.length > 0 ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Recent Conversations</h4>
                        {conversations.slice(0, 3).map((convo) => (
                          <div
                            key={convo._id}
                            className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => router.push("/chat")}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {convo.messages.length > 0
                                    ? convo.messages[0].content.slice(0, 30) +
                                      (convo.messages[0].content.length > 30 ? "..." : "")
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
                      </div>

                      {recentUploads.length > 0 && (
                        <div className="space-y-2 pt-4 border-t">
                          <h4 className="text-sm font-medium text-muted-foreground">Recent File Uploads</h4>
                          {recentUploads.map((upload, index) => (
                            <div
                              key={index}
                              className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                              onClick={() => router.push("/chat")}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{upload.fileName}</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(upload.date).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {conversations.length > 3 && (
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
                      <Button size="sm" variant="ghost" onClick={() => router.push("/chat")} className="mt-3">
                        Start Your First Chat
                      </Button>
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
