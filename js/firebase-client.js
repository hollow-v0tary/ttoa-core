import { firebaseConfig, firebaseIsConfigured } from './firebase-config.js';

let cachedClient;

// Only loads Firebase from the official CDN after the public config is entered.
// Works on static hosting (GitHub Pages), no npm/build step required.
export function getFirebaseClient() {
  if (!firebaseIsConfigured) {
    return Promise.reject(new Error('Firebase ещё не настроен. Заполни файл js/firebase-config.js по инструкции FIREBASE_SETUP.md.'));
  }
  if (!cachedClient) {
    cachedClient = Promise.all([
      import('https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js')
    ]).then(([appSdk, authSdk, firestoreSdk]) => {
      const app = appSdk.initializeApp(firebaseConfig);
      return { app, auth: authSdk.getAuth(app), db: firestoreSdk.getFirestore(app), authSdk, firestoreSdk };
    }).catch(error => {
      cachedClient = null;
      throw error;
    });
  }
  return cachedClient;
}
