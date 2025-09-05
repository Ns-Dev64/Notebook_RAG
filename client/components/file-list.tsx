"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { File, Video, Music, FileText, Presentation } from "lucide-react"

interface FileItem {
  id: string
  name: string
  type: string
  size?: number
  convoId?: string
  uploadedAt: string
}

interface FileListProps {
  files: FileItem[]
}

function getFileIcon(type: string) {
  if (type.startsWith("video/")) return Video
  if (type.startsWith("audio/")) return Music
  if (type.includes("pdf")) return FileText
  if (type.includes("presentation")) return Presentation
  return File
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "Unknown size"
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export function FileList({ files }: FileListProps) {
  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Files</CardTitle>
          <CardDescription>No files uploaded yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Upload your first file to get started with AI analysis
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Files</CardTitle>
        <CardDescription>
          {files.length} file{files.length !== 1 ? "s" : ""} uploaded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {files.map((file) => {
            const IconComponent = getFileIcon(file.type)
            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.convoId && (
                    <Badge variant="secondary" className="text-xs">
                      ID: {file.convoId.slice(0, 8)}...
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
