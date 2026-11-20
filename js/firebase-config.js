/**
 * THAOS web app — public Firebase configuration.
 * These values identify the Firebase project; they are not admin credentials.
 * Do not put service-account secrets or passwords in frontend files.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBv_056vmm87dNfwV9rkDGybQxy0MIix5c",
  authDomain: "thaos-beca8.firebaseapp.com",
  projectId: "thaos-beca8",
  storageBucket: "thaos-beca8.firebasestorage.app",
  messagingSenderId: "333406785680",
  appId: "1:333406785680:web:5d85a90d1a1c6d4df44815",
  measurementId: "G-HLMP41D6H5"
};

export const firebaseIsConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId
].every(value => typeof value === 'string' && value.length >= 8 && !value.startsWith('PASTE_'));
