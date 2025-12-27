'use client';

import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StockPhoto {
  id: number;
  photographer: string;
  thumbnail: string;
  download_url: string;
  width: number;
  height: number;
}

interface StockPhotoSearchProps {
  onImageSelected: (file: File, preview: string) => void; // ✅ FIXED: Now accepts File + preview
}

export default function StockPhotoSearch({ onImageSelected }: StockPhotoSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [downloadingPhoto, setDownloadingPhoto] = useState<number | null>(null);

  const popularSearches = [
    '🏔️ Mountains', '🌊 Ocean', '🌆 City', '🌲 Nature',
    '💼 Business', '🎨 Art', '🍔 Food', '🐕 Animals',
    '✈️ Travel', '🏃 Fitness', '💻 Technology', '👥 People'
  ];

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_URL}/api/stock-photos/search`, {
        params: { query, page: 1, per_page: 15 }
      });

      if (response.data.success) {
        setPhotos(response.data.photos);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to search photos');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (photo: StockPhoto) => {
    setDownloadingPhoto(photo.id);
    try {
      // Step 1: Download the image to backend
      const formData = new FormData();
      formData.append('photo_url', photo.download_url);
      formData.append('photo_id', photo.id.toString());

      const response = await axios.post(
        `${API_URL}/api/stock-photos/download`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        // Step 2: Fetch the downloaded image as a blob
        const imageUrl = `http://localhost:8000${response.data.url}`;
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();
        
        // Step 3: Convert blob to File object
        const file = new File(
          [blob], 
          response.data.filename || `stock-${photo.id}.jpg`,
          { type: 'image/jpeg' }
        );

        // Step 4: Create preview URL
        const previewUrl = URL.createObjectURL(blob);

        // Step 5: Pass to parent component with proper File object
        onImageSelected(file, previewUrl);
        
        setSelectedPhotos(prev => new Set(prev).add(photo.id));
        
        // Show success message
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        notification.innerHTML = `
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>✅ Photo added to your video!</span>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to download photo');
      console.error('Download error:', err);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <span>❌ Failed to add photo</span>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } finally {
      setDownloadingPhoto(null);
    }
  };

  const handleQuickSearch = (term: string) => {
    const cleanTerm = term.replace(/[^\w\s]/gi, '').trim();
    setSearchQuery(cleanTerm);
    handleSearch(cleanTerm);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center">
            <span className="mr-2">📸</span> Stock Photo Library
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Search millions of free, high-quality images from Pexels
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for images... (e.g., 'sunset', 'business', 'technology')"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '🔍 Searching...' : '🔍 Search'}
          </button>
        </div>

        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">Popular searches:</p>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term, index) => (
              <button
                key={index}
                onClick={() => handleQuickSearch(term)}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 rounded-r-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && photos.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Searching for photos...</p>
        </div>
      )}

      {photos.length > 0 && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Found <strong>{photos.length}</strong> photos
            </p>
            <p className="text-xs text-gray-500">
              Click on any photo to add it to your video
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer"
                onClick={() => !downloadingPhoto && handleDownload(photo)}
              >
                <img
                  src={photo.thumbnail}
                  alt={`Photo by ${photo.photographer}`}
                  className="w-full h-40 object-cover rounded-lg shadow-md group-hover:shadow-xl transition-shadow"
                />
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                  {downloadingPhoto === photo.id ? (
                    <div className="opacity-100">
                      <div className="bg-white rounded-full p-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    </div>
                  ) : selectedPhotos.has(photo.id) ? (
                    <div className="opacity-100">
                      <div className="bg-green-500 text-white rounded-full p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white text-blue-600 rounded-full p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate">📷 {photo.photographer}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && photos.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-600 font-medium">No photos found for &quot;{searchQuery}&quot;</p>
          <p className="text-sm text-gray-500 mt-2">Try different keywords or browse popular searches above</p>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
        <p className="text-xs text-blue-800">
          <strong>💡 Tip:</strong> All photos are free to use from Pexels. 
          They&apos;ll be automatically downloaded and added to your video project.
        </p>
      </div>
    </div>
  );
}