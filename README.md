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
- 🗑️ **Auto-deletion**: Reports removed from server after 1 hour, from device after 1 week
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

Edit `.env.local` with your Firebase credentials:

```env
# Firebase Web Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BN4bX... (from step 4 above)

# Generate secure keys (run: openssl rand -hex 32)
NEXT_PUBLIC_API_KEY=your_32_character_hex_key
API_SECRET_KEY=same_as_next_public_api_key_above
CRON_SECRET=another_32_character_hex_key

# For production (optional for development)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
ALLOWED_ORIGIN=http://localhost:3000
```

### 4. Firebase Admin SDK (Optional for Development)

For local development, the app will work without the Admin SDK for notifications. For full functionality:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content and add to `.env.local`:

```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

**Note:** For development, you can skip this and notifications will be simulated client-side.

### 5. Firestore Security Rules

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

### 6. Firestore Indexes

Firestore will prompt you to create indexes when you first query. Alternatively, create them manually:

1. Go to Firestore Console → Indexes
2. Create composite index for `messages`:
   - Collection ID: `messages`
   - Fields: `geohash` (Ascending), `expiresAt` (Ascending)
3. Create composite index for `devices`:
   - Collection ID: `devices`
   - Fields: `geohash` (Ascending), `updatedAt` (Ascending)

### 7. Run Development Server

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

All 93 tests cover:
- Component rendering and interactions
- API routes and error handling
- Service integrations (Firebase, IndexedDB)
- Hooks and state management
- Geolocation and messaging

---

## 🌐 Internationalization (i18n)

Defroster supports multiple languages with automatic browser detection:

### Current Languages
- 🇺🇸 **English** (default)
- 🇪🇸 **Spanish** (español)

### Adding New Languages

1. Create a new translation file (e.g., `lib/i18n/fr.json`)
2. Copy the structure from `lib/i18n/en.json`
3. Translate all strings
4. Add the language to `lib/i18n/i18n.ts`:

```typescript
import fr from './fr.json';

const translations: Record<Language, TranslationKeys> = {
  en,
  es,
  fr, // Add your language
};

export function getBrowserLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('fr')) return 'fr'; // Add detection
  return 'en';
}
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
- **Maps**: Leaflet with OpenStreetMap
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
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main app page
│   └── globals.css             # Global styles
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
✅ **API Key Validation**: All API routes require valid key
✅ **CORS Protection**: Configurable allowed origins
✅ **Input Validation**: All user inputs validated
✅ **Rate Limiting**: Recommended for production (see below)
✅ **No XSS Vulnerabilities**: React sanitizes all inputs
✅ **HTTPS Only**: Enforced in production

### Recommended Production Hardening

1. **Rate Limiting**:
   ```typescript
   // Add to API routes
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

2. **Environment Variables**:
   - Never commit `.env.local`
   - Use secrets management (Vercel Secrets, AWS Secrets Manager, etc.)
   - Rotate API keys and cron secrets regularly

3. **Monitoring**:
   - Set up error tracking (Sentry, LogRocket, etc.)
   - Monitor Firestore usage and costs
   - Set up alerts for unusual activity

4. **Firestore Security**:
   - Review and test security rules regularly
   - Enable audit logging
   - Set up billing alerts

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
- ✅ Check console for Leaflet errors
- ✅ Verify location permissions granted
- ✅ Check network tab for tile loading errors

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
- Maps powered by [Leaflet](https://leafletjs.com/) and [OpenStreetMap](https://www.openstreetmap.org/)
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
