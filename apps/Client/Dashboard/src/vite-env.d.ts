/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_Q_SCAN_URL: string;
  readonly VITE_API_VERSION?: string;
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

