export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ImagePreview {
  file: File;
  preview: string;
  effect: string;
}

export type EffectType = 'none' | 'grayscale' | 'blur' | 'edge_detection' | 'cartoon';
