import { supabase } from './supabase';

export const auth = {
  // Sign up new user
  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  },

  // Sign in existing user
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
    return { error };
  },

  // Get current user
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Get user error:', error);
      return null;
    }
    return user;
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Get session error:', error);
      return null;
    }
    return session;
  },

  // Listen to auth changes
  onAuthStateChange: (callback: (user: any) => void) => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  },
};

// API functions
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// AI Image Generation
export const generateImages = async (
  prompt: string,
  negativePrompt: string = 'blurry, bad quality',
  numImages: number = 1
) => {
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('negative_prompt', negativePrompt);
  formData.append('num_images', numImages.toString());

  const response = await api.post('/api/generate-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Advanced TTS
export const advancedTextToSpeech = async (
  text: string,
  voice: string = 'en-US-AriaNeural',
  rate: string = '+0%',
  pitch: string = '+0Hz'
) => {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('voice', voice);
  formData.append('rate', rate);
  formData.append('pitch', pitch);

  const response = await api.post('/api/advanced-tts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Get available voices
export const getVoices = async () => {
  const response = await api.get('/api/voices');
  return response.data;
};

// Process image
export const processImage = async (file: File, effect: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('effect', effect);

  const response = await api.post('/api/process-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Text to speech (basic)
export const textToSpeech = async (text: string) => {
  const response = await api.post('/api/text-to-speech', { text });
  return response.data;
};

// Create video with advanced options
export const createVideo = async (
  images: File[],
  audioText: string,
  durationPerImage: number = 3,
  voice: string = 'en-US-AriaNeural',
  transition: string = 'fade',
  filter: string = 'none',
  enhance: boolean = false
) => {
  const formData = new FormData();
  images.forEach((image) => {
    formData.append('images', image);
  });
  formData.append('audio_text', audioText);
  formData.append('duration_per_image', durationPerImage.toString());
  formData.append('voice', voice);
  formData.append('transition', transition);
  formData.append('filter', filter);
  formData.append('enhance', enhance.toString());
  formData.append('auto_duration', 'true');

  const response = await api.post('/api/create-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Project management
export const createProject = async (userId: string, title: string, description: string) => {
  const response = await api.post('/api/projects', {
    user_id: userId,
    title,
    description,
  });
  return response.data;
};

export const getProjects = async (userId: string) => {
  const response = await api.get(`/api/projects?user_id=${userId}`);
  return response.data;
};