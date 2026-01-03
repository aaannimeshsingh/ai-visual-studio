import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// ✅ FIXED: Enhanced CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://ai-visual-studio.vercel.app',
      'https://ai-visual-studio-git-main-aaaannnimeshs-projects.vercel.app'
    ];
    
    // Allow all Vercel preview deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now during debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// ✅ Handle preflight OPTIONS requests
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer setup with larger limits
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 20
  }
});

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Python AI service URL
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'https://faint-caye-aaaannnimesh-fe7ebc44.koyeb.app';

console.log('🔗 Connecting to Python API:', PYTHON_AI_URL);

// ✅ Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI Video Studio - TypeScript API',
    status: 'running',
    version: '6.0',
    python_api: PYTHON_AI_URL,
    supabase: supabaseUrl ? 'connected' : 'not configured',
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
      voices: '/api/voices',
      createVideo: '/api/create-video'
    }
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'typescript-api',
    python_api_url: PYTHON_AI_URL,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// PROJECT MANAGEMENT ROUTES - ✅ COMPLETE IMPLEMENTATION
// ============================================================================

app.get('/api/projects', async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id as string;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id parameter is required' 
      });
    }

    console.log('📚 Fetching projects for user:', userId);
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} projects`);
    res.json({ success: true, projects: data || [] });
  } catch (error: any) {
    console.error('❌ Get projects error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projects', async (req: Request, res: Response) => {
  try {
    const { user_id, title, description } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id and title are required' 
      });
    }

    console.log('➕ Creating project:', title);

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id,
        title,
        description: description || '',
        status: 'draft'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Project created:', data.id);
    res.json({ success: true, project: data });
  } catch (error: any) {
    console.error('❌ Create project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('✏️ Updating project:', id);

    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Project updated');
    res.json({ success: true, project: data });
  } catch (error: any) {
    console.error('❌ Update project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting project:', id);

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Project deleted');
    res.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    console.error('❌ Delete project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PROXY ROUTES TO PYTHON API
// ============================================================================

// Stock Photos
app.get('/api/stock-photos/search', async (req: Request, res: Response) => {
  try {
    const { query, page = 1, per_page = 15 } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter required' });
    }

    console.log('🔍 Searching stock photos:', query);

    const response = await axios.get(`${PYTHON_AI_URL}/api/stock-photos/search`, {
      params: { query, page, per_page },
      timeout: 15000
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Stock photo search error:', error.message);
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
      return res.status(400).json({ success: false, error: 'photo_url and photo_id required' });
    }

    console.log('📥 Downloading stock photo:', photo_id);

    const formData = new FormData();
    formData.append('photo_url', photo_url);
    formData.append('photo_id', photo_id);

    const response = await axios.post(`${PYTHON_AI_URL}/api/stock-photos/download`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Download error:', error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// Music Library
app.get('/api/music/categories', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${PYTHON_AI_URL}/api/music/categories`, { timeout: 10000 });
    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Music categories error:', error.message);
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
      params: { category },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Music tracks error:', error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// Subtitles
app.post('/api/subtitles/generate', upload.none(), async (req: Request, res: Response) => {
  try {
    const { text, duration, words_per_subtitle = 5 } = req.body;

    if (!text || !duration) {
      return res.status(400).json({ success: false, error: 'text and duration required' });
    }

    const formData = new FormData();
    formData.append('text', text);
    formData.append('duration', duration);
    formData.append('words_per_subtitle', words_per_subtitle);

    const response = await axios.post(`${PYTHON_AI_URL}/api/subtitles/generate`, formData, {
      headers: formData.getHeaders(),
      timeout: 15000
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Subtitle error:', error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// Advanced TTS
app.post('/api/advanced-tts', upload.none(), async (req: Request, res: Response) => {
  try {
    const { text, voice, rate, pitch } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    console.log('🎤 TTS request:', { voice, text: text.substring(0, 50) });

    const formData = new FormData();
    formData.append('text', text);
    formData.append('voice', voice || 'en-us-female');
    formData.append('rate', rate || '+0%');
    formData.append('pitch', pitch || '+0Hz');

    const response = await axios.post(`${PYTHON_AI_URL}/api/advanced-tts`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('❌ TTS error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

app.get('/api/voices', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${PYTHON_AI_URL}/api/voices`, { timeout: 10000 });
    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Voices error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// ✅ FIXED: Video Creation with 5-minute timeout
app.post('/api/create-video', upload.array('images'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }

    console.log(`🎬 Creating video with ${files.length} images`);

    const formData = new FormData();
    
    // Append images
    files.forEach((file) => {
      formData.append('images', file.buffer, file.originalname);
    });

    // Append parameters
    if (req.body.audio_text) formData.append('audio_text', req.body.audio_text);
    formData.append('voice', req.body.voice || 'en-us-female');
    formData.append('duration_per_image', req.body.duration_per_image || '3.0');
    formData.append('transition', req.body.transition || 'fade');
    formData.append('filter', req.body.filter || 'none');
    formData.append('enhance', req.body.enhance || 'false');
    if (req.body.music_track) formData.append('music_track', req.body.music_track);
    formData.append('music_volume', req.body.music_volume || '0.3');
    formData.append('add_subtitles', req.body.add_subtitles || 'false');

    console.log('📤 Sending to Python API...');

    // ✅ FIXED: 5-minute timeout for video processing
    const response = await axios.post(`${PYTHON_AI_URL}/api/create-video`, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000 // 5 minutes
    });

    console.log('✅ Video created successfully');

    // Update project if provided
    if (req.body.project_id) {
      await supabase
        .from('projects')
        .update({ 
          status: 'completed',
          video_url: response.data.video_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.body.project_id);
    }

    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Video creation error:', error.message);
    
    // Update project status if provided
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

// ✅ Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 AI Video Studio - TypeScript API v6.0                ║
╚════════════════════════════════════════════════════════════╝

✅ Server: http://localhost:${PORT}
🔗 Python API: ${PYTHON_AI_URL}
📦 Supabase: ${supabaseUrl ? '✓ Connected' : '✗ Not configured'}

🎨 Features:
   - ✅ Project Management (GET, POST, PATCH, DELETE)
   - ✅ Stock Photos (Search & Download)
   - ✅ Music Library (5 categories)
   - ✅ Subtitle Generation
   - ✅ Advanced TTS (24+ voices)
   - ✅ Video Creation (5min timeout)

📝 Endpoints:
   GET    /health
   GET    /api/projects?user_id=<id>
   POST   /api/projects
   PATCH  /api/projects/:id
   DELETE /api/projects/:id
   GET    /api/stock-photos/search
   POST   /api/stock-photos/download
   GET    /api/music/categories
   POST   /api/create-video

Press Ctrl+C to stop
  `);
});