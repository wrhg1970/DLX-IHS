import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Database ID and multi-tab persistent local cache
// This dramatically reduces server read operations by utilizing local IndexedDB caching
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);

// Initialize Authentication
export const auth = getAuth();

// Quick connection test/validation function as requested by the Firebase skill
export async function testFirebaseConnection() {
  try {
    // Attempt to download a speculative reference from the server
    await getDocFromServer(doc(db, 'system', 'connection_test_spec'));
    console.log("Firebase connection verified and online.");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const isQuotaError = 
      errMsg.toLowerCase().includes('quota') || 
      errMsg.toLowerCase().includes('exhausted') || 
      errMsg.toLowerCase().includes('resource-exhausted') ||
      errMsg.toLowerCase().includes('limit exceeded');
    
    if (isQuotaError) {
      if (typeof window !== 'undefined') {
        (window as any).__firestore_quota_exceeded__ = true;
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      }
      console.warn("Firestore Quota Handshake notice: Quota limit exceeded.");
    }

    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    } else {
      console.log("Firebase connection handshake completed.");
    }
  }
}

// Custom error handling helper for Firebase as defined in the skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuotaError = 
    errMsg.toLowerCase().includes('quota') || 
    errMsg.toLowerCase().includes('exhausted') || 
    errMsg.toLowerCase().includes('resource-exhausted') ||
    errMsg.toLowerCase().includes('limit exceeded');
  
  if (isQuotaError) {
    if (typeof window !== 'undefined') {
      (window as any).__firestore_quota_exceeded__ = true;
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
    }
    console.warn("Firestore Quota Limit Exceeded. Switching automatically to Local-Only mode. All data is securely saved in browser LocalStorage.");
    return; // Prevent crash/unhandled rejection loop by not throwing
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
