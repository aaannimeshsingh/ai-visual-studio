import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
}

interface AdvancedTTSProps {
  text: string;
  onAudioGenerated?: (audioUrl: string) => void;
}

export default function AdvancedTTS({ text, onAudioGenerated }: AdvancedTTSProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('en-US-AriaNeural');
  const [rate, setRate] = useState(0); // -50 to +100
  const [pitch, setPitch] = useState(0); // -50 to +50
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/voices`);
      setVoices(response.data.voices);
    } catch (err) {
      console.error('Error loading voices:', err);
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
      
      // FIX: Format rate and pitch correctly
      const formattedRate = `${rate >= 0 ? '+' : ''}${rate}%`;
      const formattedPitch = `${pitch >= 0 ? '+' : ''}${pitch}Hz`;
      
      formData.append('rate', formattedRate);
      formData.append('pitch', formattedPitch);

      console.log('Sending TTS request:', {
        voice: selectedVoice,
        rate: formattedRate,
        pitch: formattedPitch
      });

      const response = await axios.post(`${API_URL}/api/advanced-tts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const url = `http://localhost:8000${response.data.url}`;
        setAudioUrl(url);
        if (onAudioGenerated) {
          onAudioGenerated(url);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate audio');
      console.error('Error generating audio:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getVoicesByGender = (gender: string) => {
    return voices.filter(v => v.gender === gender);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="mr-2">🎙️</span> Advanced Voice Options
        </h3>

        {/* Voice Selection */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Voice
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              <optgroup label="🚺 Female Voices">
                {getVoicesByGender('female').map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🚹 Male Voices">
                {getVoicesByGender('male').map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Voice Preview Info */}
          <div className="bg-white rounded-lg p-3 text-sm">
            <p className="text-gray-600">
              <span className="font-semibold">Selected:</span>{' '}
              {voices.find(v => v.id === selectedVoice)?.name || 'Loading...'}
            </p>
          </div>

          {/* Speed Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speech Speed: {rate > 0 ? '+' : ''}{rate}% {rate === 0 ? '(Normal)' : rate > 0 ? '(Faster)' : '(Slower)'}
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

          {/* Pitch Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice Pitch: {pitch > 0 ? '+' : ''}{pitch}Hz {pitch === 0 ? '(Normal)' : pitch > 0 ? '(Higher)' : '(Lower)'}
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
              className="w-full"
              disabled={isGenerating}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Lower (-50Hz)</span>
              <span>Normal (0Hz)</span>
              <span>Higher (+50Hz)</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateAudio}
            disabled={isGenerating || !text.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? '🎙️ Generating...' : '🔊 Preview Voice'}
          </button>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
              <p className="text-sm font-semibold text-green-900 mb-2">
                ✅ Audio Generated!
              </p>
              <audio
                controls
                src={audioUrl}
                className="w-full"
              />
              <p className="text-xs text-green-700 mt-2">
                This voice will be used when you create the video
              </p>
            </div>
          )}
        </div>

        {/* Pro Tips */}
        <div className="mt-4 bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-1">💡 Pro Tips:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Try different voices to find the perfect match for your video</li>
            <li>• Adjust speed for dramatic effect or clarity</li>
            <li>• Use pitch to create unique character voices</li>
            <li>• Male voices work great for authoritative content</li>
            <li>• Female voices are perfect for friendly, welcoming content</li>
            <li>• Each voice has unique characteristics - experiment!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}