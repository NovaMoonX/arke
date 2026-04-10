import type { MediaType } from '@lib/firebase/storage';

export interface CacheItem {
  id: string;
  /** Type of cached content */
  type: 'text' | 'link' | MediaType;
  /** For text/link items, the raw content string */
  content?: string;
  /** For uploaded files — original file name */
  fileName?: string;
  /** MIME type for uploaded files */
  fileType?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Firebase Storage download URL (for uploaded files) */
  downloadURL?: string;
  /** Firebase Storage path (for cleanup) */
  storagePath?: string;
  /** When this item was added */
  addedAt: number;
}

export interface Cache {
  id: string;
  /** Human-readable title */
  title: string;
  /** UID of the creator */
  createdBy: string;
  /** Display name of the creator at time of creation */
  creatorName: string;
  /** Individual items in the cache */
  items: CacheItem[];
  /** Timestamp of creation */
  createdAt: number;
  /** Timestamp when the cache expires (7 days from creation) */
  expiresAt: number;
}
