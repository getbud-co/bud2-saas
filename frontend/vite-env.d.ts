/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_CHECKIN_SYNC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
