# Defroster

**An anonymous, open-source community safety platform for real-time ICE, Army, and Police sighting alerts.**

Defroster is a Progressive Web App (PWA) that empowers communities to stay informed and connected through anonymous, location-based safety alerts. Users can report sightings with a single tap, and nearby community members receive instant notifications—all while maintaining complete privacy and anonymity.

---

## 🌟 About This Project

Defroster was created in response to the October 2, 2024 federal raid on a South Shore Drive apartment building in Chicago, where families were forcibly removed from their homes during a multi-agency operation involving Border Patrol, the FBI, and the ATF.

**This is open-source software.** We encourage anyone to use, modify, and adapt this codebase to create similar platforms tailored to their own community's needs. Whether you're organizing mutual aid networks, neighborhood watch programs, or other community safety initiatives, this platform provides the foundation you need.

---

## ✨ Key Features

### Privacy & Anonymity
- 🔒 **No personal data stored** - ever
- 📍 **Location randomization** to nearest city block (~250 feet / ~76 meters)
- 🔐 **Anonymous device IDs** using UUID v4
- 🗑️ **Auto-deletion**: Reports removed from server after 1 day, from device after 1 week
- 🚫 **No user accounts or authentication required**

### Real-Time Alerts
- 📱 **Push notifications** for sightings within 5 miles
- 🗺️ **Interactive map** with age-based opacity (older reports fade)
- 📊 **List view** of nearby sightings with timestamps
- ⚡ **Instant reporting** - one tap to alert your community

### Technology
- 🌐 **Progressive Web App (PWA)** - installable on any device
- 🌍 **Multilingual** - English & Spanish with automatic browser detection
- 📴 **Offline-capable** with IndexedDB caching
- 🔄 **Real-time synchronization** via Firebase Cloud Messaging
- 🎨 **Modern UI** with Tailwind CSS and responsive design

### Developer-Friendly
- 🏗️ **Modular architecture** with abstraction layers
- 🔌 **Easy provider switching** (Firebase → MongoDB, PostgreSQL, etc.)
- 🧪 **Comprehensive test coverage** (93 tests passing)
- 📝 **TypeScript** for type safety
- 🎯 **Clean code** with ESLint and best practices

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- A Firebase account (free tier works)
- Basic knowledge of Next.js and React

### 1. Clone and Install

```bash
git clone https://github.com/erichchampion/defroster.git
cd defroster
npm install
```

### 2. Firebase Project Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database**:
   - Go to Project Settings → Build → Firestore Database → Create Database
   - Start in **production mode**
3. Enable **Cloud Messaging**:
   - Go to Project Settings → Cloud Messaging
   - Enable Cloud Messaging API
4. Generate **Web Push Certificate**:
   - In Cloud Messaging settings, scroll to "Web Push certificates"
   - Click "Generate key pair"
   - Save the VAPID key
5. Get **Web App Configuration**:
   - Go to Project Settings → General
   - Under "Your apps", click "Web" (</> icon)
   - Register your app and copy the config

### 3. Environment Configuration

Create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase and map tile credentials:

```bash
# Firebase Web Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BN4bX... (from step 4 above)

# CARTO Basemaps tile API key (REQUIRED for map tiles)
# Free for non-commercial use: https://carto.com/basemaps/apikey
NEXT_PUBLIC_CARTO_BASEMAPS_KEY=your_carto_basemaps_key_here

# Base URL for origin validation (REQUIRED)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Generate secure CRON secret (run: openssl rand -hex 32)
CRON_SECRET=your_64_character_hex_key

# Upstash Redis for distributed rate limiting (optional for development, required for production)
# UPSTASH_REDIS_REST_URL=https://...upstash.io
# UPSTASH_REDIS_REST_TOKEN=...

# For production (optional for development)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### 4. Upstash Redis Setup (Required for Production)

For distributed rate limiting across serverless instances:

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database (free tier available)
3. Click on your database to view details
4. Copy the **REST API** credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. Add these to your `.env.local` file

**Why Upstash Redis is required:**
- In-memory rate limiting doesn't work in serverless (Vercel, AWS Lambda)
- Each serverless instance would have separate counters
- Attackers could bypass rate limits by hitting different instances
- Upstash Redis provides shared state across all instances

**Development note:** The app will run without Upstash Redis (rate limiting disabled), but you'll see warnings. This is acceptable for local development.

**Pricing:** Upstash offers a generous free tier with 10,000 commands per day.

### 5. Firebase Admin SDK (Optional for Development)

For local development, the app will work without the Admin SDK for notifications. For full functionality:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content and add to `.env.local`:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

**Note:** For development, you can skip this and notifications will be simulated client-side.

### 6. Firestore Security Rules

Deploy the security rules:

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (select existing project)
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules
```

The `firestore.rules` file is already configured with secure rules:
- ✅ Messages: Public read, server-write only
- ✅ Devices: No client access (Admin SDK only)

### 7. Firestore Indexes

Firestore will prompt you to create indexes when you first query. Alternatively, create them manually:

1. Go to Firestore Console → Indexes
2. Create composite index for `messages`:
   - Collection ID: `messages`
   - Fields: `geohash` (Ascending), `expiresAt` (Ascending)
3. Create composite index for `devices`:
   - Collection ID: `devices`
   - Fields: `geohash` (Ascending), `updatedAt` (Ascending)

### 8. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and grant location permissions.

---

## 🏗️ Production Deployment

### Option 1: Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial Defroster setup"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click "New Project" and import your repository
   - Add all environment variables from `.env.local`
   - Make sure `NEXT_PUBLIC_CARTO_BASEMAPS_KEY` is included (required for map tiles)
   - Click "Deploy"

3. **Configure Custom Domain** (Optional):
   - In Vercel project settings → Domains
   - Add your custom domain
   - Update `ALLOWED_ORIGIN` in environment variables

4. **Set Up Automated Cleanup** (Optional but recommended):
   (Now configured through the vercel.json file)
   - In Vercel project → Settings → Cron Jobs
   - Create a new cron job:
     - Path: `/api/cleanup-messages`
     - Schedule: `0 * * * *` (hourly)
     - Add custom header: `x-cron-secret: your_cron_secret`

Make sure to add NEXT_PUBLIC_BASE_URL to your Vercel environment variables with the 
actual deployment URL (e.g., https://your-app.vercel.app).

### Option 2: Firebase Hosting + Cloud Functions

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Deploy Cloud Functions** (for cleanup):
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```

3. **Deploy hosting**:
   ```bash
   firebase deploy --only hosting
   ```

### Option 3: Self-Hosted (VPS/Docker)

1. **Build**:
   ```bash
   npm run build
   ```

2. **Run production server**:
   ```bash
   npm start
   ```

3. **Use PM2 for process management**:
   ```bash
   npm install -g pm2
   pm2 start npm --name "defroster" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx reverse proxy**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Get SSL certificate**:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

---

## 🧪 Testing

Run the full test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

All 128 tests cover:
- Component rendering and interactions
- API routes and error handling
- Service integrations (Firebase, IndexedDB)
- Hooks and state management
- Geolocation and messaging

### Generate API Documentation

Generate TypeDoc API documentation:

```bash
npm run docs
```

This generates comprehensive API documentation from TypeScript/JSDoc comments into `docs/api/`.
The documentation covers all abstractions, services, contexts, hooks, and utilities.

View the generated documentation by opening `docs/api/index.html` in your browser.

---

## 🌐 Internationalization (i18n)

Defroster supports multiple languages with **SEO-friendly, server-side rendered** locale routes:

### URL Structure
- `/` → Redirects to `/en-us` (default) or `/es-us` (Spanish browsers)
- `/en-us` → English version (server-rendered, crawlable)
- `/es-us` → Spanish version (server-rendered, crawlable)

### Current Languages
- 🇺🇸 **English** (default) - `/en-us`
- 🇪🇸 **Spanish** (español) - `/es-us`

### How It Works

**Middleware** (`middleware.ts`) detects browser language from the `Accept-Language` header and redirects to the appropriate locale. Each locale has:
- ✅ Server-side rendered metadata (title, description, Open Graph, Twitter cards)
- ✅ Proper `<html lang="en">` or `<html lang="es">` attributes
- ✅ Localized content from `lib/i18n/en.json` or `lib/i18n/es.json`
- ✅ SEO-friendly URLs for better search engine indexing

**Example**:
```bash
# English browser → redirects to /en-us
curl -H "Accept-Language: en-US" https://defroster.us/

# Spanish browser → redirects to /es-us
curl -H "Accept-Language: es-MX" https://defroster.us/
```

### Adding New Languages

1. **Update i18n utilities** (`lib/i18n/i18n.ts`):
```typescript
export type Locale = 'en-us' | 'es-us' | 'fr-us';  // Add new locale
export const locales: Locale[] = ['en-us', 'es-us', 'fr-us'];
```

2. **Create translation file** (`lib/i18n/fr.json`):
```json
{
  "app": {
    "name": "Defroster",
    "title": "Defroster - Signaler les Observations"
  }
  // ... copy structure from en.json and translate
}
```

3. **Update middleware** (`middleware.ts`):
```typescript
function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language');
  // ... existing code ...

  for (const lang of languages) {
    if (lang.code.startsWith('es')) return 'es-us';
    if (lang.code.startsWith('fr')) return 'fr-us';  // Add detection
  }

  return 'en-us';
}
```

4. **Build and test**:
```bash
npm run build
npm start
curl -H "Accept-Language: fr-FR" http://localhost:3000/
```

---

## 📱 Installing as PWA

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Install app" or "Add to Home Screen"

### Desktop (Chrome/Edge)
1. Look for the install icon (⊕) in the address bar
2. Click to install
3. App opens in its own window

---

## 🏛️ Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: Firebase Firestore with geohash indexing
- **Messaging**: Firebase Cloud Messaging (FCM)
- **Maps**: MapLibre GL with CARTO Positron vector basemaps (OpenStreetMap data)
- **Caching**: IndexedDB (Dexie.js abstraction)
- **Geospatial**: geofire-common for efficient radius queries

### Key Design Decisions

#### 1. Privacy by Design
- **No sender location tracking**: Only sighting location is stored
- **Geohash precision**: 7 characters (~76m) balances utility and privacy
- **Device IDs**: UUID v4 instead of FCM tokens for anonymity
- **No authentication**: Reduces data collection and barriers to use

#### 2. Abstraction Layers

The codebase uses interfaces to allow easy provider switching:

**IMessagingService** (`lib/abstractions/messaging-service.ts`)
- Current: Firebase Cloud Messaging
- Swap with: OneSignal, Pusher, custom WebSocket, etc.

**IDataService** (`lib/abstractions/data-service.ts`)
- Current: Firebase Firestore
- Swap with: MongoDB, PostgreSQL+PostGIS, Supabase, etc.

**IStorageService** (`lib/abstractions/storage-service.ts`)
- Current: IndexedDB
- Swap with: LocalStorage, AsyncStorage, etc.

#### 3. Client-First Architecture
- Messages cached locally in IndexedDB
- Works offline with cached data
- Optimistic UI updates
- Background sync when connection returns

### Project Structure

```
defroster/
├── app/
│   ├── [locale]/               # Localized routes (SSR)
│   │   ├── layout.tsx          # Locale-specific layout with i18n metadata
│   │   └── page.tsx            # Main app page (client component)
│   ├── api/                    # API routes (serverless functions)
│   │   ├── cleanup-messages/   # Cron job for message cleanup
│   │   ├── get-messages/       # Fetch nearby messages
│   │   ├── register-device/    # Register for notifications
│   │   └── send-message/       # Create new sighting report
│   ├── components/             # React components
│   │   ├── LocationPermission.tsx
│   │   ├── MessageForm.tsx
│   │   ├── MessageList.tsx
│   │   └── SightingMap.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useGeolocation.ts
│   │   └── useMessaging.ts
│   ├── ClientProviders.tsx     # Client-side context providers
│   ├── layout.tsx              # Root layout (minimal)
│   └── globals.css             # Global styles
├── middleware.ts               # Locale detection & redirection
├── lib/
│   ├── abstractions/           # Service interfaces
│   │   ├── data-service.ts
│   │   ├── messaging-service.ts
│   │   └── storage-service.ts
│   ├── constants/              # App constants
│   │   ├── app.ts
│   │   └── colors.ts
│   ├── contexts/               # React contexts
│   │   ├── I18nContext.tsx
│   │   └── ServicesContext.tsx
│   ├── firebase/               # Firebase configuration
│   │   ├── admin.ts
│   │   └── config.ts
│   ├── i18n/                   # Internationalization
│   │   ├── en.json
│   │   ├── es.json
│   │   └── i18n.ts
│   ├── services/               # Service implementations
│   │   ├── fcm-messaging-service.ts
│   │   ├── firestore-data-service.ts
│   │   └── indexeddb-storage-service.ts
│   ├── types/                  # TypeScript types
│   │   └── message.ts
│   └── utils/                  # Utility functions
│       ├── geohash.ts
│       ├── register-sw.ts
│       ├── time-formatter.ts
│       └── time-formatter-i18n.ts
├── public/
│   ├── appicon/                # PWA icons (all sizes)
│   ├── firebase-messaging-sw.js # Service worker
│   └── manifest.json           # PWA manifest
├── functions/                  # Firebase Cloud Functions
│   └── src/
│       └── cleanup.ts          # Scheduled cleanup function
├── __tests__/                  # Jest tests
├── firestore.rules             # Firestore security rules
├── firebase.json               # Firebase configuration
└── package.json
```

---

## 🔒 Security & Privacy

### Current Security Features

✅ **Firestore Security Rules**: Server-write only for messages and devices
✅ **Origin Validation (BFF Pattern)**: API routes validate request origin using NEXT_PUBLIC_BASE_URL
✅ **CORS Protection**: Strict origin enforcement
✅ **Input Validation**: All user inputs validated with type checking and range limits
✅ **Distributed Rate Limiting**: Upstash Redis-based rate limiting (5/min sends, 3/min registrations, 20/min reads)
✅ **Timing Attack Protection**: Constant-time comparison for CRON secrets
✅ **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, HSTS
✅ **No XSS Vulnerabilities**: React sanitizes all inputs
✅ **HTTPS Only**: Enforced in production
✅ **Environment Validation**: Startup checks for required configuration

### Security Architecture: BFF Pattern

This app uses the **Backend-for-Frontend (BFF)** pattern for security:

- **Client** makes requests without exposed API keys
- **Next.js API Routes** validate the request origin matches `NEXT_PUBLIC_BASE_URL`
- **Server-side secrets** (CRON_SECRET, Firebase Admin SDK) never exposed to clients

This prevents the critical vulnerability where API keys are embedded in client JavaScript.

### Important Production Considerations

#### 1. **Distributed Rate Limiting with Upstash Redis**

✅ **Now implemented** using Upstash Redis for serverless-friendly rate limiting:
- Works across multiple serverless instances on Vercel
- Persists between deployments
- Shared state across all instances
- Automatic cleanup via Redis TTL
- Simple configuration with REST API

**Setup required:**
1. Create account at [Upstash Console](https://console.upstash.com/)
2. Create a Redis database
3. Copy REST API credentials to environment variables
4. See [Setup section](#4-upstash-redis-setup-required-for-production) above

**How it works:**
```typescript
// Rate limiting uses Upstash Redis REST API
import { Redis } from '@upstash/redis';

const count = await redis.incr(`ratelimit:${clientId}`);
if (count === 1) {
  await redis.expire(key, windowSeconds);
}
```

**Fallback behavior:** If Upstash Redis is not configured, rate limiting is disabled (with warnings). This allows development without Redis, but **production deployments should always configure Upstash Redis**.

#### 2. **Environment Variables**

- Never commit `.env.local` to version control
- Use secrets management (Vercel Environment Variables, AWS Secrets Manager, etc.)
- Rotate CRON_SECRET regularly (recommended: quarterly)
- Ensure `NEXT_PUBLIC_BASE_URL` matches your production domain exactly
- **Required for production:** Configure Upstash Redis for distributed rate limiting

#### 3. **Monitoring & Alerting**

Set up monitoring for:
- Unusual spike in API requests (potential abuse)
- 403 errors (origin validation failures)
- 429 errors (rate limit hits)
- Firestore quota usage
- Failed notification deliveries

Recommended tools:
- Error tracking: Sentry, LogRocket
- Uptime monitoring: Better Uptime, UptimeRobot
- Firestore alerts: Firebase Console → Usage and billing

#### 4. **Firestore Security**

- Security rules are already configured (see `firestore.rules`)
- Review rules regularly, especially if modifying data structure
- Enable audit logging in Firebase Console
- Set up billing alerts to prevent unexpected costs
- Consider Firestore backup strategy for disaster recovery

---

## 🔄 Switching Providers

Thanks to abstraction layers, you can easily swap providers without changing business logic.

### Example: Switch to MongoDB

1. **Create MongoDB implementation**:

```typescript
// lib/services/mongodb-data-service.ts
import { IDataService } from '@/lib/abstractions/data-service';

export class MongoDBDataService implements IDataService {
  async saveMessage(message: Message): Promise<void> {
    // MongoDB implementation
  }

  async getNearbyMessages(location: GeoLocation, radius: number): Promise<Message[]> {
    // Use MongoDB geospatial queries
  }

  // ... implement all interface methods
}
```

2. **Update context**:

```typescript
// lib/contexts/ServicesContext.tsx
import { MongoDBDataService } from '@/lib/services/mongodb-data-service';

const dataService = new MongoDBDataService();
```

That's it! No changes needed in components or hooks.

---

## 🤝 Adapting for Your Community

This platform is designed to be easily customized for different use cases:

### Suggested Modifications

1. **Change Sighting Types**:
   - Edit `lib/types/message.ts` to change from ICE/Army/Police to your needs
   - Update `lib/constants/colors.ts` for custom colors and emojis
   - Modify `lib/i18n/en.json` and `lib/i18n/es.json` for new labels

2. **Adjust Radius**:
   - Edit `lib/constants/app.ts` to change default radius
   - Update privacy notices in translation files

3. **Custom Branding**:
   - Replace icons in `public/appicon/`
   - Update `public/manifest.json` with new name and description
   - Modify `app/layout.tsx` metadata

4. **Add Features**:
   - Photos/videos of sightings
   - Severity levels
   - Custom tags or categories
   - Direct messaging
   - Community forums

### Example Use Cases

- 🏥 **Healthcare Access**: Report medication availability, clinic wait times
- 🚨 **Emergency Response**: Community-organized disaster response
- 🌆 **Neighborhood Watch**: Report suspicious activity
- 🚧 **Infrastructure Issues**: Potholes, broken streetlights, flooding
- 🏛️ **Civic Engagement**: Protest locations, voter registration drives
- 🍲 **Mutual Aid**: Food distribution, supply sharing

---

## 📊 Performance & Scalability

### Current Performance

- ⚡ **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- 📦 **Bundle Size**: ~188 kB First Load JS
- 🚀 **Time to Interactive**: < 2s on 4G
- 📱 **Mobile Optimized**: Responsive design, touch-friendly

### Scaling Considerations

**Up to 10,000 users:**
- ✅ Firebase free tier sufficient
- ✅ No changes needed

**10,000 - 100,000 users:**
- 💡 Upgrade to Firebase Blaze plan
- 💡 Add CDN (Vercel, Cloudflare)
- 💡 Implement caching strategy

**100,000+ users:**
- 🔧 Consider database sharding by region
- 🔧 Move to dedicated infrastructure
- 🔧 Implement advanced caching (Redis)
- 🔧 Use load balancer

---

## 🐛 Troubleshooting

### "Permission denied" for location
- **iOS Safari**: Settings → Safari → Location → While Using the App
- **Android Chrome**: Settings → Site Settings → Location → Allow

### Push notifications not working
- ✅ Check VAPID key is correct in `.env.local`
- ✅ Verify Firebase Cloud Messaging is enabled
- ✅ Check browser supports notifications (not all do)
- ✅ Ensure HTTPS in production (required for service workers)

### Map not displaying
- ✅ Blank or grey map? CARTO basemaps require a (free) API key since September 2026. Request one at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey), set `NEXT_PUBLIC_CARTO_BASEMAPS_KEY`, and redeploy. Hard-refresh after adding the key — style and tile responses are cached by the browser.
- ✅ Check console for MapLibre errors
- ✅ Verify location permissions granted
- ✅ Check network tab for style/tile requests to `basemaps.cartocdn.com`

### Build errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

**You are free to:**
- ✅ Use this code for any purpose (commercial or non-commercial)
- ✅ Modify and adapt it to your needs
- ✅ Distribute copies
- ✅ Sublicense

**Under the condition that:**
- 📝 You include the original license and copyright notice

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Maps powered by [MapLibre GL JS](https://maplibre.org/), [CARTO Basemaps](https://carto.com/basemaps/), and [OpenStreetMap](https://www.openstreetmap.org/)
- Icons from [Heroicons](https://heroicons.com/)
- Geospatial queries via [geofire-common](https://github.com/firebase/geofire-js)

---

## 📞 Support & Contributing

### Getting Help
- 📖 Check this README first
- 🐛 Search existing [GitHub Issues](https://github.com/erichchampion/defroster/issues)
- 💬 Open a new issue for bugs or feature requests

### Contributing
We welcome contributions! Whether it's:
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🌍 Translations
- 🎨 UI/UX enhancements

**To contribute:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🌍 Make It Your Own

This is your platform now. Whether you're organizing community safety networks, mutual aid programs, or something entirely new - we're excited to see what you build.

**Need help adapting Defroster for your community?** Open an issue and we'll do our best to help.

**Built something amazing with this code?** Share it! We'd love to see how communities are using this platform.

---

**Stay safe. Stay connected. Stay anonymous.**

*Defroster - Built by the community, for the community.*
