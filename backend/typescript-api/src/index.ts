import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080; // ✅ Dynamic PORT for Render

// ✅ CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://ai-visual-studio.vercel.app',
      'https://ai-visual-studio-git-main-aaannimeshsinghs-projects.vercel.app'
    ];
    
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 20 }
});

// Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Python AI URL - Use environment variable or default
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

console.log('🔗 Configuration:');
console.log('  PORT:', PORT);
console.log('  Python API:', PYTHON_AI_URL);
console.log('  Supabase:', supabaseUrl ? '✓' : '✗');

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'typescript-api',
    port: PORT,
    python_api_url: PYTHON_AI_URL,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ROOT ENDPOINT
// ============================================================================
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI Video Studio - TypeScript API',
    status: 'running',
    version: '7.0',
    python_api: PYTHON_AI_URL,
    port: PORT,
    supabase: supabaseUrl ? 'connected' : 'not configured',
  });
});

// ============================================================================
// PROJECT MANAGEMENT
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

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, projects: data || [] });
  } catch (error: any) {
    console.error('Get projects error:', error);
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

    const { data, error } = await supabase
      .from('projects')
      .insert([{ user_id, title, description: description || '', status: 'draft' }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, project: data });
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PROXY TO PYTHON API
// ============================================================================

// Stock Photos
app.get('/api/stock-photos/search', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${PYTHON_AI_URL}/api/stock-photos/search`, {
      params: req.query,
      timeout: 15000
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Stock photos error:', error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

app.post('/api/stock-photos/download', upload.none(), async (req: Request, res: Response) => {
  try {
    const formData = new FormData();
    formData.append('photo_url', req.body.photo_url);
    formData.append('photo_id', req.body.photo_id);

    const response = await axios.post(`${PYTHON_AI_URL}/api/stock-photos/download`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Download error:', error.message);
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
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/music/tracks', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${PYTHON_AI_URL}/api/music/tracks`, {
      params: req.query,
      timeout: 10000
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Advanced TTS
app.post('/api/advanced-tts', upload.none(), async (req: Request, res: Response) => {
  try {
    const formData = new FormData();
    Object.keys(req.body).forEach(key => {
      formData.append(key, req.body[key]);
    });

    const response = await axios.post(`${PYTHON_AI_URL}/api/advanced-tts`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('TTS error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/voices', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${PYTHON_AI_URL}/api/voices`, { timeout: 10000 });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Video Creation
app.post('/api/create-video', upload.array('images'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }

    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('images', file.buffer, file.originalname);
    });

    Object.keys(req.body).forEach(key => {
      formData.append(key, req.body[key]);
    });

    const response = await axios.post(`${PYTHON_AI_URL}/api/create-video`, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000 // 5 minutes
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Video creation error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found', path: req.path });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 AI Video Studio - TypeScript API v7.0                ║
╚════════════════════════════════════════════════════════════╝

✅ Server: http://localhost:${PORT}
🔗 Python API: ${PYTHON_AI_URL}
📦 Supabase: ${supabaseUrl ? '✓ Connected' : '✗ Not configured'}

Press Ctrl+C to stop
  `);
});