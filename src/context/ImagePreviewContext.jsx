import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const ImagePreviewContext = createContext(null);

export const ImagePreviewProvider = ({ children }) => {
  const [preview, setPreview] = useState(null); // { src: string, name?: string }

  const openImagePreview = useCallback((src, name = '') => {
    if (!src) return;
    setPreview({ src, name });
  }, []);

  const closeImagePreview = useCallback(() => {
    setPreview(null);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeImagePreview();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preview, closeImagePreview]);

  return (
    <ImagePreviewContext.Provider value={{ openImagePreview, closeImagePreview }}>
      {children}
      {preview && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={closeImagePreview}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeImagePreview();
            }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/40 shadow-lg cursor-pointer"
            title="Close (Esc)"
            aria-label="Close image preview"
          >
            <X size={22} />
          </button>

          {/* Image container: prevents distortion and preserves natural aspect ratio */}
          <div
            className="relative flex flex-col items-center max-w-[92vw] max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={preview.src}
              alt={preview.name || "Member Profile Preview"}
              className="max-w-[90vw] max-h-[80vh] sm:max-h-[85vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/15"
            />
            {preview.name && (
              <div className="mt-3 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm font-semibold tracking-wide truncate max-w-[80vw] shadow-md border border-white/10">
                {preview.name}
              </div>
            )}
          </div>
        </div>
      )}
    </ImagePreviewContext.Provider>
  );
};

export const useImagePreview = () => {
  const context = useContext(ImagePreviewContext);
  if (!context) {
    throw new Error('useImagePreview must be used within an ImagePreviewProvider');
  }
  return context;
};

export default ImagePreviewContext;
