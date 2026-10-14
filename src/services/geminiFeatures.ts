// Client service for Gemini Chat, Audio Transcription, Veo 3 Video Generation, and Voice Conversations

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  sources?: Array<{ title: string; url: string }>;
  modelUsed?: string;
}

export type ChatRole = 'analyst' | 'crisis' | 'macro' | 'factchecker';
export type ChatModel = 'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';

export interface ChatResponse {
  reply: string;
  modelUsed: string;
  role: string;
  searchUsed: boolean;
  webSearchQueries?: string[];
  sources?: Array<{ title: string; url: string }>;
  remainingQuota?: number;
}

export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  role: ChatRole = 'analyst',
  model: ChatModel = 'gemini-3.8-flash',
  useSearch = false
): Promise<ChatResponse> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, role, model, useSearch }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Chat request failed (${res.status})`);
  }

  return res.json();
}

export async function transcribeAudioBlob(
  blob: Blob,
  prompt = 'Transcribe this voice query verbatim.'
): Promise<{ transcript: string; modelUsed: string }> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Audio = btoa(binary);

  const res = await fetch('/api/ai/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio: base64Audio,
      mimeType: blob.type || 'audio/webm',
      prompt,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Transcription failed (${res.status})`);
  }

  return res.json();
}

export async function generateVeoVideo(
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<{ operationName: string; aspectRatio: string; modelUsed: string }> {
  const res = await fetch('/api/ai/video/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Video generation failed (${res.status})`);
  }

  return res.json();
}

export async function checkVeoStatus(
  operationName: string
): Promise<{ done: boolean; error: string | null; hasVideo: boolean }> {
  const res = await fetch('/api/ai/video/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Status check failed (${res.status})`);
  }

  return res.json();
}

export function getVeoDownloadUrl(operationName: string): string {
  return `/api/ai/video/download?operationName=${encodeURIComponent(operationName)}`;
}

export async function sendVoiceDialogue(
  audioBlob?: Blob,
  text?: string,
  role: ChatRole = 'analyst'
): Promise<{
  userPrompt: string;
  reply: string;
  audioBase64?: string;
  modelUsed: string;
}> {
  let base64Audio = '';
  if (audioBlob) {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64Audio = btoa(binary);
  }

  const res = await fetch('/api/ai/voice-dialogue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio: base64Audio || undefined,
      text: text || undefined,
      role,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Voice dialogue failed (${res.status})`);
  }

  return res.json();
}
