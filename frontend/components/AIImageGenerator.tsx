import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AIImageGeneratorProps {
  onImagesGenerated: (images: any[]) => void;
}

export default function AIImageGenerator({ onImagesGenerated }: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blurry, bad quality, distorted');
  const [numImages, setNumImages] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [featureAvailable, setFeatureAvailable] = useState(true);

  const examplePrompts = [
    "A serene mountain landscape at sunset with vibrant colors",
    "Futuristic cityscape with neon lights and flying cars",
    "Cute cartoon character with big eyes, digital art",
    "Abstract geometric patterns in blue and gold",
    "Professional product photography of a smartphone on white background",
    "Fantasy castle on a floating island in the clouds"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError('');
    setProgress(0);
    setGeneratedImages([]);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 5;
      });
    }, 1000);

    try {
      console.log('Sending image generation request...');
      
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('negative_prompt', negativePrompt);
      formData.append('num_images', numImages.toString());
      formData.append('width', '512');
      formData.append('height', '512');

      const response = await axios.post(`${API_URL}/api/generate-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 2 minutes timeout
      });

      clearInterval(progressInterval);
      setProgress(100);

      console.log('Response:', response.data);

      if (response.data.success) {
        setGeneratedImages(response.data.images);
        onImagesGenerated(response.data.images);
      } else {
        // Handle graceful failure
        if (response.data.reason && response.data.reason.includes('not available')) {
          setFeatureAvailable(false);
          setError(
            '⚠️ AI Image Generation is currently unavailable. ' +
            'This feature requires significant GPU resources that may not be available in Docker. ' +
            'Please use the image upload feature instead.'
          );
        } else {
          setError(response.data.error || 'Failed to generate images');
        }
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Image generation error:', err);
      
      let errorMessage = 'Failed to generate images';
      
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = '⏱️ Request timed out. Image generation takes a long time without GPU acceleration. Please try uploading images instead.';
      } else if (err.response?.status === 500) {
        errorMessage = '⚠️ Server error. AI Image Generation may not be available. Please use the image upload feature instead.';
        setFeatureAvailable(false);
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const useExamplePrompt = (example: string) => {
    setPrompt(example);
  };

  if (!featureAvailable) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                AI Image Generation Unavailable
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>This feature requires significant GPU resources and may not work in Docker environments without GPU support.</p>
                <p className="mt-2 font-semibold">Alternative Options:</p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>Use the <strong>Bulk Upload</strong> button to upload your own images</li>
                  <li>Generate images using external tools:
                    <ul className="ml-4 mt-1">
                      <li>• <a href="https://huggingface.co/spaces/stabilityai/stable-diffusion" target="_blank" className="underline">Hugging Face Stable Diffusion</a></li>
                      <li>• <a href="https://dreamstudio.ai" target="_blank" className="underline">DreamStudio</a></li>
                      <li>• <a href="https://www.midjourney.com" target="_blank" className="underline">Midjourney</a></li>
                    </ul>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => setFeatureAvailable(true)}
                className="mt-3 text-sm font-medium text-yellow-800 underline hover:text-yellow-900"
              >
                Try Again Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-4 flex items-center">
        <span className="mr-2">🎨</span> AI Image Generator
        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Beta</span>
      </h2>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 rounded-r-lg">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> AI image generation requires significant resources and may take 30-60 seconds per image. 
          For faster results, consider using the bulk upload feature with pre-made images.
        </p>
      </div>

      <div className="space-y-4">
        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe what you want to create
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A beautiful sunset over the ocean with dolphins jumping..."
            className="w-full h-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGenerating}
          />
        </div>

        {/* Example Prompts */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                onClick={() => useExamplePrompt(example)}
                className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                disabled={isGenerating}
              >
                {example.slice(0, 40)}...
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        <details className="border border-gray-200 rounded-lg p-3">
          <summary className="cursor-pointer font-medium text-sm text-gray-700">
            Advanced Options
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Negative Prompt (what to avoid)
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Images: {numImages}
              </label>
              <input
                type="range"
                min="1"
                max="2"
                value={numImages}
                onChange={(e) => setNumImages(Number(e.target.value))}
                className="w-full"
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500 mt-1">Limited to 2 images for performance</p>
            </div>
          </div>
        </details>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isGenerating ? '🎨 Generating...' : '✨ Generate Images'}
        </button>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Creating your images...</span>
              <span className="text-sm font-bold text-purple-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              ⏱️ This may take 30-120 seconds depending on your system...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">✨ Generated Images</h3>
            <div className="grid grid-cols-2 gap-4">
              {generatedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={`http://localhost:8000${image.url}`}
                    alt={`Generated ${index + 1}`}
                    className="w-full rounded-lg shadow-md"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg" />
                  <a
                    href={`http://localhost:8000${image.url}`}
                    download={image.filename}
                    className="absolute bottom-2 right-2 bg-white px-3 py-1 rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Download these images and upload them to use in your video!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}