'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

// ✅ USE PYTHON API DIRECTLY
const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'https://faint-caye-aaaannnimesh-fe7ebc44.koyeb.app';

interface Voice {
  id: string;
  name: string;
  gender: string;
  language: string;
}

interface VoicesByCategory {
  [category: string]: Voice[];
}

interface AdvancedTTSProps {
  text: string;
  onAudioGenerated?: (audioUrl: string, duration?: number) => void;
  onVoiceSelected?: (voiceId: string) => void;
}

export default function AdvancedTTS({ text, onAudioGenerated, onVoiceSelected }: AdvancedTTSProps) {
  const [voicesByCategory, setVoicesByCategory] = useState<VoicesByCategory>({});
  const [selectedVoice, setSelectedVoice] = useState('en-us-female');
  const [selectedCategory, setSelectedCategory] = useState('English');
  const [rate, setRate] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    loadVoices();
  }, []);

  useEffect(() => {
    if (onVoiceSelected) {
      onVoiceSelected(selectedVoice);
    }
  }, [selectedVoice, onVoiceSelected]);

  const loadVoices = async () => {
    try {
      console.log('Loading voices from:', `${API_URL}/api/voices`);
      const response = await axios.get(`${API_URL}/api/voices`, { timeout: 10000 });
      if (response.data.voices_by_category) {
        setVoicesByCategory(response.data.voices_by_category);
        console.log('✅ Voices loaded:', Object.keys(response.data.voices_by_category).length, 'categories');
      }
    } catch (err: any) {
      console.error('Error loading voices:', err);
      setError('Failed to load voices. Please refresh the page.');
    }
  };

  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setIsGenerating(true);
    setError('');
    setAudioUrl('');

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('voice', selectedVoice);
      formData.append('rate', `${rate >= 0 ? '+' : ''}${rate}%`);
      formData.append('pitch', `${pitch >= 0 ? '+' : ''}${pitch}Hz`);

      console.log('Generating TTS with:', { voice: selectedVoice, rate: `${rate}%`, pitch: `${pitch}Hz` });

      const response = await axios.post(`${API_URL}/api/advanced-tts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });

      if (response.data.success) {
        const url = `${API_URL}${response.data.url}`;
        const duration = response.data.duration || 0;
        
        setAudioUrl(url);
        setAudioDuration(duration);
        
        if (onAudioGenerated) {
          onAudioGenerated(url, duration);
        }
        console.log('✅ Audio generated successfully');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to generate audio';
      setError(errorMsg);
      console.error('Error generating audio:', errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = Object.keys(voicesByCategory);
  const currentVoices = voicesByCategory[selectedCategory] || [];

  const getVoiceIcon = (gender: string) => {
    return gender === 'female' ? '👩' : '👨';
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="mr-2">🎙️</span> Advanced Voice Options
          <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
            24+ Voices
          </span>
        </h3>

        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <div className="w-full text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading voices...</p>
              </div>
            ) : (
              categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category}
                  <span className="ml-2 text-xs opacity-75">
                    ({voicesByCategory[category]?.length || 0})
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {currentVoices.length > 0 && (
          <>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Voice ({currentVoices.length} available)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-gray-200">
                {currentVoices.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`px-3 py-2 rounded-lg text-left transition-all ${
                      selectedVoice === voice.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{getVoiceIcon(voice.gender)}</span>
                      <span className="text-sm font-medium">{voice.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 bg-white rounded-lg p-3 text-sm border border-gray-200">
              <p className="text-gray-600">
                <span className="font-semibold">Selected:</span>{' '}
                {currentVoices.find(v => v.id === selectedVoice)?.name || 'Loading...'}
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speech Speed: {rate > 0 ? '+' : ''}{rate}% 
                {rate === 0 ? ' (Normal)' : rate > 0 ? ' (Faster)' : ' (Slower)'}
              </label>
              <input
                type="range"
                min="-50"
                max="100"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full"
                disabled={isGenerating}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Slower (-50%)</span>
                <span>Normal (0%)</span>
                <span>Faster (+100%)</span>
              </div>
            </div>

            <button
              onClick={handleGenerateAudio}
              disabled={isGenerating || !text.trim()}
              className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? '🎙️ Generating...' : '🔊 Preview Voice'}
            </button>

            {audioUrl && (
              <div className="mt-3 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <p className="text-sm font-semibold text-green-900 mb-2">
                  ✅ Audio Generated! ({audioDuration.toFixed(1)}s)
                </p>
                <audio controls src={audioUrl} className="w-full" />
                <p className="text-xs text-green-700 mt-2">
                  💡 This voice will be used when you create the video
                </p>
              </div>
            )}

            <div className="mt-4 bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-1">💡 Pro Tips:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• <strong>English:</strong> Choose US, UK, Australian, or Indian accent</li>
                <li>• <strong>European:</strong> French, German, Spanish, Italian, Portuguese</li>
                <li>• <strong>Asian:</strong> Japanese, Korean, Chinese, Hindi</li>
                <li>• <strong>Speed:</strong> -30% for narration, +20% for energetic content</li>
                <li>• <strong>Preview:</strong> Test the voice before creating your video</li>
                <li>• All voices work in video creation automatically! 🎥</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}