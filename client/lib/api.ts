const API_BASE_URL = "http://localhost:5001/api/v1"

interface ApiResponse<T = any> {
  data?: T
  error?: string
  success: boolean
  message?: string
  user?: any
  token?: string
  convoId?: string
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("notemind_token")
    }
    return null
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken()

    // Don't set Content-Type for FormData requests
    const isFormData = options.body instanceof FormData

    const config: RequestInit = {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

      if (endpoint === "/ai/audio-podcast") {
        if (!response.ok) {
          const errorData = await response.json()
          return {
            success: false,
            error: errorData.message || "An error occurred",
          }
        }
        const data = await response.json();
        const {audioUrl} = data;
        return{
          success:true,
          data: audioUrl as T
        }
      }

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "An error occurred",
        }
      }

      if (endpoint === "/user/convo") {
        return {
          success: true,
          data,
        }
      }

      if (endpoint.startsWith("/user/convo/podcast/")) {
        return {
          success: true,
          data,
        }
      }

      return {
        success: true,
        ...data,
      }
    } catch (error) {
      return {
        success: false,
        error: "Network error occurred",
      }
    }
  }

  // Auth endpoints
  async signup(userData: { userName: string; email: string; password: string }) {
    return this.request("/user", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async login(credentials: { identifier: string; password: string }) {
    return this.request("/user", {
      method: "PUT",
      body: JSON.stringify(credentials),
    })
  }

  // File upload endpoints
  async uploadFile(file: File, convoId?: string) {
    const formData = new FormData()
    formData.append("file", file)
    if (convoId) formData.append("convoId", convoId)

    return this.request("/file", {
      method: "POST",
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    })
  }

  async uploadMultimedia(file: File, convoId?: string) {
    const formData = new FormData()
    formData.append("file", file)
    if (convoId) formData.append("convoId", convoId)

    return this.request("/file/multimedia", {
      method: "POST",
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    })
  }

  // AI endpoints
  async sendChat(chat: string, convoId?: string) {
    return this.request("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ chat, convoId }),
    })
  }

  async generatePodcast(chat: string, convoId?: string) {
    return this.request("/ai/audio-podcast", {
      method: "POST",
      body: JSON.stringify({ chat, convoId }),
    })
  }

  async refreshPresignedUrl(convoId: string, url: string) {
    return this.request("/refresh-presigned", {
      method: "POST",
      body: JSON.stringify({ convoId, url }),
    })
  }

  async getConversations() {
    return this.request("/user/convo", {
      method: "GET",
    })
  }

  async getConversationPodcasts(convoId: string) {
    return this.request(`/user/convo/podcast/${convoId}`, {
      method: "GET",
    })
  }

  async deleteConversation(convoId: string) {
    return this.request(`/user/convo/${convoId}`, {
      method: "DELETE",
    })
  }

  async getMessages(convoId:string){

    return this.request(`/user/convo/messages/${convoId}`,{
      method: 'GET',
    })

  }

  async getUserStatus() {
    return this.request("/user/status", {
      method: "GET",
    })
  }
}

export const api = new ApiClient()
