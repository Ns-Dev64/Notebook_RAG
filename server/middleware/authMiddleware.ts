import { Elysia } from 'elysia'
import Jwt  from 'jsonwebtoken'

export const authMiddleware = (app:Elysia) =>
  app
    .derive(async ({ headers }) => {
      const authHeader = headers.authorization

      if (!authHeader) {
        throw new Error("No authorization header")
      }

      const token = authHeader.split(" ")[1]

      if (!token) {
        throw new Error("No token provided")
      }

      try {
        const payload = Jwt.verify(token, Bun.env.JWT_SECRET!)
        return { user: payload }
      } catch (error) {
        throw new Error("Invalid token")
      }
    })
    .onBeforeHandle(({ user, set }) => {
      if (!user) {
        set.status = 401
        return {
          message: "Unauthorized",
          success: false
        }
      }
    })