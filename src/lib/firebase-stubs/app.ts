export type FirebaseApp = Record<string, never>;

const app: FirebaseApp = {};

export function initializeApp(): FirebaseApp {
  return app;
}

export function getApps(): FirebaseApp[] {
  return [app];
}

export function getApp(): FirebaseApp {
  return app;
}
