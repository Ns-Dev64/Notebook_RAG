"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { ProtectedRoute } from "@/components/protected-route"
import { AudioPlayer } from "@/components/audio-player"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Mic, Loader2, Sparkles } from "lucide-react"

interface GeneratedPodcast {
  id: string
  topic: string
  audioUrl: string
  convoId?: string
  createdAt: Date
}

export default function PodcastPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [topic, setTopic] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPodcasts, setGeneratedPodcasts] = useState<GeneratedPodcast[]>([])
  const [convoId, setConvoId] = useState<string>()

  const handleGeneratePodcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim() || isGenerating) return

    setIsGenerating(true)

    try {
      const response = await api.generatePodcast(topic.trim(), convoId)

      if (response.success && response.data) {
        // Update convoId if it's a new conversation
        if (response.data.convoId && !convoId) {
          setConvoId(response.data.convoId)
        }

        const newPodcast: GeneratedPodcast = {
          id: Date.now().toString(),
          topic: topic.trim(),
          audioUrl: response.data.audioUrl || response.data.url || response.data.audio,
          convoId: response.data.convoId,
          createdAt: new Date(),
        }

        setGeneratedPodcasts((prev) => [newPodcast, ...prev])
        setTopic("")

        toast({
          title: "Podcast generated successfully!",
          description: "Your AI-generated podcast is ready to play.",
        })
      } else {
        toast({
          title: "Failed to generate podcast",
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
      setIsGenerating(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
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
                  <Mic className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-semibold">Podcast Generator</h1>
                </div>
              </div>
              {convoId && (
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  ID: {convoId.slice(0, 8)}...
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Generator Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Generate AI Podcast
                  </CardTitle>
                  <CardDescription>Enter a topic and let AI create an engaging podcast for you</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGeneratePodcast} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="topic">Podcast Topic</Label>
                      <Textarea
                        id="topic"
                        placeholder="Enter your podcast topic... (e.g., 'The future of artificial intelligence', 'Climate change solutions', 'History of space exploration')"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={isGenerating}
                        className="min-h-[100px]"
                        rows={4}
                      />
                    </div>

                    <Button type="submit" disabled={!topic.trim() || isGenerating} className="w-full" size="lg">
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Podcast...
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Generate Podcast
                        </>
                      )}
                    </Button>
                  </form>

                  {isGenerating && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <div>
                          <p className="font-medium text-sm">Creating your podcast...</p>
                          <p className="text-xs text-muted-foreground">
                            This may take a few moments while AI generates the audio content.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Info Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How it works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      1
                    </div>
                    <p>Enter your desired podcast topic or theme</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      2
                    </div>
                    <p>AI generates engaging content and narration</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      3
                    </div>
                    <p>Listen, download, or share your podcast</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Be specific with your topic for better results</p>
                  <p>• Include context or angle you want covered</p>
                  <p>• Try different topics to explore various styles</p>
                  <p>• Generated podcasts are saved for later listening</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Generated Podcasts */}
          {generatedPodcasts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">Your Generated Podcasts</h2>
              <div className="space-y-6">
                {generatedPodcasts.map((podcast) => (
                  <div key={podcast.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-foreground">{podcast.topic}</h3>
                      <span className="text-sm text-muted-foreground">
                        {podcast.createdAt.toLocaleDateString()} at{" "}
                        {podcast.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <AudioPlayer src={podcast.audioUrl} title={podcast.topic} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
