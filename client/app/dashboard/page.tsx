"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { FileUpload } from "@/components/file-upload"
import { FileList } from "@/components/file-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Mic, LogOut, User } from "lucide-react"

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [files, setFiles] = useState<any[]>([])

  const handleFileUploaded = (newFile: any) => {
    setFiles((prev) => [
      {
        id: newFile.id || Date.now().toString(),
        name: newFile.name || "Unknown file",
        type: newFile.type || "application/octet-stream",
        size: newFile.size,
        convoId: newFile.convoId,
        uploadedAt: new Date().toISOString(),
        ...newFile,
      },
      ...prev,
    ])
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
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
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
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <FileUpload onFileUploaded={handleFileUploaded} />
              <FileList files={files} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Access AI features and tools</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => router.push("/chat")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start AI Chat
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => router.push("/podcast")}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Generate Podcast
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {files.length > 0 ? (
                    <div className="space-y-2">
                      {files.slice(0, 3).map((file) => (
                        <div key={file.id} className="text-sm">
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
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
