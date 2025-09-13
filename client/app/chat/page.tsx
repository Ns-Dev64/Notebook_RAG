"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileDialog } from "@/components/profile-dialog";
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
  GitBranch,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import MermaidDiagram from "@/components/mermaid-diagram";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface Conversation {
  _id: string;
  createdAt: string;
  messages: Message[];
  updatedAt: string;
  userId: string;
}

interface UIDiagramMessage extends UIMessage {
  mermaidSyntax?: string;
}

interface UIMessage extends Omit<Message, 'timestamp'> {
  id: string;
  timestamp: Date;
  type?: "text" | "file" | "podcast";
  fileInfo?: {
    name: string;
    type: string;
  };
  audioUrl?: string;
}

interface Podcast {
  _id: string;
  convoId: string;
  url: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvoId, setCurrentConvoId] = useState<string>();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [podcastTopic, setPodcastTopic] = useState("");
  const [showPodcastInput, setShowPodcastInput] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>(
    {}
  );
  const [audioDuration, setAudioDuration] = useState<{ [key: string]: number }>(
    {}
  );
  const [audioVolume, setAudioVolume] = useState<{ [key: string]: number }>({});
  const [audioLoading, setAudioLoading] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [loadedAudioUrls, setLoadedAudioUrls] = useState<{
    [key: string]: string;
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false); // Added state for drag active
  const [diagramQuery, setDiagramQuery] = useState("");
  const [showDiagramInput, setShowDiagramInput] = useState(false);
  const [isDiagramLoading, setIsDiagramLoading] = useState(false);
  const [showDiagramDialog, setShowDiagramDialog] = useState(false);
  const [selectedDiagram, setSelectedDiagram] = useState<UIDiagramMessage | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      if (user) {
        try {
          const response = await api.getUserStatus();
          if (!response.success || response.message !== "User logged in") {
            logout();
            router.push("/");
            return;
          }
          // Only load conversations if auth check passes
          await loadConversations();
        } catch (error) {
          logout();
          router.push("/");
        }
      }
    };

    initializeApp();
  }, [user, logout, router]);

  const loadConversations = async () => {
    try {
      const response = await api.getConversations();
      setConversations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setConversations([]);
      toast({
        title: "Error loading conversations",
        description: "Please refresh the page or try again later.",
        variant: "destructive",
      });
    }
  };

  const loadConversationPodcasts = async (convoId: string) => {
    try {
      const response = await api.getConversationPodcasts(convoId);

      console.log(Object.keys(response));

      if (response.success && response.data) {
        setPodcasts(Array.isArray(response.data) ? response.data : []);
      } else {
        setPodcasts([]);
      }
    } catch (error) {
      console.error("Failed to load podcasts:", error);
      setPodcasts([]);
    }
  };


  const startNewConversation = () => {
    setCurrentConvoId(undefined);
    setMessages([]);
    setPodcasts([]);
    setShowPodcastInput(false);
  };

  const selectConversation = async (convoId: string) => {
    setIsConversationLoading(true);
    setCurrentConvoId(convoId);

    try {
      const conversation = conversations.find((c) => c._id === convoId);
      console.log("[v0] Selected conversation:", conversation);

      // Load messages and diagrams in parallel
      const [messagesResponse, diagramsResponse, podcastsResponse] = await Promise.all([
        conversation && conversation.messages && conversation.messages.length > 0 
          ? Promise.resolve(conversation.messages) 
          : Promise.resolve([]),
        api.getConversationDiagrams(convoId),
        api.getConversationPodcasts(convoId)
      ]);

      // Process regular messages
      const uiMessages: UIMessage[] = messagesResponse.map(
        (msg, index) => {
          const isFileUpload = msg.content.startsWith("Uploaded ");
          const uiMessage = {
            ...msg,
            id: `${convoId}-${index}`,
            timestamp: new Date(msg.timestamp || conversation?.updatedAt || Date.now()),
            type: isFileUpload ? "file" : "text",
            fileInfo: isFileUpload
              ? {
                  name: msg.content.replace("Uploaded ", ""),
                  type: "application/octet-stream",
                }
              : undefined,
          } as UIMessage;

          console.log("[v0] Mapped message:", uiMessage);
          return uiMessage;
        }
      );

      // Process diagram messages
      const diagramMessages: UIDiagramMessage[] = [];
      if (diagramsResponse.success && diagramsResponse.data && Array.isArray(diagramsResponse.data)) {
        diagramsResponse.data.forEach((diagram, index) => {
          diagramMessages.push({
            id: `diagram-${convoId}-${index}`,
            content: "",
            role: "assistant" as const,
            timestamp: new Date(diagram.createdAt || Date.now()),
            type: "text" as const,
            mermaidSyntax: diagram.rawSyntax 
          });
        });
      }

      // Process podcasts
      if (podcastsResponse.success && podcastsResponse.data) {
        setPodcasts(Array.isArray(podcastsResponse.data) ? podcastsResponse.data : []);
      } else {
        setPodcasts([]);
      }

      // Combine and sort all messages by timestamp
      const allMessages = [...uiMessages, ...diagramMessages].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      console.log("[v0] Setting messages with diagrams:", allMessages);
      setMessages(allMessages);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast({
        title: "Error loading conversation",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConversationLoading(false);
    }

    setShowPodcastInput(false);
  };

  const handleDeleteConversation = async (convoId: string) => {
    try {
      const response = await api.deleteConversation(convoId);
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Conversation deleted successfully",
        });

        setConversations((prev) => prev.filter((c) => c._id !== convoId));

        if (currentConvoId === convoId) {
          startNewConversation();
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to delete conversation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while deleting the conversation",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!files.length) return;

    // Create new conversation if none exists
    let convoId = currentConvoId ? currentConvoId : null;
    setIsUploadLoading(true);
    setShowUploadDialog(true);
    setIsProcessing(true);

    const file = files[0];
    if (file.type.includes("audio")) {
      setProcessingMessage("Analysing audio content...");
    } else if (file.type.includes("video")) {
      setProcessingMessage("Processing video file...");
    } else if (file.type.includes("pdf")) {
      setProcessingMessage("Thinking through the document...");
    } else {
      setProcessingMessage("Processing your file...");
    }

    try {
      for (const file of files) {
        // Add file message to UI immediately with proper formatting
        const fileMessage: UIMessage = {
          id: `file-${Date.now()}-${Math.random()}`,
          content: `Uploaded ${file.name}`,
          role: "user",
          timestamp: new Date(),
          type: "file",
          fileInfo: {
            name: file.name,
            type: file.type,
          },
        };

        setMessages((prev) => [...prev, fileMessage]);

        setUploadProgress(`Uploading ${file.name}...`);

        const isMultimedia = file.type.startsWith("video/") || file.type.startsWith("audio/");
const response = convoId
  ? (isMultimedia ? await api.uploadMultimedia(file, convoId) : await api.uploadFile(file, convoId))
  : (isMultimedia ? await api.uploadMultimedia(file) : await api.uploadFile(file));

        // Update currentConvoId if it was null
        if (!currentConvoId && convoId) {
          setCurrentConvoId(convoId);
        }

        if (response.success) {
          if (file.type.includes("pdf")) {
            setUploadProgress(`Extracting text from ${file.name}...`);
          } else if (file.type.includes("audio")) {
            setUploadProgress(`Transcribing ${file.name}...`);
          } else {
            setUploadProgress(`Processing ${file.name}...`);
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Add AI response message indicating processing is complete
          const aiResponseMessage: UIMessage = {
            id: `ai-response-${Date.now()}-${Math.random()}`,
            content: `I've successfully processed your file: ${file.name}. You can now ask me questions about its content.`,
            role: "assistant",
            timestamp: new Date(),
            type: "text",
          };

          setMessages((prev) => [...prev, aiResponseMessage]);
        } else {
          // Remove the file message if upload failed
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== fileMessage.id)
          );
          throw new Error(response.error || "Upload failed");
        }
      }

      toast({
        title: "Upload Complete",
        description:
          "Your files have been uploaded and processed successfully!",
      });

      // Refresh conversations list to show the new conversation
      await loadConversations();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadLoading(false);
      setShowUploadDialog(false);
      setUploadProgress("");
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setIsProcessing(true);
    setProcessingMessage("Thinking...");
    const messageToSend = inputMessage;
    setInputMessage("");

    try {
      const response = await api.sendChat(messageToSend, currentConvoId);

      if (response.message === "chat generated") {
        if (response.convoId && !currentConvoId) {
          setCurrentConvoId(response.convoId);
        }

        const aiMessage: UIMessage = {
          id: (Date.now() + 1).toString(),
          content: typeof response.data === 'string' ? response.data : "I received your message.",
          role: "assistant",
          timestamp: new Date(),
          type: "text",
        };

        setMessages((prev) => [...prev, aiMessage]);
        loadConversations();
      } else {
        toast({
          title: "Failed to send message",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  const handleGeneratePodcast = async () => {
    if (!podcastTopic.trim()) return;

    setIsPodcastLoading(true);
    setIsProcessing(true);
    setProcessingMessage("Crafting your podcast content...");
    setShowPodcastInput(false);

    try {
      const response = await api.generatePodcast(podcastTopic, currentConvoId);

      console.log(response);

      if (response.success && response.data) {
        setPodcastTopic("");
        setShowPodcastInput(false);

        // Refresh the conversation to get the podcast in the correct chronological position
        if (currentConvoId) {
          await selectConversation(currentConvoId);
        }

        toast({
          title: "Podcast generated successfully",
          description: "Your podcast is ready to play.",
        });

        loadConversations();
      } else {
        toast({
          title: "Failed to generate podcast",
          description: response.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Podcast Generation Error",
        description:
          "Something went wrong during podcast generation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPodcastLoading(false);
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  const handleGenerateDiagram = async () => {
    if (!diagramQuery.trim()) return;

    setIsDiagramLoading(true);
    setIsProcessing(true);
    setProcessingMessage("Generating your diagram...");
    setShowDiagramInput(false);

    // Add user message first
    const userMessage: UIMessage = {
      id: Date.now().toString(),
      content: diagramQuery,
      role: "user",
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    const queryToSend = diagramQuery;
    setDiagramQuery("");

    try {
      // Call your API to generate diagram
      const response = await api.generateDiagram(queryToSend, currentConvoId!);

      if (response.success && response.rawData) {
        // Update conversation ID if it's a new conversation
        if (response.convoId && !currentConvoId) {
          setCurrentConvoId(response.convoId);
        }

        // Refresh the conversation to get the diagram in the correct chronological position
        if (currentConvoId || response.convoId) {
          await selectConversation(currentConvoId || response.convoId!);
        }

        toast({
          title: "Diagram generated successfully",
          description: "Your diagram is ready to view.",
        });

        loadConversations();
      } else {
        toast({
          title: "Failed to generate diagram",
          description: response.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Diagram Generation Error",
        description:
          "Something went wrong during diagram generation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDiagramLoading(false);
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  const setupAudioControls = async (messageId: string, audioUrl: string) => {
    if (!audioRefs.current[messageId]) {
      setAudioLoading((prev) => ({ ...prev, [messageId]: true }));

      try {
        const audio = new Audio(audioUrl);
        audioRefs.current[messageId] = audio;

        await new Promise((resolve, reject) => {
          audio.onloadedmetadata = () => {
            setAudioDuration((prev) => ({
              ...prev,
              [messageId]: audio.duration,
            }));
            resolve(true);
          };
          audio.onerror = reject;
        });

        audio.ontimeupdate = () => {
          setAudioProgress((prev) => ({
            ...prev,
            [messageId]: audio.currentTime,
          }));
        };

        audio.onended = () => {
          setPlayingAudio(null);
          setAudioProgress((prev) => ({ ...prev, [messageId]: 0 }));
          cleanupAudio(messageId);
        };

        audio.volume = audioVolume[messageId] || 0.7;
        setAudioVolume((prev) => ({ ...prev, [messageId]: audio.volume }));
        setLoadedAudioUrls((prev) => ({ ...prev, [messageId]: audioUrl }));

        toast({
          title: "Audio loaded",
          description: "Your audio is ready to play.",
        });
      } catch (error) {
        toast({
          title: "Audio loading failed",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setAudioLoading((prev) => ({ ...prev, [messageId]: false }));
      }
    }
  };

  const cleanupAudio = (messageId: string) => {
    if (audioRefs.current[messageId]) {
      audioRefs.current[messageId].pause();
      audioRefs.current[messageId].src = "";
      delete audioRefs.current[messageId];
      setLoadedAudioUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[messageId];
        return newUrls;
      });
      setAudioDuration((prev) => {
        const newDuration = { ...prev };
        delete newDuration[messageId];
        return newDuration;
      });
      setAudioProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[messageId];
        return newProgress;
      });
    }
  };

  const toggleAudio = async (
    messageId: string,
    audioUrl: string,
    podcast?: Podcast
  ) => {
    if (playingAudio === messageId) {
      audioRefs.current[messageId]?.pause();
      setPlayingAudio(null);
      cleanupAudio(messageId);
      return;
    }

    if (playingAudio) {
      audioRefs.current[playingAudio]?.pause();
      cleanupAudio(playingAudio);
      setPlayingAudio(null);
    }

    let finalAudioUrl = audioUrl;
    if (podcast) {
      finalAudioUrl = await checkAndRefreshPodcastUrl(podcast);
    }

    if (!loadedAudioUrls[messageId]) {
      await setupAudioControls(messageId, finalAudioUrl);
    }

    if (audioRefs.current[messageId]) {
      audioRefs.current[messageId].play();
      setPlayingAudio(messageId);
    }
  };

  const seekAudio = (messageId: string, time: number) => {
    if (audioRefs.current[messageId]) {
      audioRefs.current[messageId].currentTime = time;
    }
  };

  const skipAudio = (messageId: string, seconds: number) => {
    if (audioRefs.current[messageId]) {
      const newTime = Math.max(
        0,
        Math.min(
          audioRefs.current[messageId].currentTime + seconds,
          audioRefs.current[messageId].duration
        )
      );
      audioRefs.current[messageId].currentTime = newTime;
    }
  };

  const setVolumeForPodcast = (podcastId: string, volume: number) => {
    if (audioRefs.current[podcastId]) {
      audioRefs.current[podcastId].volume = volume;
      setAudioVolume((prev) => ({ ...prev, podcastId: volume }));
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const openDiagramDialog = (diagram: UIDiagramMessage) => {
    setSelectedDiagram(diagram);
    setShowDiagramDialog(true);
  };

  const closeDiagramDialog = () => {
    setShowDiagramDialog(false);
    setSelectedDiagram(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files) {
      handleFileUpload(Array.from(files));
    }
    event.target.value = "";
  };

  const checkAndRefreshPodcastUrl = async (
    podcast: Podcast
  ): Promise<string> => {
    const updatedAt = new Date(podcast.updatedAt);
    const now = new Date();
    const timeDiff = (now.getTime() - updatedAt.getTime()) / 1000; // Convert to seconds

    if (timeDiff > 7200) {
      try {
        const response = await api.refreshPresignedUrl(
          podcast.convoId,
          podcast.url
        );
        if (response.success && response.audioUrl) {
          return response.audioUrl;
        }
      } catch (error) {
        console.error("Failed to refresh presigned URL:", error);
      }
    }

    return podcast.url;
  };

  const loadMessages = async (convoId: string) => {
    try {
      const response = await api.getMessages(convoId);
      if (response.success && response.messages) {
        console.log("setting messages");
        setMessages(
          response.messages.map((msg, index) => ({
            ...msg,
            id: `${convoId}-${index}`,
            timestamp: new Date(),
          }))
        );
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    }
  };

  return (
    <ProtectedRoute>
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploading File</DialogTitle>
            <DialogDescription>
              Please wait while your file is being uploaded and processed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{uploadProgress}</span>
          </div>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.pptx,.mp4,.avi,.mov,.mp3,.wav,.m4a,video/*,audio/*"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />

      <div className="min-h-screen bg-background flex">
        <div className="w-80 border-r bg-background flex flex-col h-screen">
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">NoteMind</h2>
              <div className="flex items-center gap-2">
                <ProfileDialog />
                <Button variant="ghost" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
            <Button
              onClick={startNewConversation}
              className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in slide-in-from-top duration-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Conversations
            </h3>
            {isConversationLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading conversation...
              </div>
            )}
            <div className="space-y-2">
              {conversations.map((convo, index) => (
                <div
                  key={convo._id}
                  className="group relative animate-in slide-in-from-left duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Button
                    variant={
                      currentConvoId === convo._id ? "secondary" : "ghost"
                    }
                    className="w-full justify-start text-left h-auto p-3 pr-10 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
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
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this conversation?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteConversation(convo._id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>

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
                  className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in slide-in-from-top duration-500"
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

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Welcome to NoteMind
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {currentConvoId
                      ? "No messages in this conversation yet. Start chatting below!"
                      : "Upload files, chat with AI, or generate podcasts. Everything you need in one place."}
                  </p>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-8 border-muted-foreground/25 cursor-pointer transition-all duration-300 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop files here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, PPTX, Video, Audio
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {/* Display podcasts for current conversation */}
                {currentConvoId && podcasts.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-center">Podcasts</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {podcasts.map((podcast) => {
                        const audioUrl = podcast.url;
                        if (!audioUrl) return null;

                        const isPlaying = playingAudio === podcast._id;
                        const progress = audioProgress[podcast._id] || 0;
                        const duration = audioDuration[podcast._id] || 0;
                        const volume = audioVolume[podcast._id] || 0.7;

                        return (
                          <Card
                            key={podcast._id}
                            className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-in slide-in-from-bottom duration-500"
                          >
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      toggleAudio(podcast._id, audioUrl, podcast)
                                    }
                                    className="transition-all duration-200 hover:scale-110"
                                    disabled={audioLoading[podcast._id]}
                                  >
                                    {audioLoading[podcast._id] ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isPlaying ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>

                                  {!audioLoading[podcast._id] && duration > 0 && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => skipAudio(podcast._id, -10)}
                                        className="transition-all duration-200 hover:scale-110"
                                      >
                                        <SkipBack className="h-3 w-3" />
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => skipAudio(podcast._id, 10)}
                                        className="transition-all duration-200 hover:scale-110"
                                      >
                                        <SkipForward className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                      Podcast
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {new Date(podcast.createdAt).toLocaleDateString()}
                                    </div>
                                    {audioLoading[podcast._id] && (
                                      <div className="text-xs text-primary animate-pulse">
                                        Loading audio...
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {duration > 0 && !audioLoading[podcast._id] && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {formatTime(progress)}
                                      </span>
                                      <div className="flex-1">
                                        <input
                                          type="range"
                                          min="0"
                                          max={duration}
                                          value={progress}
                                          onChange={(e) =>
                                            seekAudio(
                                              podcast._id,
                                              Number(e.target.value)
                                            )
                                          }
                                          className="audio-slider w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                                        />
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {formatTime(duration)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Volume2 className="h-3 w-3 text-muted-foreground" />
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={volume}
                                        onChange={(e) => {
                                          const volume = Number(e.target.value);
                                          setAudioVolume((prev) => ({
                                            ...prev,
                                            [podcast._id]: volume,
                                          }));
                                          if (audioRefs.current[podcast._id]) {
                                            audioRefs.current[podcast._id].volume =
                                              volume;
                                          }
                                        }}
                                        className="audio-slider flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {Math.round(volume * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}


                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex animate-in slide-in-from-bottom duration-500 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
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
                          <span className="text-sm font-medium">
                            📎 {message.fileInfo.name}
                          </span>
                        </div>
                      )}

                      {message.type === "podcast" && message.audioUrl && (
                        <div className="mb-3 p-3 bg-background/10 rounded">
                          <div className="flex items-center gap-2 mb-3">
                            <Button
                              size="sm"
                              variant={
                                message.role === "user"
                                  ? "secondary"
                                  : "default"
                              }
                              onClick={() =>
                                toggleAudio(message.id, message.audioUrl!)
                              }
                              disabled={audioLoading[message.id]}
                              className="transition-all duration-200 hover:scale-110"
                            >
                              {audioLoading[message.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : playingAudio === message.id ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>

                            {audioLoading[message.id] ? (
                              <span className="text-xs text-primary animate-pulse">
                                Loading audio...
                              </span>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => skipAudio(message.id, -10)}
                                  className="transition-all duration-200 hover:scale-110"
                                >
                                  <SkipBack className="h-3 w-3" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => skipAudio(message.id, 10)}
                                  className="transition-all duration-200 hover:scale-110"
                                >
                                  <SkipForward className="h-3 w-3" />
                                </Button>

                                <a
                                  href={message.audioUrl}
                                  download="podcast.wav"
                                  className="text-sm hover:underline flex items-center gap-1 transition-all duration-200 hover:scale-110"
                                >
                                  <Download className="h-3 w-3" />
                                </a>
                              </>
                            )}
                          </div>

                          {audioDuration[message.id] &&
                            !audioLoading[message.id] && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(audioProgress[message.id] || 0)}
                                  </span>
                                  <div className="flex-1">
                                    <input
                                      type="range"
                                      min="0"
                                      max={audioDuration[message.id]}
                                      value={audioProgress[message.id] || 0}
                                      onChange={(e) =>
                                        seekAudio(
                                          message.id,
                                          Number(e.target.value)
                                        )
                                      }
                                      className="audio-slider w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(audioDuration[message.id])}
                                  </span>
                                </div>
                              </div>
                            )}

                          {loadedAudioUrls[message.id] && (
                            <div className="flex items-center gap-2">
                              <Volume2 className="h-3 w-3 text-muted-foreground" />
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={audioVolume[message.id] || 0.7}
                                onChange={(e) =>
                                  setVolumeForPodcast(
                                    message.id,
                                    Number(e.target.value)
                                  )
                                }
                                className="audio-slider flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-xs text-muted-foreground w-8">
                                {Math.round(
                                  (audioVolume[message.id] || 0.7) * 100
                                )}
                                %
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {message.type === "text" &&
                        (message as UIDiagramMessage).mermaidSyntax && (
                          <div className="mb-3 p-3 bg-muted/50 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <GitBranch className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Here's your diagram</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      (message as UIDiagramMessage)
                                        .mermaidSyntax || ""
                                    );
                                    toast({
                                      title: "Copied to clipboard",
                                      description: "Mermaid syntax copied successfully",
                                    });
                                  }}
                                  className="h-8 px-3 text-xs"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy Syntax
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => openDiagramDialog(message as UIDiagramMessage)}
                                  className="h-8 px-3 text-xs"
                                >
                                  <GitBranch className="h-3 w-3 mr-1" />
                                  View Diagram
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start animate-in slide-in-from-bottom duration-300">
                    <div className="max-w-[80%] bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground animate-pulse">
                          {processingMessage}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {isDragActive && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10 animate-in fade-in duration-200">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-primary">
                    Drop your file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOCX, PPTX, Video, Audio
                  </p>
                </div>
              </div>
            )}
          </div>

          <footer className="border-t bg-card p-4 flex-shrink-0">
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
              <Input
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 transition-all duration-200 focus:scale-[1.02]"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || isProcessing}
                className="transition-all duration-300 hover:scale-110 hover:shadow-lg"
              >
                {isLoading || isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadLoading || isProcessing}
                className="transition-all duration-300 hover:scale-110 hover:shadow-lg"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowPodcastInput((prev) => !prev)}
                disabled={!currentConvoId}
                className="transition-all duration-300 hover:scale-110 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic className="h-4 w-4 mr-2" />
                Podcast
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowDiagramInput((prev) => !prev)}
                disabled={!currentConvoId}
                className="transition-all duration-300 hover:scale-110 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GitBranch className="h-4 w-4 mr-2" />
                Diagram
              </Button>
            </div>

            {showPodcastInput && (
              <div className="mt-3 flex items-center gap-2 max-w-4xl mx-auto animate-in slide-in-from-bottom duration-300">
                <Input
                  placeholder="Enter podcast topic..."
                  value={podcastTopic}
                  onChange={(e) => setPodcastTopic(e.target.value)}
                  className="flex-1 transition-all duration-200 focus:scale-[1.02]"
                />
                <Button
                  onClick={handleGeneratePodcast}
                  disabled={isPodcastLoading || isProcessing}
                  className="transition-all duration-300 hover:scale-110 hover:shadow-lg"
                >
                  {isPodcastLoading || isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            )}
            {showDiagramInput && (
              <div className="mt-3 flex flex-col gap-2 max-w-4xl mx-auto animate-in slide-in-from-bottom duration-300">
                <textarea
                  placeholder="Enter your diagram request (e.g., 'Generate a mindmap for my skills', 'Create a flowchart for user authentication process')"
                  value={diagramQuery}
                  onChange={(e) => setDiagramQuery(e.target.value)}
                  rows={3}
                  className="w-full p-3 border rounded-md resize-none transition-all duration-200 focus:scale-[1.02] focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleGenerateDiagram}
                    disabled={isDiagramLoading || isProcessing}
                    className="transition-all duration-300 hover:scale-110 hover:shadow-lg"
                  >
                    {isDiagramLoading || isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <GitBranch className="h-4 w-4 mr-2" />
                    )}
                    Generate Diagram
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDiagramInput(false);
                      setDiagramQuery("");
                    }}
                    className="transition-all duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </footer>
        </div>
      </div>

      {/* Diagram Dialog */}
      {showDiagramDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[95vw] h-[95vh] bg-background rounded-lg shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                <span className="font-semibold">Diagram</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={closeDiagramDialog}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-6">
              {selectedDiagram && (
                <MermaidDiagram
                  chart={selectedDiagram.mermaidSyntax!}
                  config={{ 
                    theme: "base",
                    mindmap: {
                      maxNodeSizeRatio: 20,
                      useMaxWidth: true,
                      padding: 60,
                      nodeSpacing: 120,
                      levelSpacing: 200
                    }
                  }}
                  height="calc(95vh - 120px)"
                  className="w-full"
                  onError={(error) => {
                    console.error("Diagram error:", error);
                    toast({
                      title: "Diagram Error",
                      description: "Failed to render diagram. Please try again.",
                      variant: "destructive",
                    });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
