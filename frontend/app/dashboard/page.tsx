'use client';

import { useState, useEffect } from 'react';
import ImageUpload from '@/components/ImageUpload';
import AuthModal from '@/components/AuthModal';
import AdvancedTTS from '@/components/AdvancedTTS';
import StockPhotoSearch from '@/components/StockPhotoSearch';
import MusicLibrary from '@/components/MusicLibrary';
import SubtitleGenerator from '@/components/SubtitleGenerator';
import { ImagePreview } from '@/types';
import { createVideo, textToSpeech, getProjects, createProject } from '@/lib/api';
import { auth } from '@/lib/auth';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [voiceoverText, setVoiceoverText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('en-us-female');
  const [durationPerImage, setDurationPerImage] = useState(3);
  const [transition, setTransition] = useState('fade');
  const [filter, setFilter] = useState('none');
  const [enhance, setEnhance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [projectHistory, setProjectHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [showAdvancedTTS, setShowAdvancedTTS] = useState(false);
  
  const [showStockPhotos, setShowStockPhotos] = useState(false);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [wordsPerSubtitle, setWordsPerSubtitle] = useState(5);
  const [audioDuration, setAudioDuration] = useState(0);

  // Animation states
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
    
    const { data: { subscription } } = auth.onAuthStateChange((authUser) => {
      setUser(authUser);
      if (authUser) {
        loadProjectHistory(authUser.id);
      } else {
        setProjectHistory([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const session = await auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadProjectHistory(session.user.id);
      }
    } catch (err) {
      console.error('Error checking auth:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setUser(null);
    setProjectHistory([]);
    setShowHistory(false);
  };

  const loadProjectHistory = async (userId: string) => {
    if (!userId) return;
    
    try {
      const response = await getProjects(userId);
      if (response.success) {
        setProjectHistory(response.projects || []);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const saveProject = async () => {
    if (!user) {
      alert('Please sign in to save projects');
      setShowAuthModal(true);
      return;
    }

    if (!projectTitle.trim()) {
      alert('Please enter a project title');
      return;
    }

    try {
      await createProject(user.id, projectTitle, voiceoverText);
      alert('Project saved!');
      await loadProjectHistory(user.id);
    } catch (err) {
      console.error('Error saving project:', err);
      alert('Failed to save project');
    }
  };

  const loadProject = (project: any) => {
    setVoiceoverText(project.description || '');
    setProjectTitle(project.title);
    setShowHistory(false);
  };

  const handleStockPhotoSelected = (file: File, preview: string) => {
    const newImage: ImagePreview = {
      file,
      preview,
      effect: 'none',
    };
    setImages(prev => [...prev, newImage]);
  };

  const handleMusicSelected = (trackId: string, volume: number) => {
    setSelectedMusicTrack(trackId);
    setMusicVolume(volume);
  };

  const handleSubtitlesChanged = (enabled: boolean, words: number) => {
    setSubtitlesEnabled(enabled);
    setWordsPerSubtitle(words);
  };

  const handleAudioGenerated = (url: string) => {
    console.log('Audio preview generated:', url);
  };

  const handleCreateVideo = async () => {
    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 1000);

    const stages = [
      'Uploading images...',
      'Applying filters and effects...',
      'Generating AI voiceover...',
      'Creating video with transitions...',
      'Adding audio to video...',
      'Finalizing and encoding...'
    ];
    
    let stageIndex = 0;
    const stageInterval = setInterval(() => {
      if (stageIndex < stages.length) {
        setProcessingStage(stages[stageIndex]);
        stageIndex++;
      } else {
        clearInterval(stageInterval);
      }
    }, 2000);

    try {
      const imageFiles = images.map(img => img.file);
      const response = await createVideo(
        imageFiles,
        voiceoverText,
        durationPerImage,
        selectedVoice,
        transition,
        filter,
        enhance,
        selectedMusicTrack,
        musicVolume,
        subtitlesEnabled
      );
      
      clearInterval(progressInterval);
      clearInterval(stageInterval);
      setProgress(100);
      setProcessingStage('Complete!');
      setResult(response);
    } catch (err: any) {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
      setError(err.response?.data?.error || 'Failed to create video');
      console.error('Error creating video:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestTTS = async () => {
    if (!voiceoverText.trim()) {
      setError('Please enter some text for voiceover');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await textToSpeech(voiceoverText);
      alert(`Audio generated successfully! Filename: ${response.filename}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate audio');
      console.error('Error generating audio:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    setImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: ImagePreview[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      effect: 'none',
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl">🎬</div>
            </div>
          </div>
          <p className="mt-6 text-gray-600 font-medium animate-pulse">Loading AI Video Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animated-header {
          background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
          background-size: 400% 400%;
          animation: gradient-shift 10s ease infinite;
        }
        .float { animation: float 3s ease-in-out infinite; }
      `}</style>

      <header className="animated-header shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 animate-fade-in-down">
              <div className="text-5xl float drop-shadow-lg">🎬</div>
              <div>
                <h1 className="text-4xl font-black text-white drop-shadow-lg">
                  AI Video Studio Pro
                </h1>
                <p className="text-white/90 mt-1 font-medium">Create amazing videos with professional features ✨</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 animate-fade-in-down animation-delay-200">
              {user && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-6 py-3 bg-white/30 backdrop-blur-md text-white rounded-xl hover:bg-white/40 hover:shadow-2xl transform hover:scale-110 transition-all duration-300 font-bold border-2 border-white/40"
                >
                  📚 {showHistory ? 'Hide' : 'Show'} History
                </button>
              )}
              
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right bg-white/30 backdrop-blur-md px-4 py-3 rounded-xl border-2 border-white/40 transform hover:scale-105 transition-all">
                    <p className="text-sm font-bold text-white">{user.user_metadata?.full_name || 'User'}</p>
                    <p className="text-xs text-white/90">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 hover:shadow-2xl transform hover:scale-110 transition-all duration-300 font-bold"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-8 py-3 bg-white text-purple-600 font-black rounded-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 text-lg"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {!user && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg shadow-md animate-slide-in-left">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-400 mr-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">
                  You're using AI Video Studio as a guest
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  <button onClick={() => setShowAuthModal(true)} className="underline font-medium hover:text-blue-900 transition-colors">
                    Sign in
                  </button> to save your projects and access your history
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Features Banner */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white rounded-2xl shadow-2xl p-8 mb-8 animate-slide-in-right transform hover:scale-[1.02] transition-all duration-300">
          <h2 className="text-3xl font-black mb-6 flex items-center">
            <span className="mr-3 text-5xl animate-bounce-slow">🎨</span> 
            Enhanced Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setShowStockPhotos(!showStockPhotos)}
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-black text-lg hover:bg-yellow-300 hover:scale-110 hover:rotate-2 transition-all duration-300 shadow-lg hover:shadow-2xl"
            >
              📸 {showStockPhotos ? 'Hide' : 'Show'} Stock Photos
            </button>
            <button
              onClick={() => setShowMusicLibrary(!showMusicLibrary)}
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-black text-lg hover:bg-yellow-300 hover:scale-110 hover:rotate-2 transition-all duration-300 shadow-lg hover:shadow-2xl"
            >
              🎵 {showMusicLibrary ? 'Hide' : 'Show'} Music Library
            </button>
            <div className="bg-white text-purple-600 px-8 py-4 rounded-xl font-black text-lg flex items-center justify-center shadow-lg">
              📝 Subtitles: {subtitlesEnabled ? '✅ On' : '❌ Off'}
            </div>
          </div>
        </div>

        {/* Stock Photos with smooth transition */}
        <div className={`transition-all duration-500 overflow-hidden ${showStockPhotos ? 'max-h-[1000px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
          <div className="transform transition-transform duration-500" style={{ transform: showStockPhotos ? 'translateY(0)' : 'translateY(-20px)' }}>
            <StockPhotoSearch onImageSelected={handleStockPhotoSelected} />
          </div>
        </div>

        {/* Music Library with smooth transition */}
        <div className={`transition-all duration-500 overflow-hidden ${showMusicLibrary ? 'max-h-[1000px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
          <div className="transform transition-transform duration-500" style={{ transform: showMusicLibrary ? 'translateY(0)' : 'translateY(-20px)' }}>
            <MusicLibrary 
              onTrackSelected={handleMusicSelected}
              selectedTrack={selectedMusicTrack}
            />
          </div>
        </div>

        {user && showHistory && (
          <div className="bg-white rounded-xl shadow-2xl p-6 mb-8 animate-scale-in">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="mr-2">📚</span> Project History
            </h2>
            {projectHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No saved projects yet. Create your first video!</p>
            ) : (
              <div className="space-y-2">
                {projectHistory.map((project, index) => (
                  <div
                    key={project.id}
                    onClick={() => loadProject(project)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-all duration-200 group hover:shadow-md animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {project.description || 'No description'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(project.created_at).toLocaleDateString()} • {project.status}
                        </p>
                      </div>
                      <span className="ml-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-200">
                        →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {user && (
          <div className="bg-white rounded-xl shadow-2xl p-6 mb-8 animate-slide-in-up">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="mr-2">💾</span> Save Project
            </h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Project title..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <button
                onClick={saveProject}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-8 animate-slide-in-up animation-delay-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center">
              <span className="mr-2">📸</span> Upload Images
            </h2>
            <label className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg cursor-pointer transform hover:scale-105 transition-all duration-200 font-semibold">
              📁 Bulk Upload
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleBulkUpload}
                className="hidden"
              />
            </label>
          </div>
          
          <ImageUpload images={images} setImages={setImages} />
          
          {images.length > 0 && (
            <div className="mt-6 animate-fade-in">
              <p className="text-sm text-gray-600 mb-4 font-medium">
                {images.length} image{images.length !== 1 ? 's' : ''} uploaded • Drag to reorder ↕️
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative group cursor-move transition-all duration-200 animate-scale-in ${
                      draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100 scale-100 hover:scale-105'
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold z-10 shadow-lg">
                      {index + 1}
                    </div>
                    <img
                      src={image.preview}
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg shadow-md group-hover:shadow-xl transition-all duration-200"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-semibold transition-opacity duration-200">
                        Drag to Reorder
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Voiceover Section */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-8 animate-slide-in-up animation-delay-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center">
              <span className="mr-2">🎤</span> Add Voiceover
            </h2>
            <button
              onClick={() => setShowAdvancedTTS(!showAdvancedTTS)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-semibold"
            >
              {showAdvancedTTS ? '🔽 Hide' : '🔼 Show'} Advanced Voices
            </button>
          </div>
          
          <textarea
            value={voiceoverText}
            onChange={(e) => setVoiceoverText(e.target.value)}
            placeholder="Enter text for AI voiceover (optional)..."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
          
          <div className={`transition-all duration-500 overflow-hidden ${showAdvancedTTS && voiceoverText ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <AdvancedTTS 
              text={voiceoverText}
              onAudioGenerated={handleAudioGenerated}
              onVoiceSelected={(voiceId) => setSelectedVoice(voiceId)}
            />
          </div>
          
          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={handleTestTTS}
              disabled={isProcessing || !voiceoverText.trim()}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              🔊 Test Audio
            </button>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700 font-medium">Duration per image:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={durationPerImage}
                onChange={(e) => setDurationPerImage(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              />
              <span className="text-sm text-gray-500">seconds</span>
            </div>
          </div>
        </div>

        {/* Subtitle Generator */}
        {voiceoverText && (
          <div className="mb-8 animate-slide-in-up animation-delay-300">
            <SubtitleGenerator
              text={voiceoverText}
              duration={audioDuration || (images.length * durationPerImage)}
              onSubtitlesEnabled={handleSubtitlesChanged}
            />
          </div>
        )}

        {/* Video Options */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-8 animate-slide-in-up animation-delay-400">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <span className="mr-2">🎬</span> Video Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="transform hover:scale-105 transition-transform duration-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transition Effect
              </label>
              <select
                value={transition}
                onChange={(e) => setTransition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              >
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="slide_left">Slide Left</option>
                <option value="slide_right">Slide Right</option>
                <option value="zoom">Zoom</option>
                <option value="dissolve">Dissolve</option>
              </select>
            </div>

            <div className="transform hover:scale-105 transition-transform duration-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Filter
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              >
                <option value="none">None</option>
                <option value="vintage">🕰️ Vintage</option>
                <option value="warm">🌅 Warm</option>
                <option value="cool">❄️ Cool</option>
                <option value="black_and_white">⚫ Black & White</option>
                <option value="sepia">🟤 Sepia</option>
                <option value="vibrant">🌈 Vibrant</option>
                <option value="dramatic">🎭 Dramatic</option>
                <option value="soft">✨ Soft</option>
              </select>
            </div>

            <div className="flex items-center transform hover:scale-105 transition-transform duration-200">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhance}
                  onChange={(e) => setEnhance(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
                <span className="text-sm font-medium text-gray-700">
                  ✨ AI Enhancement
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Create Video Button */}
        <div className="bg-white rounded-xl shadow-2xl p-6 mb-8 animate-slide-in-up animation-delay-500">
          <button
            onClick={handleCreateVideo}
            disabled={isProcessing || images.length === 0}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white text-xl font-bold rounded-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
          >
            <span className="relative z-10">
              {isProcessing ? '⏳ Processing...' : '🎥 Create Professional Video'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </button>

          {isProcessing && (
            <div className="mt-6 animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{processingStage}</span>
                <span className="text-sm font-bold text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center animate-pulse">
                ⏱️ Estimated time: ~{Math.ceil((100 - progress) / 10)} seconds remaining
              </p>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
          @keyframes slide-in-left {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          .animate-slide-in-left {
            animation: slide-in-left 0.5s ease-out;
          }
          @keyframes slide-in-right {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          .animate-slide-in-right {
            animation: slide-in-right 0.5s ease-out;
          }
          @keyframes slide-in-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slide-in-up {
            animation: slide-in-up 0.5s ease-out;
          }
          @keyframes scale-in {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-scale-in {
            animation: scale-in 0.3s ease-out;
          }
          @keyframes bounce-slow {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          .animate-bounce-slow {
            animation: bounce-slow 2s infinite;
          }
          @keyframes fade-in-down {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-down {
            animation: fade-in-down 0.5s ease-out;
          }
          .animation-delay-100 {
            animation-delay: 100ms;
          }
          .animation-delay-200 {
            animation-delay: 200ms;
          }
          .animation-delay-300 {
            animation-delay: 300ms;
          }
          .animation-delay-400 {
            animation-delay: 400ms;
          }
          .animation-delay-500 {
            animation-delay: 500ms;
          }
        `}</style>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg shadow-lg animate-shake">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes shake {
            0%, 100% {
              transform: translateX(0);
            }
            10%, 30%, 50%, 70%, 90% {
              transform: translateX(-5px);
            }
            20%, 40%, 60%, 80% {
              transform: translateX(5px);
            }
          }
          .animate-shake {
            animation: shake 0.5s ease-out;
          }
        `}</style>

        {result && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500 p-6 rounded-r-xl shadow-2xl animate-scale-in">
            <h3 className="text-2xl font-bold text-green-900 mb-4 flex items-center">
              <span className="mr-2 animate-bounce-slow">✅</span> Video Created Successfully!
            </h3>
            
            <div className="mb-6 bg-black rounded-xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
              <video
                controls
                className="w-full max-w-4xl mx-auto"
                src={`http://localhost:8000/api/download/${result.video_filename}`}
              >
                Your browser does not support video playback.
              </video>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Images', value: result.num_images, icon: '📸' },
                { label: 'Duration', value: result.video_duration, icon: '⏱️' },
                { label: 'Size', value: `${result.file_size_mb} MB`, icon: '💾' },
                { label: 'Audio', value: result.has_audio ? '✓ Yes' : '✗ No', icon: '🔊' },
                { label: 'Voice', value: result.voice_used || 'N/A', icon: '🎤' }
              ].map((stat, index) => (
                <div 
                  key={index} 
                  className="bg-white p-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">{stat.label}</p>
                    <span className="text-xl">{stat.icon}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800 truncate">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <a
                href={`http://localhost:8000/api/download/${result.video_filename}`}
                download={result.video_filename}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 inline-flex items-center group"
              >
                <svg className="w-6 h-6 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Video
              </a>
            </div>
          </div>
        )}
      </main>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            checkAuth();
          }}
        />
      )}
    </div>
  );
}