import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001';

// FIXED: Updated voice categories with realistic expectations
const VOICE_CATEGORIES = {
  "English": [
    { id: "en-us-female", name: "🇺🇸 US English (Female-sounding)", gender: "female", working: true },
    { id: "en-us-male", name: "🇺🇸 US English (Male-sounding)", gender: "male", working: true },
    { id: "en-uk-female", name: "🇬🇧 UK English (Female-sounding)", gender: "female", working: true },
    { id: "en-uk-male", name: "🇬🇧 UK English (Male-sounding)", gender: "male", working: true },
    { id: "en-au-female", name: "🇦🇺 Australian (Female-sounding)", gender: "female", working: true },
    { id: "en-au-male", name: "🇦🇺 Australian (Male-sounding)", gender: "male", working: true },
    { id: "en-in-female", name: "🇮🇳 Indian English (Female-sounding)", gender: "female", working: true },
    { id: "en-in-male", name: "🇮🇳 Indian English (Male-sounding)", gender: "male", working: true },
  ],
  "European": [
    { id: "fr-female", name: "🇫🇷 French (Female-sounding)", gender: "female", working: true },
    { id: "fr-male", name: "🇫🇷 French (Male-sounding)", gender: "male", working: true },
    { id: "de-female", name: "🇩🇪 German (Female-sounding)", gender: "female", working: true },
    { id: "de-male", name: "🇩🇪 German (Male-sounding)", gender: "male", working: true },
    { id: "es-female", name: "🇪🇸 Spanish (Female-sounding)", gender: "female", working: true },
    { id: "es-male", name: "🇪🇸 Spanish (Male-sounding)", gender: "male", working: true },
    { id: "it-female", name: "🇮🇹 Italian (Female-sounding)", gender: "female", working: true },
    { id: "it-male", name: "🇮🇹 Italian (Male-sounding)", gender: "male", working: true },
    { id: "pt-female", name: "🇧🇷 Portuguese (Female-sounding)", gender: "female", working: true },
    { id: "pt-male", name: "🇧🇷 Portuguese (Male-sounding)", gender: "male", working: true },
  ],
  "Asian": [
    { id: "ja-female", name: "🇯🇵 Japanese (Female-sounding)", gender: "female", working: true },
    { id: "ja-male", name: "🇯🇵 Japanese (Male-sounding)", gender: "male", working: true },
    { id: "ko-female", name: "🇰🇷 Korean (Female-sounding)", gender: "female", working: true },
    { id: "ko-male", name: "🇰🇷 Korean (Male-sounding)", gender: "male", working: true },
    { id: "zh-female", name: "🇨🇳 Chinese (Female-sounding)", gender: "female", working: true },
    { id: "zh-male", name: "🇨🇳 Chinese (Male-sounding)", gender: "male", working: true },
    { id: "hi-female", name: "🇮🇳 Hindi (Female-sounding)", gender: "female", working: true },
    { id: "hi-male", name: "🇮🇳 Hindi (Male-sounding)", gender: "male", working: true },
  ],
  "Other": [
    { id: "ru-female", name: "🇷🇺 Russian (Female-sounding)", gender: "female", working: true },
    { id: "ru-male", name: "🇷🇺 Russian (Male-sounding)", gender: "male", working: true },
    { id: "ar-female", name: "🇸🇦 Arabic (Female-sounding)", gender: "female", working: true },
    { id: "ar-male", name: "🇸🇦 Arabic (Male-sounding)", gender: "male", working: true },
  ]
};

export default function AdvancedTTS({ text, onAudioGenerated, onVoiceSelected }) {
  const [selectedCategory, setSelectedCategory] = useState('English');
  const [selectedVoice, setSelectedVoice] = useState('en-us-female');
  const [rate, setRate] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    if (onVoiceSelected) {
      onVoiceSelected(selectedVoice);
    }
  }, [selectedVoice, onVoiceSelected]);

  const handleGenerateAudio = async () => {
    if (!text?.trim()) {
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
      formData.append('pitch', '+0Hz');

      const response = await fetch(`${API_URL}/api/advanced-tts`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate audio');
      }

      const data = await response.json();

      if (data.success) {
        const url = `http://localhost:8000${data.url}`;
        const duration = data.duration || 0;
        
        setAudioUrl(url);
        setAudioDuration(duration);
        
        if (onAudioGenerated) {
          onAudioGenerated(url, duration);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to generate audio');
      console.error('Error generating audio:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentVoices = VOICE_CATEGORIES[selectedCategory] || [];
  const selectedVoiceData = currentVoices.find(v => v.id === selectedVoice) || currentVoices[0];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="mr-2">🎙️</span> Advanced Voice Options
          <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
            24+ Voices
          </span>
        </h3>

        {/* Important Note */}
        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg">
          <p className="text-xs text-yellow-800">
            <strong>📝 Note:</strong> Using Google TTS (free). "Male" and "Female" refer to regional accents/speech patterns, 
            not actual voice gender. For true male/female voices, consider Azure TTS or ElevenLabs (requires API keys).
          </p>
        </div>

        {/* Language Category Tabs */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {Object.keys(VOICE_CATEGORIES).map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedVoice(VOICE_CATEGORIES[category][0].id);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category}
                <span className="ml-2 text-xs opacity-75">
                  ({VOICE_CATEGORIES[category].length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selection Grid */}
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
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{voice.name}</span>
                  {voice.working && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                      ✓
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Preview Info */}
        <div className="mt-3 bg-white rounded-lg p-3 text-sm border border-gray-200">
          <p className="text-gray-600">
            <span className="font-semibold">Selected:</span> {selectedVoiceData?.name || 'Loading...'}
          </p>
        </div>

        {/* Speed Control */}
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

        {/* Generate Button */}
        <button
          onClick={handleGenerateAudio}
          disabled={isGenerating || !text?.trim()}
          className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {isGenerating ? '🎙️ Generating...' : '🔊 Preview Voice'}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-3 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Audio Player */}
        {audioUrl && (
          <div className="mt-3 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <p className="text-sm font-semibold text-green-900 mb-2">
              ✅ Audio Generated! ({audioDuration.toFixed(1)}s)
            </p>
            <audio
              controls
              src={audioUrl}
              className="w-full"
            />
            <p className="text-xs text-green-700 mt-2">
              💡 This voice will be used when you create the video
            </p>
          </div>
        )}

        {/* Pro Tips */}
        <div className="mt-4 bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-1">💡 Tips for Better Voice Quality:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Different accents create slight voice variations</li>
            <li>• Speed adjustment (-30% to +50%) helps with differentiation</li>
            <li>• UK/Australian accents sound more formal</li>
            <li>• US accents are more neutral and clear</li>
            <li>• For true male/female voices, consider upgrading to Azure TTS</li>
          </ul>
        </div>

        {/* Upgrade Note */}
        <div className="mt-3 bg-purple-50 rounded-lg p-3 border border-purple-200">
          <p className="text-xs font-semibold text-purple-900 mb-2">🚀 Want True Male/Female Voices?</p>
          <p className="text-xs text-purple-800">
            For authentic voice gender distinction, consider:
          </p>
          <ul className="text-xs text-purple-700 mt-1 space-y-1">
            <li>• <strong>Azure TTS:</strong> 50+ neural voices (requires API key)</li>
            <li>• <strong>ElevenLabs:</strong> Ultra-realistic AI voices (paid)</li>
            <li>• <strong>Amazon Polly:</strong> Natural-sounding voices (AWS account)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}