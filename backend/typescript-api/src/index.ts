import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
    version: '3.0',
    features: {
      'ai_image_generation': true,
      'advanced_tts': true,
      'video_creation': true,
      'project_management': true
    },
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      processImage: '/api/process-image',
      generateImage: '/api/generate-image',
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

// Project Management Routes
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

// AI Image Generation
app.post('/api/generate-image', upload.none(), async (req: Request, res: Response) => {
  try {
    const { prompt, negative_prompt, num_images } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('negative_prompt', negative_prompt || 'blurry, bad quality, distorted');
    formData.append('num_images', num_images || '1');
    formData.append('width', '512');
    formData.append('height', '512');

    const response = await axios.post(`${PYTHON_AI_URL}/api/generate-image`, formData, {
      headers: formData.getHeaders(),
      timeout: 120000 // 2 minutes timeout for AI generation
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.detail || error.message 
    });
  }
});

// Advanced Text-to-Speech
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

// Get Available Voices
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

// Process Image
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

// Basic Text to Speech
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

// Create Video with Advanced Features
app.post('/api/create-video', upload.array('images'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }

    console.log(`Creating video with ${files.length} images`);

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

    console.log('Video settings:', {
      voice: req.body.voice,
      transition: req.body.transition,
      filter: req.body.filter,
      enhance: req.body.enhance
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
   - AI Image Generation
   - Advanced Text-to-Speech (10+ voices)
   - Video Creation with Transitions
   - Image Filters & Enhancement
   - Project Management

📚 API Documentation: http://localhost:${PORT}
🔧 Health Check: http://localhost:${PORT}/health

Press Ctrl+C to stop the server
  `);
});