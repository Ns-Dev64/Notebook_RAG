"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { ProfileDialog } from "@/components/profile-dialog"
import {
  MessageSquare,
  Upload,
  Mic,
  Send,
  Plus,
  FileText,
  Video,
  Music,
  Loader2,
  Play,
  Pause,
  Download,
  LayoutDashboard,
  Trash2,
  SkipForward,
  SkipBack,
  Volume2,
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Slider } from "@/components/ui/slider"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface Conversation {
  _id: string
  createdAt: string
  messages: Message[]
  updatedAt: string
  userId: string
}

interface UIMessage extends Message {
  id: string
  timestamp: Date
  type?: "text" | "file" | "podcast"
  fileInfo?: {
    name: string
    type: string
  }
  audioUrl?: string
}

interface Podcast {
  _id: string
  convoId: string
  podcastBuffer: string
  createdAt: string
  updatedAt: string
  userId?: string
}

export default function ChatPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConvoId, setCurrentConvoId] = useState<string>()
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadLoading, setIsUploadLoading] = useState(false)
  const [isPodcastLoading, setIsPodcastLoading] = useState(false)
  const [isConversationLoading, setIsConversationLoading] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [podcastTopic, setPodcastTopic] = useState("")
  const [showPodcastInput, setShowPodcastInput] = useState(false)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({})
  const [audioDuration, setAudioDuration] = useState<{ [key: string]: number }>({})
  const [audioVolume, setAudioVolume] = useState<{ [key: string]: number }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await api.getUserStatus()
        if (!response.success || response.message !== "User logged in") {
          logout()
          router.push("/login")
        }
      } catch (error) {
        logout()
        router.push("/login")
      }
    }

    if (user) {
      checkAuthStatus()
    }
  }, [user, logout, router])

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const response = await api.getConversations()
      setConversations(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error("Failed to load conversations:", error)
      setConversations([])
      toast({
        title: "Error loading conversations",
        description: "Please refresh the page or try again later.",
        variant: "destructive",
      })
    }
  }

  const loadConversationPodcasts = async (convoId: string) => {
    try {
      const response = await api.getConversationPodcasts(convoId)
      if (response.success && response.data) {
        setPodcasts(Array.isArray(response.data) ? response.data : [])
      } else {
        setPodcasts([])
      }
    } catch (error) {
      console.error("Failed to load podcasts:", error)
      setPodcasts([])
    }
  }

  const startNewConversation = () => {
    setCurrentConvoId(undefined)
    setMessages([])
    setPodcasts([])
    setShowPodcastInput(false)
  }

  const selectConversation = async (convoId: string) => {
    setIsConversationLoading(true)
    setCurrentConvoId(convoId)

    try {
      const conversation = conversations.find((c) => c._id === convoId)

      if (conversation && conversation.messages && conversation.messages.length > 0) {
        const uiMessages: UIMessage[] = conversation.messages.map((msg, index) => {
          const isFileUpload = msg.content.startsWith("Uploaded ")
          const uiMessage = {
            ...msg,
            id: `${convoId}-${index}`,
            timestamp: new Date(conversation.updatedAt),
            type: isFileUpload ? "file" : "text",
            fileInfo: isFileUpload
              ? {
                  name: msg.content.replace("Uploaded ", ""),
                  type: "application/octet-stream",
                }
              : undefined,
          } as UIMessage

          return uiMessage
        })

        setMessages(uiMessages)
      } else {
        setMessages([])
      }

      await loadConversationPodcasts(convoId)
    } catch (error) {
      console.error("Error loading conversation:", error)
      toast({
        title: "Error loading conversation",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConversationLoading(false)
    }

    setShowPodcastInput(false)
  }

  const handleDeleteConversation = async (convoId: string) => {
    try {
      const response = await api.deleteConversation(convoId)
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Conversation deleted successfully",
        })

        setConversations((prev) => prev.filter((c) => c._id !== convoId))

        if (currentConvoId === convoId) {
          startNewConversation()
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to delete conversation",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while deleting the conversation",
        variant: "destructive",
      })
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (!file) return

      setShowUploadDialog(true)
      setUploadProgress(`Uploading ${file.name}...`)
      setIsUploadLoading(true)

      try {
        const isMultimedia = file.type.startsWith("video/") || file.type.startsWith("audio/")
        const response = isMultimedia
          ? await api.uploadMultimedia(file, currentConvoId)
          : await api.uploadFile(file, currentConvoId)

        if (response.sucess) {
          if (response.convoId && !currentConvoId) {
            setCurrentConvoId(response.convoId)
          }

          const fileMessage: UIMessage = {
            id: Date.now().toString(),
            content: `Uploaded ${file.name}`,
            role: "user",
            timestamp: new Date(),
            type: "file",
            fileInfo: {
              name: file.name,
              type: file.type,
            },
          }

          setMessages((prev) => [...prev, fileMessage])

          toast({
            title: "File uploaded successfully",
            description: response.message || "Your file has been processed.",
          })

          loadConversations()
        } else {
          toast({
            title: "Upload failed",
            description: response.error || "Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Upload Error",
          description: "Something went wrong during upload. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsUploadLoading(false)
        setShowUploadDialog(false)
        setUploadProgress("")
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "video/*": [".mp4", ".avi", ".mov"],
      "audio/*": [".mp3", ".wav", ".m4a"],
    },
  })

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date(),
      type: "text",
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    const messageToSend = inputMessage
    setInputMessage("")

    try {
      const response = await api.sendChat(messageToSend, currentConvoId)

      if (response.message === "chat generated") {
        if (response.convoId && !currentConvoId) {
          setCurrentConvoId(response.convoId)
        }

        const aiMessage: UIMessage = {
          id: (Date.now() + 1).toString(),
          content: response.data || "I received your message.",
          role: "assistant",
          timestamp: new Date(),
          type: "text",
        }

        setMessages((prev) => [...prev, aiMessage])
        loadConversations()
      } else {
        toast({
          title: "Failed to send message",
          description: "Please try again.",
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

  const handleGeneratePodcast = async () => {
    if (!podcastTopic.trim()) return

    setIsPodcastLoading(true)

    try {
      const response = await api.generatePodcast(podcastTopic, currentConvoId)

      if (response.success && response.data) {
        const podcastMessage: UIMessage = {
          id: Date.now().toString(),
          content: `Generated podcast: "${podcastTopic}"`,
          role: "assistant",
          timestamp: new Date(),
          type: "podcast",
          audioUrl: response.data,
        }

        setMessages((prev) => [...prev, podcastMessage])
        setPodcastTopic("")
        setShowPodcastInput(false)

        toast({
          title: "Podcast generated successfully",
          description: "Your podcast is ready to play.",
        })

        loadConversations()

        if (currentConvoId) {
          await loadConversationPodcasts(currentConvoId)
        }
      } else {
        toast({
          title: "Failed to generate podcast",
          description: response.error || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Podcast Generation Error",
        description: "Something went wrong during podcast generation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPodcastLoading(false)
    }
  }

  const setupAudioControls = (messageId: string, audioUrl: string) => {
    if (!audioRefs.current[messageId]) {
      const audio = new Audio(audioUrl)
      audioRefs.current[messageId] = audio

      audio.onloadedmetadata = () => {
        setAudioDuration((prev) => ({ ...prev, [messageId]: audio.duration }))
      }

      audio.ontimeupdate = () => {
        setAudioProgress((prev) => ({ ...prev, [messageId]: audio.currentTime }))
      }

      audio.onended = () => {
        setPlayingAudio(null)
        setAudioProgress((prev) => ({ ...prev, [messageId]: 0 }))
      }

      audio.volume = audioVolume[messageId] || 0.7
      setAudioVolume((prev) => ({ ...prev, [messageId]: audio.volume }))
    }
  }

  const toggleAudio = (messageId: string, audioUrl: string) => {
    setupAudioControls(messageId, audioUrl)

    if (playingAudio === messageId) {
      audioRefs.current[messageId]?.pause()
      setPlayingAudio(null)
    } else {
      if (playingAudio) {
        audioRefs.current[playingAudio]?.pause()
      }

      audioRefs.current[messageId].play()
      setPlayingAudio(messageId)
    }
  }

  const seekAudio = (messageId: string, time: number) => {
    if (audioRefs.current[messageId]) {
      audioRefs.current[messageId].currentTime = time
    }
  }

  const skipAudio = (messageId: string, seconds: number) => {
    if (audioRefs.current[messageId]) {
      const newTime = Math.max(
        0,
        Math.min(audioRefs.current[messageId].currentTime + seconds, audioRefs.current[messageId].duration),
      )
      audioRefs.current[messageId].currentTime = newTime
    }
  }

  const setVolume = (messageId: string, volume: number) => {
    if (audioRefs.current[messageId]) {
      audioRefs.current[messageId].volume = volume
      setAudioVolume((prev) => ({ ...prev, [messageId]: volume }))
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getPodcastAudioUrl = (podcast: Podcast) => {
    try {
      const binaryString = atob(podcast.podcastBuffer)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: "audio/wav" })
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error("Error converting podcast buffer:", error)
      return null
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <ProtectedRoute>
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploading File</DialogTitle>
            <DialogDescription>Please wait while your file is being uploaded and processed.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{uploadProgress}</span>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-background flex">
        <div className="w-80 border-r bg-card flex flex-col h-screen">
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">NoteMind</h2>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <ProfileDialog />
                <Button variant="ghost" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
            <Button onClick={startNewConversation} className="w-full transition-all duration-200 hover:scale-105">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Conversations</h3>
            {isConversationLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading conversation...
              </div>
            )}
            <div className="space-y-2">
              {conversations.map((convo) => (
                <div key={convo._id} className="group relative">
                  <Button
                    variant={currentConvoId === convo._id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left h-auto p-3 pr-10 transition-all duration-200 hover:scale-[1.02]"
                    onClick={() => selectConversation(convo._id)}
                  >
                    <div className="truncate">
                      <div className="font-medium truncate">
                        {convo.messages.length > 0
                          ? convo.messages[0].content.slice(0, 30) +
                            (convo.messages[0].content.length > 30 ? "..." : "")
                          : `Chat ${convo._id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {new Date(convo.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this conversation? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteConversation(convo._id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>

            {currentConvoId && podcasts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Podcasts</h3>
                <div className="space-y-2">
                  {podcasts.map((podcast) => {
                    const audioUrl = getPodcastAudioUrl(podcast)
                    if (!audioUrl) return null

                    return (
                      <Card key={podcast._id} className="transition-all duration-200 hover:shadow-md">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleAudio(podcast._id, audioUrl)}
                              className="transition-all duration-200"
                            >
                              {playingAudio === podcast._id ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {new Date(podcast.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col h-screen">
          <header className="border-b bg-card p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold">AI Assistant</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/dashboard")}
                  className="transition-all duration-200 hover:scale-105"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <ThemeToggle />
                {currentConvoId && (
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    ID: {currentConvoId.slice(0, 8)}...
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 relative min-h-0">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Welcome to NoteMind</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {currentConvoId
                      ? "No messages in this conversation yet. Start chatting below!"
                      : "Upload files, chat with AI, or generate podcasts. Everything you need in one place."}
                  </p>

                  <div
                    {...getRootProps()}
                    className="border-2 border-dashed rounded-lg p-8 border-muted-foreground/25 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drag & drop files here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, Video, Audio</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {message.type === "file" && message.fileInfo && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-background/10 rounded transition-all duration-200">
                          {message.fileInfo.type.startsWith("video/") ? (
                            <Video className="h-4 w-4" />
                          ) : message.fileInfo.type.startsWith("audio/") ? (
                            <Music className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          <span className="text-sm font-medium">📎 {message.fileInfo.name}</span>
                        </div>
                      )}

                      {message.type === "podcast" && message.audioUrl && (
                        <div className="mb-3 p-3 bg-background/10 rounded">
                          <div className="flex items-center gap-2 mb-3">
                            <Button
                              size="sm"
                              variant={message.role === "user" ? "secondary" : "default"}
                              onClick={() => toggleAudio(message.id, message.audioUrl!)}
                            >
                              {playingAudio === message.id ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => skipAudio(message.id, -10)}>
                              <SkipBack className="h-3 w-3" />
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => skipAudio(message.id, 10)}>
                              <SkipForward className="h-3 w-3" />
                            </Button>

                            <a
                              href={message.audioUrl}
                              download="podcast.wav"
                              className="text-sm hover:underline flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                            </a>
                          </div>

                          {audioDuration[message.id] && (
                            <div className="space-y-2">
                              <Slider
                                value={[audioProgress[message.id] || 0]}
                                max={audioDuration[message.id]}
                                step={1}
                                onValueChange={([value]) => seekAudio(message.id, value)}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{formatTime(audioProgress[message.id] || 0)}</span>
                                <span>{formatTime(audioDuration[message.id])}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <Volume2 className="h-3 w-3" />
                            <Slider
                              value={[audioVolume[message.id] || 0.7]}
                              max={1}
                              step={0.1}
                              onValueChange={([value]) => setVolume(message.id, value)}
                              className="w-20"
                            />
                          </div>
                        </div>
                      )}

                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-2">{message.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {isDragActive && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10 animate-in fade-in duration-200">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="text-lg font-medium text-primary">Drop files here to upload</p>
                  <p className="text-sm text-muted-foreground">PDF, DOCX, PPTX, Video, Audio</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-card p-4 flex-shrink-0">
            <div className="max-w-4xl mx-auto space-y-3">
              {showPodcastInput && (
                <Card className="animate-in slide-in-from-bottom-2 duration-300">
                  <CardContent className="p-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter topic for podcast..."
                        value={podcastTopic}
                        onChange={(e) => setPodcastTopic(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleGeneratePodcast()}
                        disabled={isPodcastLoading}
                        className="transition-all duration-200 focus:scale-[1.02]"
                      />
                      <Button
                        onClick={handleGeneratePodcast}
                        disabled={isPodcastLoading || !podcastTopic.trim()}
                        className="transition-all duration-200 hover:scale-105"
                      >
                        {isPodcastLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowPodcastInput(false)}
                        className="transition-all duration-200"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <div className="flex gap-1">
                  <div {...getRootProps()}>
                    <input {...getInputProps()} />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUploadLoading}
                      className="px-3 bg-transparent transition-all duration-200 hover:scale-105"
                      title="Upload files (PDF, DOCX, PPTX, Video, Audio)"
                    >
                      {isUploadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="ml-1 hidden sm:inline">Upload</span>
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPodcastInput(!showPodcastInput)}
                    title="Generate podcast"
                    className="transition-all duration-200 hover:scale-105"
                  >
                    <Mic className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Podcast</span>
                  </Button>
                </div>

                <Textarea
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="min-h-[40px] max-h-32 resize-none transition-all duration-200 focus:scale-[1.02]"
                  disabled={isLoading}
                />

                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="transition-all duration-200 hover:scale-105"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
