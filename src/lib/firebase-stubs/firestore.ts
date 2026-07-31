export type Firestore = Record<string, never>;
export type DocumentReference = Record<string, unknown>;
export type CollectionReference = Record<string, unknown>;

const db: Firestore = {};

export function getFirestore(): Firestore {
  return db;
}

export function doc(...segments: unknown[]): DocumentReference {
  return { segments };
}

export function collection(...segments: unknown[]): CollectionReference {
  return { segments };
}

export async function setDoc(): Promise<void> {}
export async function getDoc(): Promise<{ exists: () => boolean; data: () => undefined }> {
  return { exists: () => false, data: () => undefined };
}

export function onSnapshot(
  _ref: CollectionReference,
  onNext: (snapshot: { empty: boolean; forEach: (cb: (doc: { data: () => unknown }) => void) => void }) => void,
): () => void {
  onNext({ empty: true, forEach: () => undefined });
  return () => undefined;
}

export function writeBatch(): {
  set: () => void;
  commit: () => Promise<void>;
} {
  return {
    set: () => undefined,
    commit: async () => undefined,
  };
}

export function serverTimestamp(): string {
  return new Date().toISOString();
}
