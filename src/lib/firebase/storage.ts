import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  type UploadTask,
} from 'firebase/storage';
import { ref as dbRef, push, set, remove, get } from 'firebase/database';
import { storage, database } from '@lib/firebase';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
];

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export type MediaType = 'image' | 'video' | 'file' | 'link';

export interface MediaMetadata {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadURL: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: number;
  /** Categorises the media for filtering */
  mediaType?: MediaType;
}

/**
 * Validate a file against size and type constraints.
 * Returns an error message string, or null if valid.
 */
export function validateFile(file: File): string | null {
  const isVideo = VIDEO_TYPES.includes(file.type);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const limitMB = maxSize / (1024 * 1024);
    return `File too large (${sizeMB}MB). Maximum size is ${limitMB}MB.`;
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Unsupported file type (${file.type || 'unknown'}). Accepted: images, videos, and PDFs.`;
  }

  return null;
}

/**
 * Derive the media type category from a MIME type string.
 */
export function deriveMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
}

/**
 * Generate a unique storage path for a file within a session.
 */
export function buildStoragePath(
  sessionPin: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `sessions/${sessionPin}/media/${timestamp}-${safeName}`;
  return path;
}

/**
 * Upload a file to Firebase Storage and create a metadata entry in RTDB.
 * Returns the UploadTask for progress tracking.
 */
export function uploadFile(
  sessionPin: string,
  file: File,
  userId: string,
): UploadTask | null {
  if (!storage) return null;

  const path = buildStoragePath(sessionPin, file.name);
  const fileRef = storageRef(storage, path);

  const metadata = {
    contentType: file.type,
    customMetadata: {
      uploadedBy: userId,
      sessionPin,
      originalName: file.name,
    },
  };

  const task = uploadBytesResumable(fileRef, file, metadata);
  return task;
}

/**
 * Save media metadata to RTDB after a successful upload.
 */
export async function saveMediaMetadata(
  sessionPin: string,
  metadata: Omit<MediaMetadata, 'id'>,
): Promise<string | null> {
  if (!database) return null;

  const mediaRef = dbRef(database, `sessions/${sessionPin}/media`);
  const newRef = push(mediaRef);
  const id = newRef.key;
  if (!id) return null;

  await set(newRef, { ...metadata, id });
  return id;
}

/**
 * Save a shared link to the media collection in RTDB.
 */
export async function saveLinkMetadata(
  sessionPin: string,
  url: string,
  userId: string,
): Promise<string | null> {
  if (!database) return null;

  const mediaRef = dbRef(database, `sessions/${sessionPin}/media`);
  const newRef = push(mediaRef);
  const id = newRef.key;
  if (!id) return null;

  const metadata: MediaMetadata = {
    id,
    fileName: url,
    fileType: 'text/uri-list',
    fileSize: 0,
    downloadURL: url,
    storagePath: '',
    uploadedBy: userId,
    uploadedAt: Date.now(),
    mediaType: 'link',
  };

  await set(newRef, metadata);
  return id;
}

/**
 * Get the download URL for a storage path.
 */
export async function getFileDownloadURL(
  storagePath: string,
): Promise<string | null> {
  if (!storage) return null;

  try {
    const fileRef = storageRef(storage, storagePath);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch {
    return null;
  }
}

/**
 * Delete a media item (both storage file and RTDB entry).
 */
export async function deleteMedia(
  sessionPin: string,
  mediaId: string,
  storagePath: string,
): Promise<void> {
  // Delete from Storage
  if (storage) {
    try {
      const fileRef = storageRef(storage, storagePath);
      await deleteObject(fileRef);
    } catch {
      // File may already be deleted
    }
  }

  // Delete RTDB entry
  if (database) {
    const mediaEntryRef = dbRef(
      database,
      `sessions/${sessionPin}/media/${mediaId}`,
    );
    await remove(mediaEntryRef);
  }
}

/**
 * Delete all media files for a session (cleanup).
 */
export async function cleanupSessionMedia(
  sessionPin: string,
): Promise<void> {
  // Delete all files from Storage
  if (storage) {
    try {
      const folderRef = storageRef(
        storage,
        `sessions/${sessionPin}/media`,
      );
      const result = await listAll(folderRef);
      const deletePromises = result.items.map((item) => deleteObject(item));
      await Promise.all(deletePromises);
    } catch {
      // Folder may not exist
    }
  }

  // Delete all RTDB media entries
  if (database) {
    const mediaRef = dbRef(database, `sessions/${sessionPin}/media`);
    await remove(mediaRef);
  }
}

/**
 * Fetch all media metadata for a session from RTDB.
 */
export async function getSessionMedia(
  sessionPin: string,
): Promise<MediaMetadata[]> {
  if (!database) return [];

  try {
    const mediaRef = dbRef(database, `sessions/${sessionPin}/media`);
    const snapshot = await get(mediaRef);

    if (!snapshot.exists()) return [];

    const data = snapshot.val() as Record<string, MediaMetadata>;
    const items = Object.values(data).sort(
      (a, b) => b.uploadedAt - a.uploadedAt,
    );
    return items;
  } catch {
    return [];
  }
}
