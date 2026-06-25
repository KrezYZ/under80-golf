import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD-PLACEHOLDER',
  authDomain: 'under80-golf.firebaseapp.com',
  projectId: 'under80-golf',
  storageBucket: 'under80-golf.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxxxxxxxxxx',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export function isFirebaseConfigured(): boolean {
  return !firebaseConfig.apiKey.includes('PLACEHOLDER');
}

export const ADMIN_EMAILS = [
  'yuan_cristina@hotmail.com',
  'yylou785@gmail.com',
];
