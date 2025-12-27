'use client';

import { useState } from 'react';

interface SubtitleGeneratorProps {
  text: string;
  duration: number;
  onSubtitlesEnabled: (enabled: boolean, wordsPerSubtitle: number) => void;
}

export default function SubtitleGenerator({ text, duration, onSubtitlesEnabled }: SubtitleGeneratorProps) {
  const [enabled, setEnabled] = useState(false);
  const [wordsPerSubtitle, setWordsPerSubtitle] = useState(5);
  const [previewSubtitles, setPreviewSubtitles] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const generatePreview = () => {
    if (!text || duration <= 0) return;

    const words = text.split(' ');
    const subtitles = [];
    const wordsPerSecond = words.length / duration;
    
    let currentTime = 0;
    let index = 1;

    for (let i = 0; i < words.length; i += wordsPerSubtitle) {
      const chunk = words.slice(i, i + wordsPerSubtitle);
      const subtitleText = chunk.join(' ');
      const subtitleDuration = chunk.length / wordsPerSecond;
      const endTime = currentTime + subtitleDuration;

      subtitles.push({
        index,
        start: currentTime,
        end: endTime,
        text: subtitleText
      });

      currentTime = endTime;
      index++;
    }

    setPreviewSubtitles(subtitles);
    setShowPreview(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const handleToggle = (enabled: boolean) => {
    setEnabled(enabled);
    onSubtitlesEnabled(enabled, wordsPerSubtitle);
  };

  const handleWordsChange = (words: number) => {
    setWordsPerSubtitle(words);
    if (enabled) {
      onSubtitlesEnabled(true, words);
    }
  };

  const estimatedSubtitles = text ? Math.ceil(text.split(' ').length / wordsPerSubtitle) : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center">
            <span className="mr-2">📝</span> Subtitle Generator
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Automatically add subtitles to your video for better accessibility
          </p>
        </div>
        
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only"
            />
            <div className={`block w-14 h-8 rounded-full transition-colors ${
              enabled ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
              enabled ? 'transform translate-x-6' : ''
            }`}></div>
          </div>
          <div className="ml-3 text-sm font-medium text-gray-700">
            {enabled ? 'Enabled ✓' : 'Disabled'}
          </div>
        </label>
      </div>

      {!text || text.trim().length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ No voiceover text:</strong> Add text in the voiceover section above to generate subtitles
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Words Per Subtitle: <strong>{wordsPerSubtitle}</strong>
              </label>
              <input
                type="range"
                min="3"
                max="10"
                value={wordsPerSubtitle}
                onChange={(e) => handleWordsChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3 (Fast)</span>
                <span>5 (Balanced)</span>
                <span>10 (Slow)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Total Words</p>
                <p className="text-2xl font-bold text-blue-600">{text.split(' ').length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Estimated Subtitles</p>
                <p className="text-2xl font-bold text-green-600">{estimatedSubtitles}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Video Duration</p>
                <p className="text-2xl font-bold text-purple-600">{duration.toFixed(1)}s</p>
              </div>
            </div>
          </div>

          <button
            onClick={generatePreview}
            className="w-full py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors mb-4"
          >
            👁️ Preview Subtitles
          </button>

          {showPreview && previewSubtitles.length > 0 && (
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 max-h-64 overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-blue-900">Subtitle Preview ({previewSubtitles.length} subtitles)</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Close ✕
                </button>
              </div>
              
              <div className="space-y-3">
                {previewSubtitles.map((sub) => (
                  <div key={sub.index} className="bg-white rounded p-3 shadow-sm">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-bold text-gray-500">#{sub.index}</span>
                      <span className="text-xs text-gray-500">
                        {formatTime(sub.start)} → {formatTime(sub.end)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{sub.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-white rounded p-3">
                <p className="text-xs text-gray-600">
                  <strong>💡 How it works:</strong> Subtitles will be automatically generated when you create the video.
                  You can also download the .SRT file separately after video creation.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 border-2 border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Subtitle Style Preview</h3>
            <div className="bg-black rounded-lg p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-30"></div>
              
              <div className="relative text-center">
                <p className="text-white text-2xl font-bold drop-shadow-lg" style={{
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)'
                }}>
                  This is how your subtitles will look
                </p>
              </div>

              <p className="text-xs text-gray-300 text-center mt-4">
                White text with black outline for maximum readability
              </p>
            </div>
          </div>

          <div className="mt-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
            <p className="text-sm font-semibold text-green-900 mb-2">✅ Why Add Subtitles?</p>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• <strong>80%</strong> of videos are watched without sound</li>
              <li>• Improves accessibility for deaf/hard-of-hearing viewers</li>
              <li>• Better engagement and retention rates</li>
              <li>• Helps with SEO and discoverability</li>
              <li>• Professional look and feel</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}