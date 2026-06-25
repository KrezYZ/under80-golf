import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config — populated from Firebase Console after project creation
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

// Admin email list — these users can add/edit/delete data
export const ADMIN_EMAILS = [
  'yuan_cristina@hotmail.com',
  'yylou785@gmail.com',
];
