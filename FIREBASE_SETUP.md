# Firebase setup for Al Raed Sports

## 1) Create a Firebase project

1. Open https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: "Al Raed Sports"
4. Continue and finish setup

## 2) Enable Google login

1. In the Firebase console, open "Authentication"
2. Click "Get started"
3. Select the "Sign-in method" tab
4. Enable "Google"
5. Click "Save"

## 3) Add a web app

1. In the Firebase console, click the gear icon next to "Project overview"
2. Choose "Project settings"
3. Scroll to "Your apps"
4. Click the web icon (`</>`) to add a web app
5. Register the app
6. Copy values like:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId

## 4) Add env values to the project

Create a file named `.env.local` in the project root and paste:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Do not commit `.env.local` to Git. It is already ignored by `.gitignore`.

## 5) Restart the app

```bash
npm run dev
```

## 6) Test sign in

1. Open the website
2. Click Add to Bag as a guest
3. Click Continue with Google
4. Sign in with your Google account
5. Confirm the product is added to the cart

## 7) Important

The Firebase config is public by design because it is used in the browser. This is normal for Firebase web apps.

The real secret part is the Firebase project itself, not the values in the frontend.
