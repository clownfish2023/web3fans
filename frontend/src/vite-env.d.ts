/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUI_NETWORK: string;
  readonly VITE_PACKAGE_ID: string;
  readonly VITE_API_URL: string;
  readonly VITE_WALRUS_PUBLISHER_URL: string;
  readonly VITE_WALRUS_AGGREGATOR_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

