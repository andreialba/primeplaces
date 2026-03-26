/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    google: any;
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
