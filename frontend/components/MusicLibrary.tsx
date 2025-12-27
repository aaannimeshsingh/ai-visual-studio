'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MusicTrack {
  id: string;
  name: string;
  duration: number;
  file: string;
}

interface MusicCategory {
  id: string;
  name: string;
  description: string;
}

interface MusicLibraryProps {
  onTrackSelected: (trackId: string, volume: number) => void;
  selectedTrack?: string;
}

function MusicLibrary({ onTrackSelected, selectedTrack }: MusicLibraryProps) {
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('upbeat');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.3);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadTracks(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/music/categories`);
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadTracks = async (category: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/music/tracks`, {
        params: { category }
      });
      if (response.data.success) {
        setTracks(response.data.tracks);
      }
    } catch (err) {
      console.error('Error loading tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (trackId: string) => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    if (playingTrack === trackId) {
      setPlayingTrack(null);
      setAudioElement(null);
      return;
    }

    try {
      const audio = new Audio(`http://localhost:8000/api/music/download/${trackId}`);
      audio.volume = volume;
      audio.addEventListener('ended', () => {
        setPlayingTrack(null);
        setAudioElement(null);
      });
      
      await audio.play();
      setAudioElement(audio);
      setPlayingTrack(trackId);
    } catch (err) {
      console.error('Error playing track:', err);
      alert('Failed to preview track');
    }
  };

  const handleSelectTrack = (trackId: string) => {
    onTrackSelected(trackId, volume);
    if (audioElement) {
      audioElement.pause();
      setPlayingTrack(null);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioElement) {
      audioElement.volume = newVolume;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (categoryId: string) => {
    const icons: Record<string, string> = {
      upbeat: '🎵',
      calm: '🧘',
      corporate: '💼',
      cinematic: '🎬',
      inspirational: '✨'
    };
    return icons[categoryId] || '🎵';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-4 flex items-center">
        <span className="mr-2">🎵</span> Background Music Library
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Add professional background music to make your videos more engaging
      </p>

      <div className="mb-6 bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Background Music Volume: {Math.round(volume * 100)}%
          </label>
          <span className="text-xs text-gray-500">
            {volume < 0.3 ? '🔈 Quiet' : volume < 0.6 ? '🔉 Medium' : '🔊 Loud'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 Lower volume (20-40%) works best with voiceovers
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Music Category
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedCategory === category.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="text-2xl mb-1">{getCategoryIcon(category.id)}</div>
              <div className="text-sm font-semibold">{category.name}</div>
              <div className="text-xs text-gray-500 mt-1">{category.description}</div>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading tracks...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Available Tracks ({tracks.length})
          </p>
          
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`border-2 rounded-lg p-4 transition-all ${
                selectedTrack === track.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="font-semibold text-gray-900">{track.name}</h3>
                    {selectedTrack === track.id && (
                      <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                        Selected ✓
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Duration: {formatDuration(track.duration)}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePreview(track.id)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      playingTrack === track.id
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {playingTrack === track.id ? (
                      <>
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Stop
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Preview
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleSelectTrack(track.id)}
                    disabled={selectedTrack === track.id}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      selectedTrack === track.id
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {selectedTrack === track.id ? 'Selected' : 'Use This'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg">
        <p className="text-xs text-yellow-800">
          <strong>ℹ️ Note:</strong> Background music will be mixed with your voiceover at {Math.round(volume * 100)}% volume. 
          Music will automatically fade out at the end of your video.
        </p>
      </div>
    </div>
  );
}

export default MusicLibrary;