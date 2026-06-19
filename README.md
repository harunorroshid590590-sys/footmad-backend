# FOOTFY Backend

Premium Sports Live Streaming Platform Backend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/footfy
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

3. Start MongoDB

4. Run the server:
```bash
npm run dev
```

## Default Admin Credentials

- Username: `admin`
- Password: `admin123`

⚠️ **Important**: Change the default password after first login!

## API Endpoints

### Authentication
- POST `/api/auth/login` - Admin login
- POST `/api/auth/create-admin` - Create new admin user
- GET `/api/auth/verify` - Verify token

### Matches
- GET `/api/matches` - Get all matches
- GET `/api/matches/live` - Get live matches
- GET `/api/matches/upcoming` - Get upcoming matches
- GET `/api/matches/category/:category` - Get matches by category
- GET `/api/matches/:id` - Get match by ID
- POST `/api/matches` - Create match (Admin)
- PUT `/api/matches/:id` - Update match (Admin)
- DELETE `/api/matches/:id` - Delete match (Admin)
- PATCH `/api/matches/:id/pin` - Toggle pin (Admin)
- PATCH `/api/matches/:id/feature` - Toggle feature (Admin)

### Streams
- GET `/api/streams` - Get all streams
- GET `/api/streams/:id` - Get stream by ID
- POST `/api/streams` - Create stream (Admin)
- PUT `/api/streams/:id` - Update stream (Admin)
- DELETE `/api/streams/:id` - Delete stream (Admin)
- PATCH `/api/streams/:id/toggle` - Toggle stream active (Admin)

### Admin
- GET `/api/admin/stats` - Get dashboard stats
- GET `/api/admin/matches` - Get all matches (Admin)
- GET `/api/admin/streams` - Get all streams (Admin)
- GET `/api/admin/categories` - Get all categories (Admin)
- GET `/api/admin/settings` - Get settings (Admin)
- POST `/api/admin/settings` - Update settings (Admin)
- POST `/api/admin/sync` - Sync with external API (Admin)
- POST `/api/admin/initialize-categories` - Initialize categories (Admin)

### Proxy
- GET `/proxy/stream/:streamId` - Proxy stream by ID
- GET `/proxy/direct?url=` - Direct proxy with URL

## Features

- JWT Authentication
- Match Management
- Stream Management
- DRM Support (ClearKey, Widevine)
- Stream Proxy for protected streams
- External API Integration
- Admin Dashboard
