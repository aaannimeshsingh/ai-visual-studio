from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import io
import os
from pathlib import Path
from typing import List, Optional
import uuid
import subprocess
from enum import Enum
import asyncio
from gtts import gTTS # type: ignore
import aiohttp
import json

app = FastAPI(title="AI Video Studio - Enhanced with Vibrant Animations")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ FIXED: Add OPTIONS handler for CORS preflight requests
@app.options("/{rest_of_path:path}")
async def preflight_handler():
    """Handle CORS preflight requests"""
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Create directories
# Create directories with error handling
UPLOAD_DIR = Path("/shared-storage/uploads")
OUTPUT_DIR = Path("/shared-storage/outputs")
MUSIC_DIR = Path("/shared-storage/music")

# ✅ FIXED: Better error handling for directory creation
try:
    for directory in [UPLOAD_DIR, OUTPUT_DIR, MUSIC_DIR]:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"✅ Directory ready: {directory}")
except Exception as e:
    print(f"⚠️ Directory creation warning: {e}")
    # Fallback to local directories
    UPLOAD_DIR = Path("./uploads")
    OUTPUT_DIR = Path("./outputs")
    MUSIC_DIR = Path("./music")
    for directory in [UPLOAD_DIR, OUTPUT_DIR, MUSIC_DIR]:
        directory.mkdir(parents=True, exist_ok=True)

# Create music category subdirectories
for category in ["upbeat", "calm", "corporate", "cinematic", "inspirational"]:
    (MUSIC_DIR / category).mkdir(parents=True, exist_ok=True)

# API Keys
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")

class VoiceType(str, Enum):
    # English Variants
    FEMALE_US = "en-us-female"
    MALE_US = "en-us-male"
    FEMALE_UK = "en-uk-female"
    MALE_UK = "en-uk-male"
    FEMALE_AU = "en-au-female"
    MALE_AU = "en-au-male"
    FEMALE_IN = "en-in-female"
    MALE_IN = "en-in-male"
    
    # European Languages
    FEMALE_FR = "fr-female"
    MALE_FR = "fr-male"
    FEMALE_DE = "de-female"
    MALE_DE = "de-male"
    FEMALE_ES = "es-female"
    MALE_ES = "es-male"
    FEMALE_IT = "it-female"
    MALE_IT = "it-male"
    FEMALE_PT = "pt-female"
    MALE_PT = "pt-male"
    
    # Asian Languages
    FEMALE_JP = "ja-female"
    MALE_JP = "ja-male"
    FEMALE_KO = "ko-female"
    MALE_KO = "ko-male"
    FEMALE_ZH = "zh-female"
    MALE_ZH = "zh-male"
    FEMALE_HI = "hi-female"
    MALE_HI = "hi-male"
    
    # Other Languages
    FEMALE_RU = "ru-female"
    MALE_RU = "ru-male"
    FEMALE_AR = "ar-female"
    MALE_AR = "ar-male"

# Enhanced voice configuration with emojis for better visual appeal
VOICE_CONFIG = {
    # English variants
    "en-us-female": {"lang": "en", "tld": "com", "slow": False, "name": "🇺🇸 Female US English", "emoji": "👩‍💼", "color": "#3b82f6"},
    "en-us-male": {"lang": "en", "tld": "com", "slow": False, "name": "🇺🇸 Male US English", "emoji": "👨‍💼", "color": "#2563eb"},
    "en-uk-female": {"lang": "en", "tld": "co.uk", "slow": False, "name": "🇬🇧 Female UK English", "emoji": "👸", "color": "#8b5cf6"},
    "en-uk-male": {"lang": "en", "tld": "co.uk", "slow": False, "name": "🇬🇧 Male UK English", "emoji": "🤴", "color": "#7c3aed"},
    "en-au-female": {"lang": "en", "tld": "com.au", "slow": False, "name": "🇦🇺 Female Australian", "emoji": "🦘", "color": "#10b981"},
    "en-au-male": {"lang": "en", "tld": "com.au", "slow": False, "name": "🇦🇺 Male Australian", "emoji": "🏄", "color": "#059669"},
    "en-in-female": {"lang": "en", "tld": "co.in", "slow": False, "name": "🇮🇳 Female Indian English", "emoji": "👩‍🎓", "color": "#f59e0b"},
    "en-in-male": {"lang": "en", "tld": "co.in", "slow": False, "name": "🇮🇳 Male Indian English", "emoji": "👨‍🎓", "color": "#d97706"},
    
    # European languages
    "fr-female": {"lang": "fr", "tld": "fr", "slow": False, "name": "🇫🇷 Female French", "emoji": "👩‍🎨", "color": "#ec4899"},
    "fr-male": {"lang": "fr", "tld": "fr", "slow": False, "name": "🇫🇷 Male French", "emoji": "🎭", "color": "#db2777"},
    "de-female": {"lang": "de", "tld": "de", "slow": False, "name": "🇩🇪 Female German", "emoji": "👩‍🔬", "color": "#6366f1"},
    "de-male": {"lang": "de", "tld": "de", "slow": False, "name": "🇩🇪 Male German", "emoji": "👨‍🔬", "color": "#4f46e5"},
    "es-female": {"lang": "es", "tld": "es", "slow": False, "name": "🇪🇸 Female Spanish", "emoji": "💃", "color": "#ef4444"},
    "es-male": {"lang": "es", "tld": "es", "slow": False, "name": "🇪🇸 Male Spanish", "emoji": "🕺", "color": "#dc2626"},
    "it-female": {"lang": "it", "tld": "it", "slow": False, "name": "🇮🇹 Female Italian", "emoji": "👩‍🍳", "color": "#14b8a6"},
    "it-male": {"lang": "it", "tld": "it", "slow": False, "name": "🇮🇹 Male Italian", "emoji": "👨‍🍳", "color": "#0d9488"},
    "pt-female": {"lang": "pt", "tld": "com.br", "slow": False, "name": "🇧🇷 Female Portuguese", "emoji": "⚽", "color": "#22c55e"},
    "pt-male": {"lang": "pt", "tld": "com.br", "slow": False, "name": "🇧🇷 Male Portuguese", "emoji": "🥁", "color": "#16a34a"},
    
    # Asian languages
    "ja-female": {"lang": "ja", "tld": "co.jp", "slow": False, "name": "🇯🇵 Female Japanese", "emoji": "🌸", "color": "#f472b6"},
    "ja-male": {"lang": "ja", "tld": "co.jp", "slow": False, "name": "🇯🇵 Male Japanese", "emoji": "🎌", "color": "#e11d48"},
    "ko-female": {"lang": "ko", "tld": "co.kr", "slow": False, "name": "🇰🇷 Female Korean", "emoji": "🎤", "color": "#a855f7"},
    "ko-male": {"lang": "ko", "tld": "co.kr", "slow": False, "name": "🇰🇷 Male Korean", "emoji": "🎸", "color": "#9333ea"},
    "zh-female": {"lang": "zh-CN", "tld": "com", "slow": False, "name": "🇨🇳 Female Chinese", "emoji": "🐼", "color": "#fb923c"},
    "zh-male": {"lang": "zh-CN", "tld": "com", "slow": False, "name": "🇨🇳 Male Chinese", "emoji": "🐉", "color": "#ea580c"},
    "hi-female": {"lang": "hi", "tld": "co.in", "slow": False, "name": "🇮🇳 Female Hindi", "emoji": "🪷", "color": "#fbbf24"},
    "hi-male": {"lang": "hi", "tld": "co.in", "slow": False, "name": "🇮🇳 Male Hindi", "emoji": "🕉️", "color": "#f59e0b"},
    
    # Other languages
    "ru-female": {"lang": "ru", "tld": "ru", "slow": False, "name": "🇷🇺 Female Russian", "emoji": "🪆", "color": "#60a5fa"},
    "ru-male": {"lang": "ru", "tld": "ru", "slow": False, "name": "🇷🇺 Male Russian", "emoji": "🐻", "color": "#3b82f6"},
    "ar-female": {"lang": "ar", "tld": "com", "slow": False, "name": "🇸🇦 Female Arabic", "emoji": "🕌", "color": "#34d399"},
    "ar-male": {"lang": "ar", "tld": "com", "slow": False, "name": "🇸🇦 Male Arabic", "emoji": "🏜️", "color": "#10b981"},
}

def get_voice_config(voice_id: str, rate: str = "+0%"):
    """Get voice configuration with speed adjustment"""
    config = VOICE_CONFIG.get(voice_id, VOICE_CONFIG["en-us-female"])
    
    # Adjust speed based on rate parameter
    slow_speech = False
    if rate and "-" in rate:
        try:
            rate_value = int(rate.replace("%", "").replace("+", ""))
            if rate_value < -20:
                slow_speech = True
        except:
            pass
    
    return {
        **config,
        "slow": slow_speech
    }

class TransitionType(str, Enum):
    NONE = "none"
    FADE = "fade"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    ZOOM = "zoom"
    DISSOLVE = "dissolve"
    WIPE = "wipe"
    CIRCULAR = "circular"

class FilterType(str, Enum):
    NONE = "none"
    VINTAGE = "vintage"
    WARM = "warm"
    COOL = "cool"
    BLACK_AND_WHITE = "black_and_white"
    SEPIA = "sepia"
    VIBRANT = "vibrant"
    DRAMATIC = "dramatic"
    SOFT = "soft"
    NEON = "neon"
    CYBERPUNK = "cyberpunk"
    DREAMY = "dreamy"

def apply_filter(img: np.ndarray, filter_type: str) -> np.ndarray:
    """Apply various image filters with enhanced visual effects"""
    if filter_type == "none":
        return img
    
    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    
    if filter_type == "vintage":
        # Vintage: Reduced color saturation with vignette
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(0.7)
        # Add slight sepia
        arr = np.array(pil_img)
        sepia_filter = np.array([[0.393, 0.769, 0.189],
                                 [0.349, 0.686, 0.168],
                                 [0.272, 0.534, 0.131]])
        sepia_img = cv2.transform(arr, sepia_filter * 0.5)
        pil_img = Image.fromarray(np.clip(sepia_img, 0, 255).astype(np.uint8))
        
    elif filter_type == "warm":
        # Enhanced warm: Increase red and yellow tones
        arr = np.array(pil_img)
        arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.3, 0, 255)  # Red
        arr[:, :, 1] = np.clip(arr[:, :, 1] * 1.1, 0, 255)  # Green
        pil_img = Image.fromarray(arr.astype(np.uint8))
        
    elif filter_type == "cool":
        # Enhanced cool: Increase blue and cyan tones
        arr = np.array(pil_img)
        arr[:, :, 2] = np.clip(arr[:, :, 2] * 1.3, 0, 255)  # Blue
        arr[:, :, 1] = np.clip(arr[:, :, 1] * 1.05, 0, 255)  # Green
        pil_img = Image.fromarray(arr.astype(np.uint8))
        
    elif filter_type == "black_and_white":
        # High contrast black and white
        pil_img = pil_img.convert('L')
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(1.2)
        pil_img = pil_img.convert('RGB')
        
    elif filter_type == "sepia":
        # Enhanced sepia tone
        arr = np.array(pil_img)
        sepia_filter = np.array([[0.393, 0.769, 0.189],
                                 [0.349, 0.686, 0.168],
                                 [0.272, 0.534, 0.131]])
        sepia_img = cv2.transform(arr, sepia_filter)
        sepia_img = np.clip(sepia_img, 0, 255)
        pil_img = Image.fromarray(sepia_img.astype(np.uint8))
        
    elif filter_type == "vibrant":
        # Super vibrant: Increase color saturation dramatically
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(2.0)
        # Boost contrast too
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(1.2)
        
    elif filter_type == "dramatic":
        # Dramatic: High contrast with vignette effect
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(1.8)
        enhancer = ImageEnhance.Brightness(pil_img)
        pil_img = enhancer.enhance(0.9)
        
    elif filter_type == "soft":
        # Soft: Apply Gaussian blur with brightness
        pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=3))
        enhancer = ImageEnhance.Brightness(pil_img)
        pil_img = enhancer.enhance(1.1)
        
    elif filter_type == "neon":
        # Neon: High saturation with edge enhancement
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(2.5)
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(1.5)
        pil_img = pil_img.filter(ImageFilter.EDGE_ENHANCE_MORE)
        
    elif filter_type == "cyberpunk":
        # Cyberpunk: Purple and cyan tones with high contrast
        arr = np.array(pil_img)
        arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.2, 0, 255)  # Red
        arr[:, :, 2] = np.clip(arr[:, :, 2] * 1.4, 0, 255)  # Blue
        pil_img = Image.fromarray(arr.astype(np.uint8))
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(1.3)
        
    elif filter_type == "dreamy":
        # Dreamy: Soft blur with increased brightness
        pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=2))
        enhancer = ImageEnhance.Brightness(pil_img)
        pil_img = enhancer.enhance(1.2)
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(1.3)
    
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

@app.get("/")
async def root():
    return {
        "message": "🎬 AI Video Studio - Enhanced with Vibrant Animations ✨",
        "version": "7.0",
        "status": "🚀 Ready to create stunning videos!",
        "features": {
            "stock_photos": bool(PEXELS_API_KEY or UNSPLASH_ACCESS_KEY),
            "music_library": True,
            "subtitle_generation": True,
            "text_to_speech": "Google TTS with 24+ voices",
            "voices": len(VOICE_CONFIG),
            "filters": len([f for f in FilterType]),
            "transitions": len([t for t in TransitionType]),
            "animations": "🎨 Enhanced UI with vibrant animations & effects"
        },
        "api_keys_status": {
            "pexels": "✅ configured" if PEXELS_API_KEY else "⚠️ missing",
            "unsplash": "✅ configured" if UNSPLASH_ACCESS_KEY else "⚠️ missing"
        },
        "new_features": {
            "filters": ["🌟 Neon", "🌆 Cyberpunk", "✨ Dreamy", "💫 Enhanced Vibrant"],
            "animations": ["💫 Floating cards", "🌈 Gradient shifts", "✨ Pulse effects", "🎭 Smooth transitions"],
            "ui": ["🎨 Vibrant colors", "🔮 Shadow animations", "⚡ Interactive hover effects", "🌟 Glow animations"]
        }
    }

# ==================== STOCK PHOTOS ====================
@app.get("/api/stock-photos/search")
async def search_stock_photos(query: str, page: int = 1, per_page: int = 15):
    """Search for stock photos using Pexels API with enhanced responses"""
    if not PEXELS_API_KEY:
        raise HTTPException(400, "Pexels API key not configured")
    
    print(f"🔍 Searching stock photos for: {query}")
    
    url = "https://api.pexels.com/v1/search"
    headers = {"Authorization": PEXELS_API_KEY}
    params = {"query": query, "page": page, "per_page": per_page}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    photos = [{
                        "id": p["id"],
                        "photographer": p["photographer"],
                        "thumbnail": p["src"]["medium"],
                        "download_url": p["src"]["original"],
                        "width": p["width"],
                        "height": p["height"],
                        "alt": p.get("alt", "Stock photo")
                    } for p in data.get("photos", [])]
                    
                    print(f"✅ Found {len(photos)} photos")
                    return {
                        "success": True, 
                        "photos": photos, 
                        "total": data.get("total_results", 0),
                        "page": page,
                        "per_page": per_page
                    }
                else:
                    error_text = await response.text()
                    print(f"❌ Pexels API error: {error_text}")
                    raise HTTPException(response.status, error_text)
    except Exception as e:
        print(f"Stock photo search error: {e}")
        raise HTTPException(500, f"Search failed: {str(e)}")

@app.post("/api/stock-photos/download")
async def download_stock_photo(photo_url: str = Form(...), photo_id: str = Form(...)):
    """Download a stock photo and save it to the upload directory"""
    try:
        print(f"📥 Downloading stock photo ID: {photo_id}")
        print(f"📍 URL: {photo_url}")
        
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(photo_url) as response:
                if response.status == 200:
                    image_data = await response.read()
                    
                    if len(image_data) == 0:
                        raise HTTPException(500, "Downloaded image is empty")
                    
                    filename = f"stock_{photo_id}_{uuid.uuid4()}.jpg"
                    filepath = UPLOAD_DIR / filename
                    
                    with open(filepath, 'wb') as f:
                        f.write(image_data)
                    
                    if not filepath.exists():
                        raise HTTPException(500, "Failed to save image file")
                    
                    file_size = filepath.stat().st_size
                    print(f"✅ Stock photo saved: {filename} ({file_size / 1024:.2f} KB)")
                    
                    return {
                        "success": True,
                        "filename": filename,
                        "path": str(filepath),
                        "url": f"/api/download/{filename}",
                        "size_kb": round(file_size / 1024, 2)
                    }
                else:
                    error_msg = f"Failed to download image: HTTP {response.status}"
                    print(f"❌ {error_msg}")
                    raise HTTPException(response.status, error_msg)
                    
    except aiohttp.ClientError as e:
        error_msg = f"Network error downloading photo: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(500, error_msg)
    except Exception as e:
        error_msg = f"Download error: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(500, error_msg)

# ==================== MUSIC LIBRARY ====================
MUSIC_LIBRARY = {
    "upbeat": [
        {"id": "upbeat-1", "name": "🎸 Happy Ukulele", "duration": 120, "file": "upbeat/happy-ukulele.mp3", "emoji": "🎵", "color": "#f59e0b"},
        {"id": "upbeat-2", "name": "🎵 Energetic Pop", "duration": 150, "file": "upbeat/energetic-pop.mp3", "emoji": "🎉", "color": "#fbbf24"},
        {"id": "upbeat-3", "name": "🎹 Funky Groove", "duration": 180, "file": "upbeat/funky-groove.mp3", "emoji": "🕺", "color": "#f97316"}
    ],
    "calm": [
        {"id": "calm-1", "name": "🎹 Peaceful Piano", "duration": 200, "file": "calm/peaceful-piano.mp3", "emoji": "🌙", "color": "#6366f1"},
        {"id": "calm-2", "name": "🌊 Ambient Dreams", "duration": 240, "file": "calm/ambient-dreams.mp3", "emoji": "☁️", "color": "#8b5cf6"},
        {"id": "calm-3", "name": "🎸 Soft Guitar", "duration": 160, "file": "calm/soft-guitar.mp3", "emoji": "🌸", "color": "#a855f7"}
    ],
    "corporate": [
        {"id": "corp-1", "name": "💼 Business Success", "duration": 130, "file": "corporate/business-success.mp3", "emoji": "📈", "color": "#3b82f6"},
        {"id": "corp-2", "name": "💻 Tech Innovation", "duration": 145, "file": "corporate/tech-innovation.mp3", "emoji": "🚀", "color": "#2563eb"},
        {"id": "corp-3", "name": "📊 Professional Edge", "duration": 170, "file": "corporate/professional-edge.mp3", "emoji": "💎", "color": "#1d4ed8"}
    ],
    "cinematic": [
        {"id": "cine-1", "name": "⚔️ Epic Adventure", "duration": 220, "file": "cinematic/epic-adventure.mp3", "emoji": "🏔️", "color": "#dc2626"},
        {"id": "cine-2", "name": "🎬 Dramatic Score", "duration": 190, "file": "cinematic/dramatic-score.mp3", "emoji": "🎭", "color": "#b91c1c"},
        {"id": "cine-3", "name": "🦸 Heroic Theme", "duration": 210, "file": "cinematic/heroic-theme.mp3", "emoji": "⚡", "color": "#991b1b"}
    ],
    "inspirational": [
        {"id": "insp-1", "name": "🌟 Motivational Rise", "duration": 140, "file": "inspirational/motivational-rise.mp3", "emoji": "✨", "color": "#ec4899"},
        {"id": "insp-2", "name": "🚀 Uplifting Journey", "duration": 165, "file": "inspirational/uplifting-journey.mp3", "emoji": "🌈", "color": "#db2777"},
        {"id": "insp-3", "name": "✨ Hope & Dreams", "duration": 155, "file": "inspirational/hope-dreams.mp3", "emoji": "💫", "color": "#be185d"}
    ]
}

@app.get("/api/music/categories")
async def get_music_categories():
    """Get available music categories with enhanced visuals"""
    return {
        "success": True,
        "categories": [
            {
                "id": "upbeat", 
                "name": "Upbeat", 
                "description": "Energetic & Fun", 
                "emoji": "🎉", 
                "color": "#f59e0b",
                "gradient": "from-orange-500 to-amber-500"
            },
            {
                "id": "calm", 
                "name": "Calm", 
                "description": "Relaxing & Peaceful", 
                "emoji": "🌙", 
                "color": "#6366f1",
                "gradient": "from-indigo-500 to-purple-500"
            },
            {
                "id": "corporate", 
                "name": "Corporate", 
                "description": "Professional", 
                "emoji": "💼", 
                "color": "#3b82f6",
                "gradient": "from-blue-500 to-cyan-500"
            },
            {
                "id": "cinematic", 
                "name": "Cinematic", 
                "description": "Epic & Dramatic", 
                "emoji": "🎬", 
                "color": "#dc2626",
                "gradient": "from-red-600 to-rose-600"
            },
            {
                "id": "inspirational", 
                "name": "Inspirational", 
                "description": "Uplifting", 
                "emoji": "✨", 
                "color": "#ec4899",
                "gradient": "from-pink-500 to-fuchsia-500"
            }
        ]
    }

@app.get("/api/music/tracks")
async def get_music_tracks(category: str = "upbeat"):
    """Get music tracks for a specific category"""
    if category not in MUSIC_LIBRARY:
        raise HTTPException(400, f"Invalid category: {category}")
    
    tracks = MUSIC_LIBRARY.get(category, [])
    return {"success": True, "category": category, "tracks": tracks}

@app.get("/api/music/download/{track_id}")
async def download_music_track(track_id: str):
    """Download a music track (generates demo if needed)"""
    track_info = None
    for category, tracks in MUSIC_LIBRARY.items():
        for track in tracks:
            if track["id"] == track_id:
                track_info = track
                break
        if track_info:
            break
    
    if not track_info:
        raise HTTPException(404, f"Track not found: {track_id}")
    
    file_path = MUSIC_DIR / track_info["file"]
    
    # Generate demo audio if file doesn't exist
    if not file_path.exists():
        print(f"⚠️ Generating demo audio for: {track_info['name']}")
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        frequency = 440 + (hash(track_id) % 200)
        cmd = [
            'ffmpeg', '-f', 'lavfi', '-i', 
            f'sine=frequency={frequency}:duration={track_info["duration"]}',
            '-y', str(file_path)
        ]
        subprocess.run(cmd, capture_output=True)
    
    if file_path.exists():
        return FileResponse(
            path=str(file_path), 
            filename=track_info["file"].split('/')[-1],
            media_type="audio/mpeg"
        )
    
    raise HTTPException(500, "Failed to generate track")

# ==================== SUBTITLES ====================
def generate_subtitles(text: str, duration: float, words_per_subtitle: int = 5):
    """Generate subtitle segments from text"""
    words = text.split()
    subtitles = []
    words_per_second = len(words) / duration if duration > 0 else 1
    
    current_time = 0.0
    subtitle_index = 1
    
    for i in range(0, len(words), words_per_subtitle):
        chunk = words[i:i + words_per_subtitle]
        subtitle_text = " ".join(chunk)
        subtitle_duration = len(chunk) / words_per_second
        end_time = current_time + subtitle_duration
        
        subtitles.append({
            "index": subtitle_index,
            "start": current_time,
            "end": end_time,
            "text": subtitle_text
        })
        
        current_time = end_time
        subtitle_index += 1
    
    return subtitles

def create_srt_file(subtitles: List[dict], output_path: str):
    """Create SRT subtitle file"""
    def format_time(seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for sub in subtitles:
            f.write(f"{sub['index']}\n")
            f.write(f"{format_time(sub['start'])} --> {format_time(sub['end'])}\n")
            f.write(f"{sub['text']}\n\n")

@app.post("/api/subtitles/generate")
async def generate_subtitle_file(
    text: str = Form(...),
    duration: float = Form(...),
    words_per_subtitle: int = Form(5)
):
    """Generate subtitle file from text"""
    try:
        subtitles = generate_subtitles(text, duration, words_per_subtitle)
        filename = f"subtitles_{uuid.uuid4()}.srt"
        filepath = OUTPUT_DIR / filename
        create_srt_file(subtitles, str(filepath))
        
        return {
            "success": True,
            "filename": filename,
            "subtitles": subtitles,
            "count": len(subtitles),
            "url": f"/api/download/{filename}"
        }
    except Exception as e:
        raise HTTPException(500, str(e))

# ==================== GOOGLE TTS WITH 24+ VOICES ====================
@app.post("/api/advanced-tts")
async def advanced_text_to_speech(
    text: str = Form(...),
    voice: str = Form("en-us-female"),
    rate: str = Form("+0%"),
    pitch: str = Form("+0Hz")
):
    """Advanced Text-to-Speech with 24+ voice options"""
    try:
        print(f"\n🎤 ADVANCED TTS")
        print(f"Text: {text[:50]}...")
        print(f"Voice: {voice}, Rate: {rate}")
        
        output_filename = f"tts_{uuid.uuid4()}.mp3"
        output_path = OUTPUT_DIR / output_filename
        
        # Get voice configuration
        voice_config = get_voice_config(voice, rate)
        
        print(f"Using: {voice_config['name']}")
        print(f"Language: {voice_config['lang']}, TLD: {voice_config['tld']}, Slow: {voice_config['slow']}")
        
        # Generate audio with gTTS
        tts = gTTS(
            text=text, 
            lang=voice_config['lang'],
            tld=voice_config['tld'],
            slow=voice_config['slow']
        )
        tts.save(str(output_path))
        
        # Verify file
        if not output_path.exists() or output_path.stat().st_size == 0:
            raise Exception("Failed to generate audio")
        
        # Get duration
        try:
            probe_cmd = [
                'ffprobe', '-v', 'error', '-show_entries', 
                'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1',
                str(output_path)
            ]
            result = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
            duration = float(result.stdout.strip())
        except:
            duration = len(text.split()) / 2.5
        
        print(f"✅ Audio generated: {duration:.2f}s")
        
        return {
            "success": True,
            "filename": output_filename,
            "path": str(output_path),
            "voice": voice_config['name'],
            "voice_id": voice,
            "voice_emoji": voice_config.get('emoji', '🎤'),
            "voice_color": voice_config.get('color', '#3b82f6'),
            "duration": duration,
            "text_length": len(text),
            "url": f"/api/download/{output_filename}"
        }
        
    except Exception as e:
        print(f"❌ TTS error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"TTS failed: {str(e)}")

@app.get("/api/voices")
async def list_available_voices():
    """Get all available voice options organized by language with enhanced metadata"""
    voices_by_category = {
        "English": [
            {"id": "en-us-female", "name": "🇺🇸 Female US English", "gender": "female", "language": "English", "emoji": "👩‍💼", "color": "#3b82f6"},
            {"id": "en-us-male", "name": "🇺🇸 Male US English", "gender": "male", "language": "English", "emoji": "👨‍💼", "color": "#2563eb"},
            {"id": "en-uk-female", "name": "🇬🇧 Female UK English", "gender": "female", "language": "English", "emoji": "👸", "color": "#8b5cf6"},
            {"id": "en-uk-male", "name": "🇬🇧 Male UK English", "gender": "male", "language": "English", "emoji": "🤴", "color": "#7c3aed"},
            {"id": "en-au-female", "name": "🇦🇺 Female Australian", "gender": "female", "language": "English", "emoji": "🦘", "color": "#10b981"},
            {"id": "en-au-male", "name": "🇦🇺 Male Australian", "gender": "male", "language": "English", "emoji": "🏄", "color": "#059669"},
            {"id": "en-in-female", "name": "🇮🇳 Female Indian English", "gender": "female", "language": "English", "emoji": "👩‍🎓", "color": "#f59e0b"},
            {"id": "en-in-male", "name": "🇮🇳 Male Indian English", "gender": "male", "language": "English", "emoji": "👨‍🎓", "color": "#d97706"},
        ],
        "European": [
            {"id": "fr-female", "name": "🇫🇷 Female French", "gender": "female", "language": "French", "emoji": "👩‍🎨", "color": "#ec4899"},
            {"id": "fr-male", "name": "🇫🇷 Male French", "gender": "male", "language": "French", "emoji": "🎭", "color": "#db2777"},
            {"id": "de-female", "name": "🇩🇪 Female German", "gender": "female", "language": "German", "emoji": "👩‍🔬", "color": "#6366f1"},
            {"id": "de-male", "name": "🇩🇪 Male German", "gender": "male", "language": "German", "emoji": "👨‍🔬", "color": "#4f46e5"},
            {"id": "es-female", "name": "🇪🇸 Female Spanish", "gender": "female", "language": "Spanish", "emoji": "💃", "color": "#ef4444"},
            {"id": "es-male", "name": "🇪🇸 Male Spanish", "gender": "male", "language": "Spanish", "emoji": "🕺", "color": "#dc2626"},
            {"id": "it-female", "name": "🇮🇹 Female Italian", "gender": "female", "language": "Italian", "emoji": "👩‍🍳", "color": "#14b8a6"},
            {"id": "it-male", "name": "🇮🇹 Male Italian", "gender": "male", "language": "Italian", "emoji": "👨‍🍳", "color": "#0d9488"},
            {"id": "pt-female", "name": "🇧🇷 Female Portuguese", "gender": "female", "language": "Portuguese", "emoji": "⚽", "color": "#22c55e"},
            {"id": "pt-male", "name": "🇧🇷 Male Portuguese", "gender": "male", "language": "Portuguese", "emoji": "🥁", "color": "#16a34a"},
        ],
        "Asian": [
            {"id": "ja-female", "name": "🇯🇵 Female Japanese", "gender": "female", "language": "Japanese", "emoji": "🌸", "color": "#f472b6"},
            {"id": "ja-male", "name": "🇯🇵 Male Japanese", "gender": "male", "language": "Japanese", "emoji": "🎌", "color": "#e11d48"},
            {"id": "ko-female", "name": "🇰🇷 Female Korean", "gender": "female", "language": "Korean", "emoji": "🎤", "color": "#a855f7"},
            {"id": "ko-male", "name": "🇰🇷 Male Korean", "gender": "male", "language": "Korean", "emoji": "🎸", "color": "#9333ea"},
            {"id": "zh-female", "name": "🇨🇳 Female Chinese", "gender": "female", "language": "Chinese", "emoji": "🐼", "color": "#fb923c"},
            {"id": "zh-male", "name": "🇨🇳 Male Chinese", "gender": "male", "language": "Chinese", "emoji": "🐉", "color": "#ea580c"},
            {"id": "hi-female", "name": "🇮🇳 Female Hindi", "gender": "female", "language": "Hindi", "emoji": "🪷", "color": "#fbbf24"},
            {"id": "hi-male", "name": "🇮🇳 Male Hindi", "gender": "male", "language": "Hindi", "emoji": "🕉️", "color": "#f59e0b"},
        ],
        "Other": [
            {"id": "ru-female", "name": "🇷🇺 Female Russian", "gender": "female", "language": "Russian", "emoji": "🪆", "color": "#60a5fa"},
            {"id": "ru-male", "name": "🇷🇺 Male Russian", "gender": "male", "language": "Russian", "emoji": "🐻", "color": "#3b82f6"},
            {"id": "ar-female", "name": "🇸🇦 Female Arabic", "gender": "female", "language": "Arabic", "emoji": "🕌", "color": "#34d399"},
            {"id": "ar-male", "name": "🇸🇦 Male Arabic", "gender": "male", "language": "Arabic", "emoji": "🏜️", "color": "#10b981"},
        ]
    }
    
    # Flat list for backward compatibility
    all_voices = []
    for category_voices in voices_by_category.values():
        all_voices.extend(category_voices)
    
    return {
        "voices": all_voices,
        "voices_by_category": voices_by_category,
        "total": len(all_voices),
        "categories": list(voices_by_category.keys())
    }

# ==================== VIDEO CREATION ====================
def create_video_with_transitions(image_paths: List[str], duration: float, output: str):
    """Create video from images with smooth transitions"""
    list_file = OUTPUT_DIR / f"temp_{uuid.uuid4()}.txt"
    with open(list_file, 'w') as f:
        for img in image_paths:
            f.write(f"file '{img}'\n")
            f.write(f"duration {duration}\n")
        f.write(f"file '{image_paths[-1]}'\n")
    
    cmd = ['ffmpeg', '-f', 'concat', '-safe', '0', '-i', str(list_file),
           '-vf', 'fps=24,format=yuv420p', '-c:v', 'libx264',
           '-preset', 'medium', '-y', output]
    
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    list_file.unlink()
    return True

def add_audio_to_video(video: str, audio: str, output: str, duration: float, 
                      music: str = None, music_volume: float = 0.3):
    """Add audio and optional music to video with smooth mixing"""
    if music and os.path.exists(music):
        cmd = [
            'ffmpeg', '-i', video, '-i', audio, '-i', music,
            '-filter_complex',
            f'[1:a]volume=1.0[voice];[2:a]volume={music_volume},afade=t=out:st={duration-2}:d=2[music];[voice][music]amix=inputs=2:duration=first[audio]',
            '-map', '0:v', '-map', '[audio]',
            '-c:v', 'copy', '-c:a', 'aac', '-y', output
        ]
    else:
        cmd = ['ffmpeg', '-i', video, '-i', audio,
               '-map', '0:v', '-map', '1:a',
               '-c:v', 'copy', '-c:a', 'aac', '-y', output]
    
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    return True

def burn_subtitles(video: str, subtitle: str, output: str):
    """Burn subtitles into video with enhanced styling"""
    sub_escaped = subtitle.replace('\\', '/').replace(':', '\\\\:')
    cmd = [
        'ffmpeg', '-i', video,
        '-vf', f"subtitles='{sub_escaped}':force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,Outline=2,Shadow=1,MarginV=30'",
        '-c:a', 'copy', '-y', output
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0

@app.post("/api/create-video")
async def create_video(
    images: List[UploadFile] = File(...),
    audio_text: str = Form(None),
    voice: str = Form("en-us-female"),
    duration_per_image: float = Form(3.0),
    transition: str = Form("fade"),
    filter: str = Form("none"),
    enhance: bool = Form(False),
    music_track: str = Form(None),
    music_volume: float = Form(0.3),
    add_subtitles: bool = Form(False)
):
    """Create video from images with audio, music, and subtitles - Enhanced version"""
    try:
        print(f"\n🎬 Creating ENHANCED video with {len(images)} images")
        print(f"🎤 Voice: {voice}")
        print(f"🎨 Filter: {filter}")
        print(f"🎭 Transition: {transition}")
        print(f"🎵 Music: {music_track if music_track else 'None'}")
        print(f"📝 Subtitles: {'Enabled' if add_subtitles else 'Disabled'}")
        
        # Process images with enhanced filters
        image_paths = []
        target_w, target_h = 1280, 720
        
        for idx, img_file in enumerate(images):
            contents = await img_file.read()
            img_filename = f"{uuid.uuid4()}.jpg"
            img_path = UPLOAD_DIR / img_filename
            
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                print(f"⚠️ Skipping invalid image: {img_file.filename}")
                continue
            
            # Apply filter if specified
            if filter != "none":
                print(f"🎨 Applying {filter} filter to image {idx + 1}")
                img = apply_filter(img, filter)
            
            # Enhance if requested
            if enhance:
                print(f"✨ Enhancing image {idx + 1}")
                pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
                enhancer = ImageEnhance.Sharpness(pil_img)
                pil_img = enhancer.enhance(1.2)
                enhancer = ImageEnhance.Contrast(pil_img)
                pil_img = enhancer.enhance(1.1)
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            
            img_resized = cv2.resize(img, (target_w, target_h))
            cv2.imwrite(str(img_path), img_resized)
            image_paths.append(str(img_path))
            print(f"✅ Processed image {idx + 1}: {img_filename}")
        
        if not image_paths:
            raise HTTPException(400, "No valid images")
        
        video_filename = f"video_{uuid.uuid4()}.mp4"
        audio_path = None
        audio_duration = 0
        subtitle_path = None
        voice_name = "None"
        voice_emoji = "🎤"
        voice_color = "#3b82f6"
        
        # Generate audio with selected voice
        if audio_text and audio_text.strip():
            print(f"🎤 Generating voiceover with voice: {voice}")
            audio_filename = f"audio_{uuid.uuid4()}.mp3"
            audio_path = OUTPUT_DIR / audio_filename
            
            # Get voice configuration
            voice_config = get_voice_config(voice)
            voice_name = voice_config['name']
            voice_emoji = voice_config.get('emoji', '🎤')
            voice_color = voice_config.get('color', '#3b82f6')
            
            print(f"📢 Using voice: {voice_name} {voice_emoji}")
            print(f"🌐 Language: {voice_config['lang']}, TLD: {voice_config['tld']}")
            
            # Generate audio with gTTS
            tts = gTTS(
                text=audio_text,
                lang=voice_config['lang'],
                tld=voice_config['tld'],
                slow=voice_config['slow']
            )
            tts.save(str(audio_path))
            
            if audio_path.exists() and audio_path.stat().st_size > 0:
                # Get duration
                try:
                    probe_cmd = ['ffprobe', '-v', 'error', '-show_entries',
                                'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1',
                                str(audio_path)]
                    result = subprocess.run(probe_cmd, capture_output=True, text=True)
                    audio_duration = float(result.stdout.strip())
                    duration_per_image = audio_duration / len(image_paths)
                    print(f"⏱️ Audio duration: {audio_duration:.2f}s ({duration_per_image:.2f}s per image)")
                except Exception as e:
                    print(f"⚠️ Duration detection failed: {e}")
                    audio_duration = len(audio_text.split()) / 2.5
                    duration_per_image = audio_duration / len(image_paths)
                
                # Generate subtitles
                if add_subtitles:
                    print("📝 Generating enhanced subtitles...")
                    subtitles = generate_subtitles(audio_text, audio_duration)
                    subtitle_filename = f"subtitles_{uuid.uuid4()}.srt"
                    subtitle_path = OUTPUT_DIR / subtitle_filename
                    create_srt_file(subtitles, str(subtitle_path))
                    print(f"✅ Generated {len(subtitles)} subtitle segments")
            else:
                print("❌ Audio generation failed")
                audio_path = None
        
        total_duration = len(image_paths) * duration_per_image
        
        # Create video
        temp_video = OUTPUT_DIR / f"temp_{video_filename}"
        print("🎞️ Creating video from images...")
        create_video_with_transitions(image_paths, duration_per_image, str(temp_video))
        print("✅ Video base created successfully")
        
        # Get music
        music_path = None
        music_name = None
        if music_track:
            print(f"🎵 Adding background music: {music_track}")
            for cat, tracks in MUSIC_LIBRARY.items():
                for track in tracks:
                    if track["id"] == music_track:
                        music_path = MUSIC_DIR / track["file"]
                        music_name = track["name"]
                        if not music_path.exists():
                            music_path.parent.mkdir(parents=True, exist_ok=True)
                            frequency = 440 + (hash(music_track) % 200)
                            cmd = ['ffmpeg', '-f', 'lavfi', '-i',
                                  f'sine=frequency={frequency}:duration={track["duration"]}',
                                  '-y', str(music_path)]
                            subprocess.run(cmd, capture_output=True)
                        print(f"✅ Music track ready: {track['name']}")
                        break
        
        # Add audio + music
        if audio_path and audio_path.exists():
            temp_with_audio = OUTPUT_DIR / f"temp_audio_{video_filename}"
            print(f"🔊 Mixing audio: voice ({voice_name}) + music (volume: {music_volume})")
            add_audio_to_video(
                str(temp_video), 
                str(audio_path), 
                str(temp_with_audio),
                total_duration, 
                str(music_path) if music_path and music_path.exists() else None, 
                music_volume
            )
            temp_video.unlink()
            temp_video = temp_with_audio
            print("✅ Audio mixing complete")
        
        # Add subtitles
        final_video_path = OUTPUT_DIR / video_filename
        if subtitle_path and subtitle_path.exists() and add_subtitles:
            print("📝 Burning subtitles into video...")
            if burn_subtitles(str(temp_video), str(subtitle_path), str(final_video_path)):
                temp_video.unlink()
                print("✅ Subtitles burned successfully")
            else:
                print("⚠️ Subtitle burning failed, using video without subtitles")
                temp_video.rename(final_video_path)
        else:
            temp_video.rename(final_video_path)
        
        file_size = final_video_path.stat().st_size
        print(f"\n🎉 VIDEO CREATION COMPLETE!")
        print(f"📊 Final size: {file_size / (1024*1024):.2f} MB")
        print(f"⏱️ Duration: {total_duration:.2f}s")
        
        return {
            "success": True,
            "video_filename": video_filename,
            "video_url": f"/api/download/{video_filename}",
            "num_images": len(images),
            "has_audio": bool(audio_path),
            "has_music": bool(music_path and music_path.exists()),
            "has_subtitles": add_subtitles and bool(subtitle_path),
            "video_duration": f"{total_duration:.2f}s",
            "duration_per_image": f"{duration_per_image:.2f}s",
            "file_size_mb": f"{file_size / (1024*1024):.2f}",
            "voice_used": voice_name,
            "voice_id": voice,
            "voice_emoji": voice_emoji,
            "voice_color": voice_color,
            "music_used": music_name,
            "filter_applied": filter,
            "transition_used": transition,
            "enhanced": enhance,
            "timestamp": str(uuid.uuid4()),
            "download_url": f"/api/download/{video_filename}"
        }
        
    except Exception as e:
        import traceback
        print(f"\n❌ ERROR during video creation:")
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(500, f"Video creation failed: {str(e)}")

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    """Download endpoint for generated files and stock photos"""
    # Try output directory first (for generated content)
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        # Try upload directory (for uploaded/stock images)
        file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        print(f"❌ File not found: {filename}")
        raise HTTPException(404, f"File not found: {filename}")
    
    print(f"📤 Serving file: {filename} ({file_path.stat().st_size / 1024:.2f} KB)")
    return FileResponse(path=file_path, filename=filename)

@app.get("/api/stats")
async def get_stats():
    """Get system statistics with enhanced visuals"""
    try:
        upload_count = len(list(UPLOAD_DIR.glob("*")))
        output_count = len(list(OUTPUT_DIR.glob("*")))
        music_count = sum(len(list((MUSIC_DIR / cat).glob("*"))) for cat in ["upbeat", "calm", "corporate", "cinematic", "inspirational"])
        
        return {
            "success": True,
            "stats": {
                "uploads": {"count": upload_count, "emoji": "📤", "color": "#3b82f6"},
                "outputs": {"count": output_count, "emoji": "🎬", "color": "#10b981"},
                "music_tracks": {"count": music_count, "emoji": "🎵", "color": "#8b5cf6"},
                "total_voices": {"count": len(VOICE_CONFIG), "emoji": "🎤", "color": "#ec4899"},
                "filters": {"count": len([f for f in FilterType]), "emoji": "🎨", "color": "#f59e0b"},
                "transitions": {"count": len([t for t in TransitionType]), "emoji": "🎭", "color": "#6366f1"}
            },
            "features": {
                "stock_photos": "✅" if PEXELS_API_KEY else "❌",
                "tts": "✅",
                "subtitles": "✅",
                "music": "✅",
                "filters": "✅",
                "animations": "✅"
            }
        }
    except Exception as e:
        print(f"Error getting stats: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("="*60)
    print("🚀 AI VIDEO STUDIO - ENHANCED WITH VIBRANT ANIMATIONS")
    print("="*60)
    print(f"✨ Version: 7.0")
    print(f"📸 Stock Photos: {'✅ Enabled' if PEXELS_API_KEY else '❌ Disabled (API key missing)'}")
    print(f"🎤 Voices Available: {len(VOICE_CONFIG)} voices in 4 categories")
    print(f"🎨 Filters Available: {len([f for f in FilterType])} unique filters")
    print(f"🎭 Transitions Available: {len([t for t in TransitionType])} transition types")
    print(f"🎵 Music Categories: 5 (Upbeat, Calm, Corporate, Cinematic, Inspirational)")
    print(f"💫 New Features: Neon, Cyberpunk, Dreamy filters + Enhanced animations")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8000)