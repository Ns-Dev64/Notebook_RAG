# Environment Configuration Setup

## Create .env.local file

Create a `.env.local` file in the client folder with the following content:

```env
# Environment Configuration
ENV_TYPE=PROD
NEXT_PUBLIC_ENV_TYPE=PROD

# Backend API URLs
DEV_BACKEND_URL=http://localhost:5001/api/v1
PROD_BACKEND_URL=https://ac696aa48306.ngrok-free.app/api/v1
NEXT_PUBLIC_BACKEND_URL=https://ac696aa48306.ngrok-free.app/api/v1
```

## How the getBaseUrl() function works:

1. **Client-side (browser)**: Uses `NEXT_PUBLIC_*` variables
2. **Server-side**: Uses regular environment variables
3. **Logic**:
   - If `NEXT_PUBLIC_ENV_TYPE=PROD` → uses `NEXT_PUBLIC_BACKEND_URL` or `PROD_BACKEND_URL`
   - Otherwise → uses `DEV_BACKEND_URL`

## Usage:

The function is automatically used in `api.ts`:

```typescript
import { getBaseUrl } from './config'

// This will return the correct URL based on your .env.local
const API_BASE_URL = getBaseUrl()
```

## Environment Variables Priority:

1. `NEXT_PUBLIC_ENV_TYPE=PROD` + `NEXT_PUBLIC_BACKEND_URL` (browser)
2. `ENV_TYPE=PROD` + `PROD_BACKEND_URL` (server)
3. `DEV_BACKEND_URL` (fallback)
4. `http://localhost:5001/api/v1` (default fallback)
