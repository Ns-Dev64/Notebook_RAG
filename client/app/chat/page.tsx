"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { ProtectedRoute } from "@/components/protected-route"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, MessageSquare, Trash2 } from "lucide-react"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

export default function ChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [convoId, setConvoId] = useState<string>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await api.sendChat(content, convoId)

      if (response.success && response.data) {
        // Update convoId if it's a new conversation
        if (response.data.convoId && !convoId) {
          setConvoId(response.data.convoId)
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.data.response || response.data.message || "I received your message.",
          role: "assistant",
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, aiMessage])
      } else {
        toast({
          title: "Failed to send message",
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

  const handleClearChat = () => {
    setMessages([])
    setConvoId(undefined)
    toast({
      title: "Chat cleared",
      description: "Started a new conversation.",
    })
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-semibold">AI Chat</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {convoId && (
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    ID: {convoId.slice(0, 8)}...
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleClearChat} disabled={messages.length === 0}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Chat
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Chat with AI Assistant</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-1">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="max-w-md">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Start a conversation</h3>
                      <p className="text-sm text-muted-foreground">
                        Ask questions about your uploaded documents, get help with analysis, or chat about anything
                        else.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} userName={user?.userName} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="border-t pt-4">
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
