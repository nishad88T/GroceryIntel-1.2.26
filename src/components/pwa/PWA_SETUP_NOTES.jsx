# PWA Configuration Notes

## What Has Been Implemented

1. **ShareTarget Page** (`pages/ShareTarget.jsx`)
   - Handles incoming shared content (URLs for recipes, files for receipts)
   - Checks user authentication
   - Routes to appropriate backend handler
   - Shows success/error feedback

2. **Backend Handler** (`functions/handleSharedContent`)
   - Accepts shared recipes (URLs) and receipts (images)
   - Uses existing `parseRecipe` function for recipe URLs
   - Creates receipt records and triggers background OCR processing
   - Logs credits and updates scan counts

3. **PWA Install Banner** (`components/pwa/PWAInstallBanner.jsx`)
   - Auto-detects iOS vs Android/Chrome
   - Shows install prompt after 2 visits on iOS
   - Uses native `beforeinstallprompt` on Chrome/Android
   - Remembers dismissal for 7 days

4. **Notification Manager** (`components/pwa/NotificationManager.jsx`)
   - Manages push notification permissions
   - Provides local notification utilities
   - Integrated into Settings page

---

## Platform Configuration Required (Outside Base44)

### 1. manifest.json Configuration

Add the following to your PWA manifest (this is typically managed at the platform level):

```json
{
  "name": "GroceryIntel",
  "short_name": "GroceryIntel",
  "description": "Smart grocery tracking and analytics",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "share_target": {
    "action": "/ShareTarget",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

**Note:** For file sharing (receipts), the share_target would need:
```json
{
  "share_target": {
    "action": "/ShareTarget",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "files",
          "accept": ["image/*", "application/pdf"]
        }
      ]
    }
  }
}
```

### 2. Service Worker Configuration

A service worker is needed to:
- Handle the POST share target (for files)
- Enable offline caching
- Handle push notifications

Basic service worker example:
```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  // Handle share target POST requests
  if (event.request.method === 'POST' && 
      event.request.url.includes('/ShareTarget')) {
    event.respondWith(handleShareTarget(event.request));
    return;
  }
  
  // Normal fetch handling with cache
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

async function handleShareTarget(request) {
  const formData = await request.formData();
  const files = formData.getAll('files');
  
  // Store files in IndexedDB or sessionStorage for the page to retrieve
  // Then redirect to the ShareTarget page
  
  return Response.redirect('/ShareTarget', 303);
}

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'GroceryIntel', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png'
    })
  );
});
```

### 3. VAPID Keys for Push Notifications

To enable server-sent push notifications:
1. Generate VAPID keys (can use web-push library)
2. Store public key in frontend
3. Store private key as a secret (`VAPID_PRIVATE_KEY`)
4. Update `NotificationManager.jsx` with actual public key

---

## How It Works

### Recipe Sharing Flow
1. User taps "Share" on a recipe page in their browser
2. Selects "GroceryIntel" from share sheet
3. Browser opens `/ShareTarget?url=...`
4. ShareTarget page calls `handleSharedContent` function
5. Function uses `parseRecipe` to extract and save recipe
6. User sees success message with link to their recipes

### Receipt Sharing Flow
1. User shares a receipt image from their camera/gallery
2. PWA receives file via share target
3. Service worker stores file data temporarily
4. ShareTarget page uploads files to Base44 storage
5. Calls `handleSharedContent` to trigger OCR processing
6. User sees success message, receipt processes in background

---

## Testing

1. **Install as PWA**: Visit app in Chrome/Safari, look for install prompt
2. **Share a URL**: Open a recipe page, tap Share, select GroceryIntel
3. **Share an image**: Select receipt photo, tap Share, select GroceryIntel
4. **Notifications**: Go to Settings > Notifications > Enable

---

## Known Limitations

- File sharing (POST method) requires service worker configuration at platform level
- iOS notifications only work when PWA is installed to Home Screen
- VAPID keys need to be generated and configured for push notifications