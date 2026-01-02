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
  
  // New feature states
  const [showStockPhotos, setShowStockPhotos] = useState(false);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [wordsPerSubtitle, setWordsPerSubtitle] = useState(5);
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
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

  // Handle stock photo selection
  const handleStockPhotoSelected = (file: File, preview: string) => {
    console.log('Stock photo selected:', file.name);
    const newImage: ImagePreview = {
      file,
      preview,
      effect: 'none',
    };
    setImages(prev => [...prev, newImage]);
  };

  // Handle music selection
  const handleMusicSelected = (trackId: string, volume: number) => {
    setSelectedMusicTrack(trackId);
    setMusicVolume(volume);
    console.log('Music selected:', trackId, 'Volume:', volume);
  };

  // Handle subtitle settings
  const handleSubtitlesChanged = (enabled: boolean, words: number) => {
    setSubtitlesEnabled(enabled);
    setWordsPerSubtitle(words);
  };

  // Handle audio generation from AdvancedTTS
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎬 AI Video Studio Pro</h1>
              <p className="text-gray-600 mt-1">Create amazing videos with professional features ✨</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  📚 {showHistory ? 'Hide' : 'Show'} History
                </button>
              )}
              
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.user_metadata?.full_name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">
                  You're using AI Video Studio as a guest
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  <button onClick={() => setShowAuthModal(true)} className="underline font-medium">
                    Sign in
                  </button> to save your projects and access your history
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Features Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">🎨 Enhanced Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowStockPhotos(!showStockPhotos)}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              📸 {showStockPhotos ? 'Hide' : 'Show'} Stock Photos
            </button>
            <button
              onClick={() => setShowMusicLibrary(!showMusicLibrary)}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              🎵 {showMusicLibrary ? 'Hide' : 'Show'} Music Library
            </button>
            <div className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold flex items-center justify-center">
              📝 Subtitles: {subtitlesEnabled ? '✅ On' : '❌ Off'}
            </div>
          </div>
        </div>

        {/* Stock Photos */}
        {showStockPhotos && (
          <div className="mb-8">
            <StockPhotoSearch onImageSelected={handleStockPhotoSelected} />
          </div>
        )}

        {/* Music Library */}
        {showMusicLibrary && (
          <div className="mb-8">
            <MusicLibrary 
              onTrackSelected={handleMusicSelected}
              selectedTrack={selectedMusicTrack}
            />
          </div>
        )}

        {user && showHistory && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">📚 Project History</h2>
            {projectHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No saved projects yet. Create your first video!</p>
            ) : (
              <div className="space-y-2">
                {projectHistory.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => loadProject(project)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                          {project.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {project.description || 'No description'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(project.created_at).toLocaleDateString()} • {project.status}
                        </p>
                      </div>
                      <span className="ml-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">💾 Save Project</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Project title..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={saveProject}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">📸 Upload Images</h2>
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors font-semibold">
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
            <div className="mt-6">
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
                    className={`relative group cursor-move transition-all ${
                      draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                    }`}
                  >
                    <div className="absolute top-2 left-2 bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold z-10 shadow-lg">
                      {index + 1}
                    </div>
                    <img
                      src={image.preview}
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg shadow-md group-hover:shadow-xl transition-shadow"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-semibold">
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
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">🎤 Add Voiceover</h2>
            <button
              onClick={() => setShowAdvancedTTS(!showAdvancedTTS)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
            >
              {showAdvancedTTS ? '🔽 Hide' : '🔼 Show'} Advanced Voices
            </button>
          </div>
          
          <textarea
            value={voiceoverText}
            onChange={(e) => setVoiceoverText(e.target.value)}
            placeholder="Enter text for AI voiceover (optional)..."
            className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {showAdvancedTTS && voiceoverText && (
            <div className="mt-4">
              <AdvancedTTS 
                text={voiceoverText}
                onAudioGenerated={handleAudioGenerated}
                onVoiceSelected={(voiceId: string) => {
     setSelectedVoice(voiceId);
     console.log('Voice selected:', voiceId);
   }}
              />
            </div>
          )}
          
          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={handleTestTTS}
              disabled={isProcessing || !voiceoverText.trim()}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
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
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">seconds</span>
            </div>
          </div>
        </div>

        {/* Subtitle Generator */}
        {voiceoverText && (
          <div className="mb-8">
            <SubtitleGenerator
              text={voiceoverText}
              duration={audioDuration || (images.length * durationPerImage)}
              onSubtitlesEnabled={handleSubtitlesChanged}
            />
          </div>
        )}

        {/* Video Options */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">🎬 Video Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transition Effect
              </label>
              <select
                value={transition}
                onChange={(e) => setTransition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="slide_left">Slide Left</option>
                <option value="slide_right">Slide Right</option>
                <option value="zoom">Zoom</option>
                <option value="dissolve">Dissolve</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Filter
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhance}
                  onChange={(e) => setEnhance(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  ✨ AI Enhancement
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Create Video Button */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <button
            onClick={handleCreateVideo}
            disabled={isProcessing || images.length === 0}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-bold rounded-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isProcessing ? 'Processing...' : '🎥 Create Professional Video'}
          </button>

          {isProcessing && (
            <div className="mt-6">
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
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                ⏱️ Estimated time: ~{Math.ceil((100 - progress) / 10)} seconds remaining
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500 p-6 rounded-r-xl shadow-xl">
            <h3 className="text-2xl font-bold text-green-900 mb-4 flex items-center">
              <span className="mr-2">✅</span> Video Created Successfully!
            </h3>
            
            <div className="mb-6 bg-black rounded-xl overflow-hidden shadow-2xl">
              <video
                controls
                className="w-full max-w-4xl mx-auto"
                src={`http://localhost:8000/api/download/${result.video_filename}`}
              >
                Your browser does not support video playback.
              </video>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <p className="text-xs text-gray-500 uppercase font-semibold">Images</p>
                <p className="text-2xl font-bold text-gray-800">{result.num_images}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <p className="text-xs text-gray-500 uppercase font-semibold">Duration</p>
                <p className="text-2xl font-bold text-gray-800">{result.video_duration}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <p className="text-xs text-gray-500 uppercase font-semibold">Size</p>
                <p className="text-2xl font-bold text-gray-800">{result.file_size_mb} MB</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <p className="text-xs text-gray-500 uppercase font-semibold">Audio</p>
                <p className="text-2xl font-bold text-gray-800">{result.has_audio ? '✓ Yes' : '✗ No'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <p className="text-xs text-gray-500 uppercase font-semibold">Voice</p>
                <p className="text-sm font-bold text-gray-800">{result.voice_used || 'N/A'}</p>
              </div>
            </div>

            <div className="flex justify-center">
              <a
                href={`https://faint-caye-aaaannnimesh-fe7ebc44.koyeb.app/api/download/${result.video_filename}`}
                download={result.video_filename}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:shadow-2xl transition-all transform hover:scale-105 inline-flex items-center"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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