import axios from 'axios';

// ✅ FIXED: Use deployed Koyeb TypeScript API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://screeching-kelsy-aaaannnimesh-ecf28e25.koyeb.app';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Functions
export const processImage = async (file: File, effect: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('effect', effect);

  const response = await api.post('/api/process-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const textToSpeech = async (text: string) => {
  const response = await api.post('/api/text-to-speech', { text });
  return response.data;
};

export const createVideo = async (
  images: File[],
  audioText: string,
  durationPerImage: number = 3,
  voice: string = 'en-US-AriaNeural',
  transition: string = 'fade',
  filter: string = 'none',
  enhance: boolean = false,
  musicTrack: string = '',
  musicVolume: number = 0.3,
  addSubtitles: boolean = false
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
  formData.append('music_track', musicTrack);
  formData.append('music_volume', musicVolume.toString());
  formData.append('add_subtitles', addSubtitles.toString());

  const response = await api.post('/api/create-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

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