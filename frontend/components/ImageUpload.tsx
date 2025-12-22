import React, { useCallback } from 'react';
import { ImagePreview, EffectType } from '@/types';

interface ImageUploadProps {
  images: ImagePreview[];
  setImages: React.Dispatch<React.SetStateAction<ImagePreview[]>>;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ images, setImages }) => {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: ImagePreview[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      effect: 'none' as EffectType,
    }));
    setImages(prev => [...prev, ...newImages]);
  }, [setImages]);

  const handleEffectChange = (index: number, effect: EffectType) => {
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, effect } : img
    ));
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-2">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-lg font-medium text-gray-700">Click to upload images</span>
            <span className="text-sm text-gray-500">or drag and drop</span>
            <span className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</span>
          </div>
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg shadow-md"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <select
                value={image.effect}
                onChange={(e) => handleEffectChange(index, e.target.value as EffectType)}
                className="absolute bottom-2 left-2 right-2 bg-white bg-opacity-90 rounded px-2 py-1 text-sm"
              >
                <option value="none">No Effect</option>
                <option value="grayscale">Grayscale</option>
                <option value="blur">Blur</option>
                <option value="edge_detection">Edge Detection</option>
                <option value="cartoon">Cartoon</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
