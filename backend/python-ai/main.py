from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import io
import os
from pathlib import Path
from typing import List, Optional
import uuid
from TTS.api import TTS
import torch
import subprocess
from enum import Enum
import asyncio
import edge_tts
from gtts import gTTS

app = FastAPI(title="AI Video Studio - Enhanced AI Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories for storage
UPLOAD_DIR = Path("/shared-storage/uploads")
OUTPUT_DIR = Path("/shared-storage/outputs")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Initialize TTS model
tts_model = None
stable_diffusion_model = None

class VoiceType(str, Enum):
    FEMALE_US = "en-US-AriaNeural"
    MALE_US = "en-US-GuyNeural"
    FEMALE_UK = "en-GB-SoniaNeural"
    MALE_UK = "en-GB-RyanNeural"
    FEMALE_AUSTRALIAN = "en-AU-NatashaNeural"
    MALE_AUSTRALIAN = "en-AU-WilliamNeural"
    FEMALE_INDIAN = "en-IN-NeerjaNeural"
    MALE_INDIAN = "en-IN-PrabhatNeural"
    CHILD = "en-US-JennyNeural"
    NARRATOR = "en-US-ChristopherNeural"

class TransitionType(str, Enum):
    NONE = "none"
    FADE = "fade"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    ZOOM = "zoom"
    DISSOLVE = "dissolve"

class FilterType(str, Enum):
    NONE = "none"
    VINTAGE = "vintage"
    WARM = "warm"
    COOL = "cool"
    BLACK_AND_WHITE = "black_and_white"
    SEPIA = "sepia"
    VIBRANT = "vibrant"

def get_tts_model():
    global tts_model
    if tts_model is None:
        try:
            tts_model = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", 
                           progress_bar=False, 
                           gpu=False)
        except Exception as e:
            print(f"TTS model initialization error: {e}")
    return tts_model

def get_stable_diffusion_model():
    """Initialize Stable Diffusion for image generation"""
    global stable_diffusion_model
    if stable_diffusion_model is None:
        try:
            print("🎨 Loading Stable Diffusion model... (this may take a while)")
            from diffusers import StableDiffusionPipeline
            
            model_id = "runwayml/stable-diffusion-v1-5"
            
            stable_diffusion_model = StableDiffusionPipeline.from_pretrained(
                model_id,
                torch_dtype=torch.float32,
                safety_checker=None,
                requires_safety_checker=False
            )
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            stable_diffusion_model = stable_diffusion_model.to(device)
            
            print(f"✅ Stable Diffusion loaded on {device}")
        except Exception as e:
            print(f"❌ Stable Diffusion initialization error: {e}")
            stable_diffusion_model = None
    return stable_diffusion_model

def apply_filter(img: np.ndarray, filter_type: str) -> np.ndarray:
    """Apply Instagram-like filters to images"""
    if filter_type == FilterType.NONE or filter_type == "none":
        return img
    
    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    
    if filter_type == FilterType.VINTAGE or filter_type == "vintage":
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(0.7)
        enhancer = ImageEnhance.Brightness(pil_img)
        pil_img = enhancer.enhance(1.1)
        
    elif filter_type == FilterType.WARM or filter_type == "warm":
        arr = np.array(pil_img)
        arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.2, 0, 255)
        arr[:, :, 1] = np.clip(arr[:, :, 1] * 1.1, 0, 255)
        pil_img = Image.fromarray(arr.astype(np.uint8))
        
    elif filter_type == FilterType.COOL or filter_type == "cool":
        arr = np.array(pil_img)
        arr[:, :, 2] = np.clip(arr[:, :, 2] * 1.2, 0, 255)
        pil_img = Image.fromarray(arr.astype(np.uint8))
        
    elif filter_type == FilterType.BLACK_AND_WHITE or filter_type == "black_and_white":
        pil_img = pil_img.convert('L').convert('RGB')
        
    elif filter_type == FilterType.SEPIA or filter_type == "sepia":
        arr = np.array(pil_img)
        sepia_filter = np.array([[0.393, 0.769, 0.189],
                                 [0.349, 0.686, 0.168],
                                 [0.272, 0.534, 0.131]])
        sepia_img = arr.dot(sepia_filter.T)
        sepia_img = np.clip(sepia_img, 0, 255)
        pil_img = Image.fromarray(sepia_img.astype(np.uint8))
        
    elif filter_type == FilterType.VIBRANT or filter_type == "vibrant":
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(1.5)
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(1.2)
    
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

def enhance_image(img: np.ndarray) -> np.ndarray:
    """AI-powered image enhancement"""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    
    enhanced_lab = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    
    enhanced = cv2.fastNlMeansDenoisingColored(enhanced, None, 10, 10, 7, 21)
    
    kernel = np.array([[-1,-1,-1],
                       [-1, 9,-1],
                       [-1,-1,-1]])
    enhanced = cv2.filter2D(enhanced, -1, kernel)
    
    return enhanced

@app.get("/")
async def root():
    return {
        "message": "AI Video Studio - Enhanced with AI Generation",
        "version": "3.0",
        "status": "running",
        "features": {
            "ai_image_generation": True,
            "advanced_tts": True,
            "voice_options": [v.value for v in VoiceType],
            "filters": ["vintage", "warm", "cool", "black_and_white", "sepia", "vibrant"],
            "transitions": ["none", "fade", "slide_left", "slide_right", "zoom", "dissolve"]
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "python-ai-enhanced",
        "ai_image_gen": stable_diffusion_model is not None,
        "tts_available": True
    }

@app.post("/api/generate-image")
async def generate_image(
    prompt: str = Form(...),
    negative_prompt: str = Form("blurry, bad quality, distorted"),
    num_images: int = Form(1),
    width: int = Form(512),
    height: int = Form(512)
):
    """Generate images from text prompts using AI"""
    try:
        print(f"\n🎨 AI IMAGE GENERATION")
        print(f"Prompt: {prompt}")
        print(f"Images to generate: {num_images}")
        
        model = get_stable_diffusion_model()
        
        if model is None:
            raise HTTPException(
                status_code=503, 
                detail="AI Image Generation not available. Model failed to load."
            )
        
        generated_images = []
        
        for i in range(min(num_images, 4)):
            print(f"Generating image {i+1}/{num_images}...")
            
            with torch.no_grad():
                image = model(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    num_inference_steps=30,
                    guidance_scale=7.5,
                    width=width,
                    height=height
                ).images[0]
            
            output_filename = f"ai_generated_{uuid.uuid4()}.png"
            output_path = UPLOAD_DIR / output_filename
            image.save(str(output_path))
            
            generated_images.append({
                "filename": output_filename,
                "path": str(output_path),
                "url": f"/api/download/{output_filename}"
            })
            
            print(f"✓ Image {i+1} generated")
        
        return {
            "success": True,
            "prompt": prompt,
            "images": generated_images,
            "count": len(generated_images)
        }
        
    except Exception as e:
        print(f"❌ Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@app.post("/api/advanced-tts")
async def advanced_text_to_speech(
    text: str = Form(...),
    voice: str = Form(VoiceType.FEMALE_US),
    rate: str = Form("+0%"),
    pitch: str = Form("+0Hz")
):
    """
    Advanced Text-to-Speech with multiple voices and emotions
    Uses Microsoft Edge TTS for high-quality voices
    """
    try:
        print(f"\n🎤 ADVANCED TTS")
        print(f"Text: {text[:50]}...")
        print(f"Voice: {voice}")
        print(f"Rate: {rate}, Pitch: {pitch}")
        
        # FIX: Ensure rate and pitch have proper format
        # If rate is just a number, add sign and %
        if rate and not rate.startswith(('+', '-')):
            rate = f"+{rate}"
        if rate and not rate.endswith('%'):
            rate = f"{rate}%"
            
        # If pitch is just a number, add sign and Hz
        if pitch and not pitch.startswith(('+', '-')):
            pitch = f"+{pitch}"
        if pitch and not pitch.endswith('Hz'):
            pitch = f"{pitch}Hz"
        
        print(f"Formatted - Rate: {rate}, Pitch: {pitch}")
        
        output_filename = f"tts_{uuid.uuid4()}.mp3"
        output_path = OUTPUT_DIR / output_filename
        
        # Use Edge TTS for high-quality voices
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await communicate.save(str(output_path))
        
        print(f"✓ Audio generated with {voice}")
        
        return {
            "success": True,
            "filename": output_filename,
            "path": str(output_path),
            "voice": voice,
            "text_length": len(text),
            "url": f"/api/download/{output_filename}"
        }
        
    except Exception as e:
        print(f"❌ TTS error: {str(e)}")
        # Fallback to gTTS
        try:
            print("Falling back to gTTS...")
            output_filename = f"tts_{uuid.uuid4()}.mp3"
            output_path = OUTPUT_DIR / output_filename
            
            tts = gTTS(text=text, lang='en', slow=False)
            tts.save(str(output_path))
            
            return {
                "success": True,
                "filename": output_filename,
                "path": str(output_path),
                "voice": "gTTS (fallback)",
                "text_length": len(text),
                "url": f"/api/download/{output_filename}"
            }
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=f"TTS failed: {str(fallback_error)}")

@app.get("/api/voices")
async def list_available_voices():
    """List all available voice options"""
    return {
        "voices": [
            {"id": VoiceType.FEMALE_US, "name": "Female US (Aria)", "language": "en-US", "gender": "female"},
            {"id": VoiceType.MALE_US, "name": "Male US (Guy)", "language": "en-US", "gender": "male"},
            {"id": VoiceType.FEMALE_UK, "name": "Female UK (Sonia)", "language": "en-GB", "gender": "female"},
            {"id": VoiceType.MALE_UK, "name": "Male UK (Ryan)", "language": "en-GB", "gender": "male"},
            {"id": VoiceType.FEMALE_AUSTRALIAN, "name": "Female Australian (Natasha)", "language": "en-AU", "gender": "female"},
            {"id": VoiceType.MALE_AUSTRALIAN, "name": "Male Australian (William)", "language": "en-AU", "gender": "male"},
            {"id": VoiceType.FEMALE_INDIAN, "name": "Female Indian (Neerja)", "language": "en-IN", "gender": "female"},
            {"id": VoiceType.MALE_INDIAN, "name": "Male Indian (Prabhat)", "language": "en-IN", "gender": "male"},
            {"id": VoiceType.CHILD, "name": "Child Voice (Jenny)", "language": "en-US", "gender": "female"},
            {"id": VoiceType.NARRATOR, "name": "Narrator (Christopher)", "language": "en-US", "gender": "male"}
        ]
    }

@app.post("/api/process-image")
async def process_image(
    file: UploadFile = File(...),
    effect: str = Form("none"),
    filter: str = Form("none"),
    enhance: bool = Form(False)
):
    """Process an image with effects and filters"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        if enhance:
            img = enhance_image(img)
        
        if effect == "grayscale":
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif effect == "blur":
            img = cv2.GaussianBlur(img, (15, 15), 0)
        elif effect == "edge_detection":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 100, 200)
            img = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        elif effect == "cartoon":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gray = cv2.medianBlur(gray, 5)
            edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                                         cv2.THRESH_BINARY, 9, 9)
            color = cv2.bilateralFilter(img, 9, 300, 300)
            img = cv2.bitwise_and(color, color, mask=edges)
        
        if filter != "none":
            img = apply_filter(img, filter)
        
        output_filename = f"{uuid.uuid4()}.jpg"
        output_path = UPLOAD_DIR / output_filename
        cv2.imwrite(str(output_path), img)
        
        return {
            "success": True,
            "filename": output_filename,
            "effect_applied": effect,
            "filter_applied": filter,
            "enhanced": enhance,
            "path": str(output_path)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

def create_silent_video_with_transitions(image_paths: List[str], duration_per_image: float, 
                                         transition: str, output_path: str):
    """Create video from images with transitions using FFmpeg"""
    try:
        if transition == TransitionType.NONE or transition == "none":
            list_file = OUTPUT_DIR / f"temp_list_{uuid.uuid4()}.txt"
            with open(list_file, 'w') as f:
                for img_path in image_paths:
                    f.write(f"file '{img_path}'\n")
                    f.write(f"duration {duration_per_image}\n")
                f.write(f"file '{image_paths[-1]}'\n")
            
            cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', str(list_file),
                '-vf', 'fps=24,format=yuv420p',
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-y',
                output_path
            ]
            
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            list_file.unlink()
        else:
            transition_duration = 0.5
            cmd = ['ffmpeg']
            
            for img_path in image_paths:
                cmd.extend(['-loop', '1', '-t', str(duration_per_image), '-i', img_path])
            
            if len(image_paths) > 1:
                filter_chain = "[0:v]"
                for i in range(1, len(image_paths)):
                    offset = (i * duration_per_image) - (i * transition_duration)
                    filter_chain += f"[{i}:v]xfade=transition=fade:duration={transition_duration}:offset={offset}"
                    if i < len(image_paths) - 1:
                        filter_chain += f"[v{i}];[v{i}]"
                filter_chain += "[v]"
            else:
                filter_chain = "[0:v]copy[v]"
            
            cmd.extend([
                '-filter_complex', filter_chain,
                '-map', '[v]',
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-pix_fmt', 'yuv420p',
                '-y',
                output_path
            ])
            
            subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        return True
        
    except Exception as e:
        print(f"FFmpeg video creation error: {str(e)}")
        return False

def add_audio_to_video_with_ffmpeg(video_path: str, audio_path: str, output_path: str, video_duration: float):
    """Add audio to video using FFmpeg"""
    try:
        probe_cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            audio_path
        ]
        
        result = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
        audio_duration = float(result.stdout.strip())
        
        if audio_duration < video_duration:
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-i', audio_path,
                '-filter_complex', f'[1:a]apad=whole_dur={video_duration}[audio]',
                '-map', '0:v',
                '-map', '[audio]',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-t', str(video_duration),
                '-y',
                output_path
            ]
        else:
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-i', audio_path,
                '-filter_complex', f'[1:a]atrim=0:{video_duration}[audio]',
                '-map', '0:v',
                '-map', '[audio]',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-y',
                output_path
            ]
        
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True
        
    except Exception as e:
        print(f"FFmpeg audio merge error: {str(e)}")
        return False

@app.post("/api/create-video")
async def create_video(
    images: List[UploadFile] = File(...),
    audio_text: str = Form(None),
    voice: str = Form(VoiceType.FEMALE_US),
    duration_per_image: float = Form(3.0),
    transition: str = Form("fade"),
    filter: str = Form("none"),
    enhance: bool = Form(False),
    auto_duration: bool = Form(True)
):
    """Create video with AUTO-DURATION and advanced features"""
    try:
        print(f"\n{'='*60}")
        print(f"🎬 AI VIDEO STUDIO - ENHANCED MODE")
        print(f"{'='*60}")
        print(f"Filter: {filter}, Audio text: {audio_text[:30] if audio_text else 'None'}...")
        
        # Process images
        image_paths = []
        target_width = 1280
        target_height = 720
        
        for idx, img_file in enumerate(images):
            contents = await img_file.read()
            img_filename = f"{uuid.uuid4()}.jpg"
            img_path = UPLOAD_DIR / img_filename
            
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                continue
            
            if enhance:
                img = enhance_image(img)
            
            if filter != "none":
                print(f"Applying {filter} filter to image {idx+1}")
                img = apply_filter(img, filter)
            
            img_resized = cv2.resize(img, (target_width, target_height))
            cv2.imwrite(str(img_path), img_resized)
            image_paths.append(str(img_path))
            print(f"✓ Image {idx+1} processed (filter: {filter})")
        
        if not image_paths:
            raise HTTPException(status_code=400, detail="No valid images")
        
        video_filename = f"{uuid.uuid4()}.mp4"
        
        # Generate audio with advanced TTS
        audio_path = None
        audio_duration = 0
        has_audio = False
        calculated_duration_per_image = duration_per_image
        
        if audio_text and len(audio_text.strip()) > 0:
            print(f"\n🎤 Generating voiceover with {voice}...")
            
            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_path = OUTPUT_DIR / audio_filename
            
            try:
                # FIX: Use proper rate/pitch format
                rate = "+0%"
                pitch = "+0Hz"
                
                # Use advanced TTS
                communicate = edge_tts.Communicate(audio_text, voice, rate=rate, pitch=pitch)
                await communicate.save(str(audio_path))
                
                if audio_path.exists() and audio_path.stat().st_size > 0:
                    probe_cmd = [
                        'ffprobe',
                        '-v', 'error',
                        '-show_entries', 'format=duration',
                        '-of', 'default=noprint_wrappers=1:nokey=1',
                        str(audio_path)
                    ]
                    
                    result = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
                    audio_duration = float(result.stdout.strip())
                    
                    print(f"✓ Audio generated: {audio_duration:.2f}s")
                    
                    if auto_duration and audio_duration > 0:
                        calculated_duration_per_image = audio_duration / len(image_paths)
                        print(f"⚡ AUTO-DURATION: {calculated_duration_per_image:.2f}s per image")
                    
                    has_audio = True
                else:
                    print(f"⚠️ Audio file not created or empty")
                    audio_path = None
                    
            except Exception as e:
                print(f"⚠️ Advanced TTS error: {e}")
                audio_path = None
        else:
            print(f"ℹ️ No audio text provided, creating silent video")
        
        final_duration_per_image = calculated_duration_per_image
        total_duration = len(image_paths) * final_duration_per_image
        
        # Create video
        temp_video_path = OUTPUT_DIR / f"temp_{video_filename}"
        final_video_path = OUTPUT_DIR / video_filename
        
        print(f"\n🎞️ Creating video...")
        print(f"Images: {len(image_paths)}, Duration: {total_duration:.2f}s, Has audio: {has_audio}")
        
        if not create_silent_video_with_transitions(image_paths, final_duration_per_image, 
                                                   transition, str(temp_video_path)):
            raise HTTPException(status_code=500, detail="Video creation failed")
        
        # Add audio if available
        if audio_path and has_audio and audio_path.exists():
            print(f"\n🔊 Merging audio with video...")
            
            if add_audio_to_video_with_ffmpeg(str(temp_video_path), str(audio_path), 
                                            str(final_video_path), total_duration):
                print(f"✓ Audio merged successfully")
                if temp_video_path.exists():
                    temp_video_path.unlink()
            else:
                print(f"⚠️ Audio merge failed, using video without audio")
                final_video_path = temp_video_path
                has_audio = False
        else:
            if audio_text and len(audio_text.strip()) > 0:
                print(f"⚠️ Audio file not available, creating silent video")
            if temp_video_path.exists():
                temp_video_path.rename(final_video_path)
            has_audio = False
        
        if not final_video_path.exists():
            raise HTTPException(status_code=500, detail="Video file not created")
        
        file_size = final_video_path.stat().st_size
        
        print(f"\n✅ VIDEO COMPLETE!")
        print(f"{'='*60}\n")
        
        return {
            "success": True,
            "video_filename": video_filename,
            "video_path": str(final_video_path),
            "num_images": len(images),
            "has_audio": has_audio,
            "audio_duration": f"{audio_duration:.2f}s" if audio_duration > 0 else "N/A",
            "video_duration": f"{total_duration:.2f}s",
            "duration_per_image": f"{final_duration_per_image:.2f}s",
            "auto_duration_used": auto_duration and audio_duration > 0,
            "voice_used": voice if has_audio else "none",
            "resolution": f"{target_width}x{target_height}",
            "file_size_mb": f"{file_size / (1024*1024):.2f}",
            "transition": transition,
            "filter": filter,
            "enhanced": enhance
        }
        
    except Exception as e:
        import traceback
        print(f"\n❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Video creation failed: {str(e)}")

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    """Download processed files"""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(path=file_path, filename=filename)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
    
    # Add this to your main.py - UPDATED generate_image endpoint

@app.post("/api/generate-image")
async def generate_image(
    prompt: str = Form(...),
    negative_prompt: str = Form("blurry, bad quality, distorted"),
    num_images: int = Form(1),
    width: int = Form(512),
    height: int = Form(512)
):
    """
    Generate images from text prompts using AI
    NOTE: This feature requires significant resources and may not work in all environments
    """
    try:
        print(f"\n🎨 AI IMAGE GENERATION REQUEST")
        print(f"Prompt: {prompt}")
        print(f"Images to generate: {num_images}")
        print(f"Checking if Stable Diffusion is available...")
        
        # Check if we can use Stable Diffusion
        try:
            model = get_stable_diffusion_model()
        except Exception as model_error:
            print(f"⚠️ Stable Diffusion unavailable: {model_error}")
            model = None
        
        if model is None:
            # Return a helpful error message instead of crashing
            return {
                "success": False,
                "error": "AI Image Generation is not available",
                "reason": "Stable Diffusion model failed to load. This feature requires significant GPU/CPU resources.",
                "suggestion": "Use the image upload feature instead, or use an external AI image generator like:",
                "alternatives": [
                    "https://huggingface.co/spaces/stabilityai/stable-diffusion",
                    "https://dreamstudio.ai",
                    "https://www.midjourney.com"
                ],
                "images": []
            }
        
        generated_images = []
        
        # Limit number of images
        num_images = min(num_images, 2)  # Reduce to 2 to avoid timeout
        
        for i in range(num_images):
            try:
                print(f"Generating image {i+1}/{num_images}...")
                
                # Generate image with timeout protection
                with torch.no_grad():
                    image = model(
                        prompt=prompt,
                        negative_prompt=negative_prompt,
                        num_inference_steps=20,  # Reduced from 30 for faster generation
                        guidance_scale=7.5,
                        width=width,
                        height=height
                    ).images[0]
                
                # Save image
                output_filename = f"ai_generated_{uuid.uuid4()}.png"
                output_path = UPLOAD_DIR / output_filename
                image.save(str(output_path))
                
                generated_images.append({
                    "filename": output_filename,
                    "path": str(output_path),
                    "url": f"/api/download/{output_filename}"
                })
                
                print(f"✓ Image {i+1} generated successfully")
                
            except Exception as img_error:
                print(f"❌ Failed to generate image {i+1}: {str(img_error)}")
                continue
        
        if len(generated_images) == 0:
            return {
                "success": False,
                "error": "Failed to generate any images",
                "reason": "Image generation process encountered errors",
                "images": []
            }
        
        return {
            "success": True,
            "prompt": prompt,
            "images": generated_images,
            "count": len(generated_images)
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Image generation error: {str(e)}")
        print(error_trace)
        
        # Return detailed error for debugging
        return {
            "success": False,
            "error": str(e),
            "detail": "AI Image Generation failed. This feature requires significant resources and may not work in Docker containers without GPU support.",
            "images": []
        }


# Also update the get_stable_diffusion_model function for better error handling

def get_stable_diffusion_model():
    """Initialize Stable Diffusion for image generation"""
    global stable_diffusion_model
    
    if stable_diffusion_model is None:
        try:
            print("🎨 Loading Stable Diffusion model...")
            print("⚠️  This may take 5-10 minutes on first run...")
            
            from diffusers import StableDiffusionPipeline
            import torch
            
            # Check available memory
            import psutil
            available_ram = psutil.virtual_memory().available / (1024 ** 3)  # GB
            print(f"Available RAM: {available_ram:.2f} GB")
            
            if available_ram < 4:
                print("⚠️  Warning: Less than 4GB RAM available. Image generation may fail.")
            
            # Use a smaller, faster model
            model_id = "runwayml/stable-diffusion-v1-5"
            
            # Try to load the model
            stable_diffusion_model = StableDiffusionPipeline.from_pretrained(
                model_id,
                torch_dtype=torch.float32,
                safety_checker=None,
                requires_safety_checker=False,
                low_cpu_mem_usage=True  # Helps with limited resources
            )
            
            # Use CPU or GPU based on availability
            device = "cuda" if torch.cuda.is_available() else "cpu"
            stable_diffusion_model = stable_diffusion_model.to(device)
            
            # Enable memory efficient attention if available
            try:
                stable_diffusion_model.enable_attention_slicing()
                print("✓ Enabled attention slicing for memory efficiency")
            except:
                pass
            
            print(f"✅ Stable Diffusion loaded on {device}")
            
        except ImportError as ie:
            print(f"❌ Missing dependencies: {ie}")
            print("Run: pip install diffusers transformers accelerate")
            stable_diffusion_model = None
            raise Exception("Stable Diffusion dependencies not installed")
            
        except Exception as e:
            print(f"❌ Stable Diffusion initialization error: {e}")
            stable_diffusion_model = None
            raise
    
    return stable_diffusion_model