import axios from 'axios';

// ✅ FIXED: Use TypeScript API for project management, Python API for media processing
const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'https://faint-caye-aaaannnimesh-fe7ebc44.koyeb.app';
const TYPESCRIPT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://screeching-kelsy-aaaannnimesh-ecf28e25.koyeb.app';

console.log('🔗 API Configuration:');
console.log('  Python API:', PYTHON_API_URL);
console.log('  TypeScript API:', TYPESCRIPT_API_URL);

// ✅ FIXED: Create separate API instances
export const pythonApi = axios.create({
  baseURL: PYTHON_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000 // 5 minutes for video processing
});

export const typescriptApi = axios.create({
  baseURL: TYPESCRIPT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000 // 30 seconds for normal requests
});

// ✅ Add request interceptors for debugging
pythonApi.interceptors.request.use(
  (config) => {
    console.log(`🔵 Python API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Python API Request Error:', error);
    return Promise.reject(error);
  }
);

typescriptApi.interceptors.request.use(
  (config) => {
    console.log(`🟢 TypeScript API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ TypeScript API Request Error:', error);
    return Promise.reject(error);
  }
);

// ✅ Add response interceptors for error handling
pythonApi.interceptors.response.use(
  (response) => {
    console.log(`✅ Python API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Python API Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

typescriptApi.interceptors.response.use(
  (response) => {
    console.log(`✅ TypeScript API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ TypeScript API Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// ============================================================================
// MEDIA PROCESSING APIs (Python Backend)
// ============================================================================

export const processImage = async (file: File, effect: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('effect', effect);

  const response = await pythonApi.post('/api/process-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const textToSpeech = async (text: string) => {
  const response = await pythonApi.post('/api/text-to-speech', { text });
  return response.data;
};

export const createVideo = async (
  images: File[],
  audioText: string,
  durationPerImage: number = 3,
  voice: string = 'en-us-female',
  transition: string = 'fade',
  filter: string = 'none',
  enhance: boolean = false,
  musicTrack: string = '',
  musicVolume: number = 0.3,
  addSubtitles: boolean = false
) => {
  try {
    console.log('🎬 Creating video with:', {
      imageCount: images.length,
      voice,
      filter,
      musicTrack,
      addSubtitles
    });

    const formData = new FormData();
    
    // Append images
    images.forEach((image) => {
      formData.append('images', image);
    });
    
    // Append parameters
    formData.append('audio_text', audioText);
    formData.append('duration_per_image', durationPerImage.toString());
    formData.append('voice', voice);
    formData.append('transition', transition);
    formData.append('filter', filter);
    formData.append('enhance', enhance.toString());
    formData.append('music_track', musicTrack);
    formData.append('music_volume', musicVolume.toString());
    formData.append('add_subtitles', addSubtitles.toString());

    // ✅ FIXED: 5-minute timeout for video creation
    const response = await pythonApi.post('/api/create-video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000 // 5 minutes
    });

    console.log('✅ Video created successfully');
    return response.data;
  } catch (error: any) {
    console.error('❌ Video creation failed:', error);
    
    // Better error messages
    if (error.code === 'ECONNABORTED') {
      throw new Error('Video creation took too long. Try with fewer images or without effects.');
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      throw new Error('Cannot connect to video service. Please try again later.');
    } else if (error.response?.status === 503) {
      throw new Error('Video service is temporarily unavailable. Please try again in a few minutes.');
    }
    
    throw error;
  }
};

// ============================================================================
// PROJECT MANAGEMENT APIs (TypeScript Backend)
// ============================================================================

export const createProject = async (userId: string, title: string, description: string) => {
  try {
    console.log('💾 Creating project:', title);
    
    const response = await typescriptApi.post('/api/projects', {
      user_id: userId,
      title,
      description,
    });
    
    console.log('✅ Project created');
    return response.data;
  } catch (error: any) {
    console.error('❌ Project creation failed:', error);
    
    // ✅ FIXED: Better error handling
    if (error.response?.status === 405) {
      throw new Error('Project management is not available. Please contact support.');
    } else if (error.code === 'ERR_NETWORK') {
      throw new Error('Cannot connect to server. Please check your internet connection.');
    }
    
    throw error;
  }
};

export const getProjects = async (userId: string) => {
  try {
    console.log('📚 Fetching projects for user:', userId);
    
    const response = await typescriptApi.get(`/api/projects?user_id=${userId}`);
    
    console.log('✅ Projects fetched:', response.data.projects?.length || 0);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to fetch projects:', error);
    
    // ✅ FIXED: Return empty array instead of throwing error
    if (error.response?.status === 405 || error.response?.status === 404) {
      console.warn('⚠️ Project endpoints not available, returning empty array');
      return { success: true, projects: [] };
    }
    
    if (error.code === 'ERR_NETWORK') {
      console.warn('⚠️ Network error, returning empty array');
      return { success: true, projects: [] };
    }
    
    throw error;
  }
};

// ✅ FIXED: Add health check functions
export const checkPythonApiHealth = async () => {
  try {
    const response = await pythonApi.get('/health', { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('❌ Python API health check failed:', error);
    return null;
  }
};

export const checkTypescriptApiHealth = async () => {
  try {
    const response = await typescriptApi.get('/health', { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('❌ TypeScript API health check failed:', error);
    return null;
  }
};

// ✅ Export default for backward compatibility
export default {
  pythonApi,
  typescriptApi,
  createVideo,
  textToSpeech,
  processImage,
  createProject,
  getProjects,
  checkPythonApiHealth,
  checkTypescriptApiHealth
};