"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Upload, type File, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onFileUploaded: (file: any) => void
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]
      setIsUploading(true)

      try {
        // Determine if it's multimedia or document
        const isMultimedia = file.type.startsWith("video/") || file.type.startsWith("audio/")

        const response = isMultimedia ? await api.uploadMultimedia(file) : await api.uploadFile(file)

        if (response.success && response.data) {
          toast({
            title: "File uploaded successfully!",
            description: `${file.name} has been uploaded.`,
          })
          onFileUploaded(response.data)
        } else {
          toast({
            title: "Upload failed",
            description: response.error || "Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Something went wrong during upload.",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    },
    [onFileUploaded, toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "video/*": [".mp4", ".avi", ".mov", ".wmv"],
      "audio/*": [".mp3", ".wav", ".aac", ".ogg"],
    },
    multiple: false,
    disabled: isUploading,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Files
        </CardTitle>
        <CardDescription>
          Upload documents (PDF, DOCX, PPTX) or multimedia files (video, audio) for AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            isUploading && "pointer-events-none opacity-50",
          )}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm text-primary">Drop the file here...</p>
              ) : (
                <>
                  <p className="text-sm text-foreground">Drag & drop a file here, or click to select</p>
                  <p className="text-xs text-muted-foreground">Supports PDF, DOCX, PPTX, video, and audio files</p>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
