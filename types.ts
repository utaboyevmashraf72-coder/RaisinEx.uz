import { GenerateContentResponse } from "@google/genai";

export enum ActiveView {
  DASHBOARD = 'DASHBOARD',
  LIVE_AGENT = 'LIVE_AGENT',
  VEO_STUDIO = 'VEO_STUDIO',
  HOLO_CHAT = 'HOLO_CHAT',
  IMAGEN_LAB = 'IMAGEN_LAB',
  DATA_ANALYSIS = 'DATA_ANALYSIS',
  TTS_SYNTH = 'TTS_SYNTH',
  MAP_OPS = 'MAP_OPS'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  images?: string[];
  isLoading?: boolean;
  groundingUrls?: Array<{title: string, uri: string}>;
}

export interface VeoState {
  isGenerating: boolean;
  videoUrl: string | null;
  progress: number;
  statusMessage: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

// Extend Window interface for Veo API key selection
declare global {
  // Define AIStudio interface to match the environment's expectation
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
