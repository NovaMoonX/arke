import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { firestore } from '@lib/firebase';
import type { Cache, CacheItem } from '@lib/types';

/** Cache expiry duration — 7 days in milliseconds */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Create a new cache document in Firestore.
 * Returns the generated cache ID.
 */
export async function createCache(
  title: string,
  items: CacheItem[],
  createdBy: string,
  creatorName: string,
): Promise<string | null> {
  if (!firestore) return null;

  const now = Date.now();
  const cacheData = {
    title,
    items,
    createdBy,
    creatorName,
    createdAt: now,
    expiresAt: now + CACHE_TTL_MS,
  };

  const docRef = await addDoc(collection(firestore, 'caches'), cacheData);
  return docRef.id;
}

/**
 * Fetch a single cache by ID.
 */
export async function getCache(cacheId: string): Promise<Cache | null> {
  if (!firestore) return null;

  try {
    const docRef = doc(firestore, 'caches', cacheId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    const cache: Cache = {
      id: snapshot.id,
      title: data.title,
      createdBy: data.createdBy,
      creatorName: data.creatorName,
      items: data.items || [],
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
    };
    return cache;
  } catch {
    return null;
  }
}

/**
 * Fetch all caches created by a specific user, ordered by creation date (newest first).
 */
export async function getUserCaches(uid: string): Promise<Cache[]> {
  if (!firestore) return [];

  try {
    const q = query(
      collection(firestore, 'caches'),
      where('createdBy', '==', uid),
      orderBy('createdAt', 'desc'),
    );

    const snapshot = await getDocs(q);
    const caches: Cache[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title,
        createdBy: data.createdBy,
        creatorName: data.creatorName,
        items: data.items || [],
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
      };
    });
    return caches;
  } catch {
    return [];
  }
}

/**
 * Delete a cache document.
 */
export async function deleteCache(cacheId: string): Promise<void> {
  if (!firestore) return;

  const docRef = doc(firestore, 'caches', cacheId);
  await deleteDoc(docRef);
}
