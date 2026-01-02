import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ai-visual-studio.vercel.app',
    /^https:\/\/.*\.vercel\.app$/,  // Allow all Vercel preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Multer setup
const upload = multer({ storage: multer.memoryStorage() });

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Python AI service URL
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

// Types
interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  created_at: string;
  updated_at: string;
}

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI Video Studio - Enhanced TypeScript API',
    status: 'running',
    version: '4.0',
    features: {
      'stock_photos': true,
      'music_library': true,
      'subtitle_generation': true,
      'advanced_tts': true,
      'video_creation': true,
      'project_management': true
    },
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      stockPhotos: '/api/stock-photos/search',
      music: '/api/music/categories',
      processImage: '/api/process-image',
      textToSpeech: '/api/text-to-speech',
      advancedTTS: '/api/advanced-tts',
      voices: '/api/voices',
      createVideo: '/api/create-video'
    }
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'typescript-api',
    python_ai_url: PYTHON_AI_URL
  });
});

// ============================================================================
// STOCK PHOTOS ROUTES (Proxy to Python backend)
// ============================================================================

app.get('/api/stock-photos/search', async (req: Request, res: Response) => {
  try {
    const { query, page = 1, per_page = 15 } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter is required' });
    }

    console.log(`🔍 Searching stock photos for: ${query}`);

    const response = await axios.get(`${PYTHON_AI_URL}/api/stock-photos/search`, {
      params: { query, page, per_page }
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Stock photo search error:', error);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

app.post('/api/stock-photos/download', upload.none(), async (req: Request, res: Response) => {
  try {
    const { photo_url, photo_id } = req.body;

    if (!photo_url || !photo_id) {
      return res.status(400).json({ success: false, error: 'photo_url and photo_id are required' });
    }

    console.log(`📥 Downloading stock photo: ${photo_id}`);

    const formData = new FormData();
    formData.append('photo_url', photo_url);
    formData.append('photo_id', photo_id);

    const response = await axios.post(`${PYTHON_AI_URL}/api/stock-photos/download`, formData, {
      headers: formData.getHeaders()
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Stock photo download error:', error);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// ============================================================================
// MUSIC LIBRARY ROUTES (Proxy to Python backend)
// ============================================================================

app.get('/api/music/categories', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${PYTHON_AI_URL}/api/music/categories`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Music categories error:', error);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

app.get('/api/music/tracks', async (req: Request, res: Response) => {
  try {
    const { category = 'upbeat' } = req.query;
    const response = await axios.get(`${PYTHON_AI_URL}/api/music/tracks`, {
      params: { category }
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Music tracks error:', error);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

app.get('/api/music/download/:track_id', async (req: Request, res: Response) => {
  try {
    const { track_id } = req.params;
    const response = await axios.get(`${PYTHON_AI_URL}/api/music/download/${track_id}`, {
      responseType: 'stream'
    });
    
    response.data.pipe(res);
  } catch (error: any) {
    console.error('Music download error:', error);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// ============================================================================
// SUBTITLE ROUTES (Proxy to Python backend)
// ============================================================================

app.post('/api/subtitles/generate', upload.none(), async (req: Request, res: Response) => {
  try {
    const { text, duration, words_per_subtitle = 5 } = req.body;

    if (!text || !duration) {
      return res.status(400).json({ success: false, error: 'text and duration are required' });
    }

    const formData = new FormData();
    formData.append('text', text);
    formData.append('duration', duration);
    formData.append('words_per_subtitle', words_per_subtitle);

    const response = await axios.post(`${PYTHON_AI_URL}/api/subtitles/generate`, formData, {
      headers: formData.getHeaders()
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Subtitle generation error:', error);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// ============================================================================
// PROJECT MANAGEMENT ROUTES
// ============================================================================

app.get('/api/projects', async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id as string;
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, projects: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projects', async (req: Request, res: Response) => {
  try {
    const { user_id, title, description } = req.body;

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          user_id,
          title,
          description,
          status: 'draft'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, project: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, project: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ADVANCED TTS ROUTES
// ============================================================================

app.post('/api/advanced-tts', upload.none(), async (req: Request, res: Response) => {
  try {
    const { text, voice, rate, pitch } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    const formData = new FormData();
    formData.append('text', text);
    formData.append('voice', voice || 'en-US-AriaNeural');
    formData.append('rate', rate || '+0%');
    formData.append('pitch', pitch || '+0Hz');

    const response = await axios.post(`${PYTHON_AI_URL}/api/advanced-tts`, formData, {
      headers: formData.getHeaders()
    });

    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

app.get('/api/voices', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${PYTHON_AI_URL}/api/voices`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// ============================================================================
// IMAGE PROCESSING ROUTES
// ============================================================================

app.post('/api/process-image', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    formData.append('effect', req.body.effect || 'none');
    formData.append('filter', req.body.filter || 'none');
    formData.append('enhance', req.body.enhance || 'false');

    const response = await axios.post(`${PYTHON_AI_URL}/api/process-image`, formData, {
      headers: formData.getHeaders()
    });

    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// ============================================================================
// TEXT TO SPEECH (Basic)
// ============================================================================

app.post('/api/text-to-speech', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    const formData = new FormData();
    formData.append('text', text);

    const response = await axios.post(`${PYTHON_AI_URL}/api/text-to-speech`, formData, {
      headers: formData.getHeaders()
    });

    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// ============================================================================
// VIDEO CREATION (Enhanced with new features)
// ============================================================================

app.post('/api/create-video', upload.array('images'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }

    console.log(`🎬 Creating video with ${files.length} images`);

    const formData = new FormData();
    
    // Append all images
    files.forEach((file) => {
      formData.append('images', file.buffer, file.originalname);
    });

    // Append audio text if provided
    if (req.body.audio_text) {
      formData.append('audio_text', req.body.audio_text);
    }

    // Advanced options
    formData.append('voice', req.body.voice || 'en-US-AriaNeural');
    formData.append('duration_per_image', req.body.duration_per_image || '3.0');
    formData.append('transition', req.body.transition || 'fade');
    formData.append('filter', req.body.filter || 'none');
    formData.append('enhance', req.body.enhance || 'false');
    formData.append('auto_duration', req.body.auto_duration || 'true');
    
    // NEW: Music and subtitles
    if (req.body.music_track) {
      formData.append('music_track', req.body.music_track);
    }
    formData.append('music_volume', req.body.music_volume || '0.3');
    formData.append('add_subtitles', req.body.add_subtitles || 'false');

    console.log('Video settings:', {
      voice: req.body.voice,
      transition: req.body.transition,
      filter: req.body.filter,
      music_track: req.body.music_track,
      add_subtitles: req.body.add_subtitles
    });

    const response = await axios.post(`${PYTHON_AI_URL}/api/create-video`, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000 // 5 minutes timeout
    });

    // Update project status in Supabase if project_id provided
    if (req.body.project_id) {
      await supabase
        .from('projects')
        .update({ 
          status: 'completed',
          video_url: response.data.video_path,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.body.project_id);
    }

    res.json(response.data);
  } catch (error: any) {
    console.error('Video creation error:', error);
    
    // Update project status to failed if project_id provided
    if (req.body.project_id) {
      await supabase
        .from('projects')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', req.body.project_id);
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 AI Video Studio - TypeScript API Server             ║
╚════════════════════════════════════════════════════════════╝

✅ Server running on: http://localhost:${PORT}
🔗 Python AI Service: ${PYTHON_AI_URL}
📦 Supabase: ${supabaseUrl ? '✓ Connected' : '✗ Not configured'}

🎨 Features Enabled:
   - Stock Photo Search (Pexels API)
   - Music Library (5 categories)
   - Subtitle Generation
   - Advanced Text-to-Speech (10+ voices)
   - Video Creation with Transitions
   - Image Filters & Enhancement
   - Project Management

📚 API Documentation: http://localhost:${PORT}
🔧 Health Check: http://localhost:${PORT}/health

🆕 New Endpoints:
   - GET  /api/stock-photos/search
   - POST /api/stock-photos/download
   - GET  /api/music/categories
   - GET  /api/music/tracks
   - POST /api/subtitles/generate

Press Ctrl+C to stop the server
  `);
});