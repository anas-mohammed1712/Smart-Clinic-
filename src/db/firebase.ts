import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDrVmQCJn4f6QTTkWTalEeow2WNd4Fax0E",
  authDomain: "smartclinic-3f4fd.firebaseapp.com",
  projectId: "smartclinic-3f4fd",
  storageBucket: "smartclinic-3f4fd.firebasestorage.app",
  messagingSenderId: "1067488641997",
  appId: "1:1067488641997:web:8bd8d9c655d00d38627a84"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(app);
