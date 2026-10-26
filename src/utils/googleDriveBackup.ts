import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime: string;
  webViewLink?: string;
  description?: string;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  destination: 'google_drive' | 'cloud_and_local' | 'local_only';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: string; // 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  timeOfDay: string; // '02:00'
  retentionCount: number;
  lastBackupDate?: string;
  lastBackupStatus?: 'success' | 'failed' | 'in_progress';
  lastBackupError?: string;
  lastBackupSize?: string;
  lastBackupFileName?: string;
  lastBackupDriveLink?: string;
  connectedEmail?: string;
}

export const DEFAULT_BACKUP_SCHEDULE: BackupScheduleConfig = {
  enabled: true,
  destination: 'google_drive',
  frequency: 'weekly',
  dayOfWeek: 'Domingo',
  timeOfDay: '23:00',
  retentionCount: 10
};

// In-memory token cache (per Least Privilege and Security guidelines, do NOT save tokens in localStorage)
let inMemoryAccessToken: string | null = null;
let isSigningInWithDrive = false;

// Provider configured with Google Drive file scope
const driveProvider = new GoogleAuthProvider();
driveProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Read saved connection indicator (without secret tokens)
export function getSavedConnectedDriveEmail(): string | null {
  try {
    return localStorage.getItem('google_drive_connected_email');
  } catch {
    return null;
  }
}

export function isGoogleDriveTokenAvailable(): boolean {
  return Boolean(inMemoryAccessToken);
}

// Connect Google Drive via popup to obtain OAuth token
export async function connectGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningInWithDrive = true;
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("No se pudo obtener el token de acceso de Google Drive.");
    }

    inMemoryAccessToken = credential.accessToken;
    const userEmail = result.user.email || "";

    try {
      localStorage.setItem('google_drive_connected_email', userEmail);
      localStorage.setItem('google_drive_connected_at', new Date().toISOString());
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('google-drive-auth-changed', {
        detail: { connected: true, email: userEmail }
      }));
    }

    return { user: result.user, accessToken: inMemoryAccessToken };
  } catch (error: any) {
    console.error("Error al conectar Google Drive:", error);
    throw error;
  } finally {
    isSigningInWithDrive = false;
  }
}

// Disconnect Google Drive
export function disconnectGoogleDrive(): void {
  inMemoryAccessToken = null;
  try {
    localStorage.removeItem('google_drive_connected_email');
    localStorage.removeItem('google_drive_connected_at');
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('google-drive-auth-changed', {
      detail: { connected: false }
    }));
  }
}

// Get or find the dedicated folder in Google Drive
export async function getOrCreateDriveFolder(accessToken: string, folderName = "IHS_Respaldos_Sistema"): Promise<string> {
  try {
    // 1. Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`
    )}&fields=files(id,name)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // 2. Create folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Carpeta dedicada para respaldos automáticos y periódicos del Sistema IHS'
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || "Error al crear la carpeta en Google Drive.");
    }

    const folderData = await createRes.json();
    return folderData.id;
  } catch (err: any) {
    console.warn("Folder search/creation notice:", err);
    return ""; // Will upload to root of Drive if folder creation has limitations
  }
}

// Upload a backup payload to Google Drive using multipart upload
export async function uploadBackupToGoogleDrive(
  dataPayload: any,
  options?: {
    filename?: string;
    description?: string;
    type?: 'Automático' | 'Manual';
  }
): Promise<{
  id: string;
  name: string;
  size: string;
  webViewLink: string;
  createdTime: string;
}> {
  if (!inMemoryAccessToken) {
    throw new Error("No hay una sesión activa con Google Drive. Conecta tu cuenta primero haciendo clic en 'Conectar con Google Drive'.");
  }

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-');
  const typeTag = options?.type || 'Automático';
  const fileName = options?.filename || `respaldo_ihs_${typeTag.toLowerCase()}_${dateStr}.json`;
  const fileContent = JSON.stringify(dataPayload, null, 2);

  const folderId = await getOrCreateDriveFolder(inMemoryAccessToken);

  // Metadata object
  const metadata: any = {
    name: fileName,
    description: options?.description || `Respaldo del Sistema IHS (${typeTag}) generado el ${now.toLocaleString()}`,
    mimeType: 'application/json'
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${inMemoryAccessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    if (uploadRes.status === 401) {
      inMemoryAccessToken = null;
      throw new Error("El token de Google Drive ha expirado. Por favor vuelve a conectar tu cuenta.");
    }
    throw new Error(errData.error?.message || `Error al subir el archivo a Google Drive (HTTP ${uploadRes.status})`);
  }

  const result = await uploadRes.json();
  const rawSizeBytes = Number(result.size || new Blob([fileContent]).size);
  const sizeReadable = rawSizeBytes > 1024 * 1024
    ? (rawSizeBytes / (1024 * 1024)).toFixed(2) + " MB"
    : (rawSizeBytes / 1024).toFixed(1) + " KB";

  return {
    id: result.id,
    name: result.name || fileName,
    size: sizeReadable,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    createdTime: result.createdTime || now.toISOString()
  };
}

// List backups currently stored in Google Drive
export async function listGoogleDriveBackups(): Promise<DriveBackupFile[]> {
  if (!inMemoryAccessToken) return [];

  try {
    const query = encodeURIComponent("trashed=false and (name contains 'respaldo_ihs' or name contains 'respaldo_sistema')");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,createdTime,webViewLink,description)&orderBy=createdTime desc&pageSize=30`,
      {
        headers: { Authorization: `Bearer ${inMemoryAccessToken}` }
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        inMemoryAccessToken = null;
      }
      return [];
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => {
      const rawBytes = Number(f.size || 0);
      const sizeStr = rawBytes > 1024 * 1024
        ? (rawBytes / (1024 * 1024)).toFixed(2) + " MB"
        : rawBytes > 0
        ? (rawBytes / 1024).toFixed(1) + " KB"
        : "—";

      return {
        id: f.id,
        name: f.name,
        size: sizeStr,
        createdTime: f.createdTime,
        webViewLink: f.webViewLink,
        description: f.description
      };
    });
  } catch (err) {
    console.error("Error listing Google Drive backups:", err);
    return [];
  }
}

// Download a backup file directly from Google Drive
export async function downloadGoogleDriveBackup(fileId: string): Promise<any> {
  if (!inMemoryAccessToken) {
    throw new Error("Debes conectar tu cuenta de Google Drive para descargar este respaldo.");
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${inMemoryAccessToken}` }
  });

  if (!res.ok) {
    throw new Error("No se pudo descargar el archivo desde Google Drive.");
  }

  return await res.json();
}

// Delete an old backup file from Google Drive (Mandatory user confirmation per skills)
export async function deleteGoogleDriveBackup(fileId: string): Promise<boolean> {
  if (!inMemoryAccessToken) {
    throw new Error("Debes conectar tu cuenta de Google Drive para realizar esta acción.");
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${inMemoryAccessToken}` }
  });

  if (!res.ok && res.status !== 404) {
    throw new Error("No se pudo eliminar el archivo de Google Drive.");
  }

  return true;
}
