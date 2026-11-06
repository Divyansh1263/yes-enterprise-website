import { useState, useRef } from 'react';
import { executeDirectImageUpload, deleteImage, updateImage, reorderImages, getR2ImageUrl } from '../../services/api/uploads.js';

export default function ImageUploader({
  productId,
  variantId = null,
  images = [],
  onImagesChange,
  disabled = false
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { filename, stage, percent }
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!productId) {
      setUploadError('Please save the product first before uploading images.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const updatedImages = [...images];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Client validation
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        setUploadError(`File "${file.name}" has unsupported type: ${file.type}. Allowed: JPEG, PNG, WebP.`);
        continue;
      }

      const isFirstImage = updatedImages.length === 0 && i === 0;

      try {
        setUploadProgress({
          filename: file.name,
          stage: 'Compressing image...',
          percent: 20
        });

        const newImageRecord = await executeDirectImageUpload(
          file,
          {
            product_id: productId,
            variant_id: variantId,
            alt_text: file.name.replace(/\.[^/.]+$/, ''),
            is_primary: isFirstImage,
            sort_order: updatedImages.length + 1
          },
          (stage, pct) => {
            setUploadProgress({
              filename: file.name,
              stage: stage === 'compressing' ? 'Compressing high-res image...' : stage === 'uploading' ? 'Uploading to Cloudflare R2...' : 'Finalizing metadata...',
              percent: pct
            });
          }
        );

        updatedImages.push(newImageRecord);
        onImagesChange(updatedImages);
      } catch (err) {
        setUploadError(`Failed to upload "${file.name}": ${err.message || 'Storage error'}`);
        break;
      }
    }

    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSetPrimary = async (imgId) => {
    try {
      await updateImage(imgId, { is_primary: true });
      const next = images.map(img => ({
        ...img,
        is_primary: img.id === imgId
      }));
      onImagesChange(next);
    } catch (err) {
      setUploadError(`Failed to set primary image: ${err.message}`);
    }
  };

  const handleDeleteImage = async (imgId) => {
    try {
      await deleteImage(imgId);
      const next = images.filter(img => img.id !== imgId);
      // If deleted image was primary, promote first remaining
      if (next.length > 0 && !next.some(img => img.is_primary)) {
        next[0].is_primary = true;
      }
      onImagesChange(next);
    } catch (err) {
      setUploadError(`Failed to delete image: ${err.message}`);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const next = [...images];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    const orders = next.map((img, i) => ({ id: img.id, sort_order: i + 1 }));
    onImagesChange(next);

    try {
      await reorderImages(productId, orders);
    } catch (err) {
      setUploadError(`Failed to save image order: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Box */}
      <div
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
          disabled || uploading
            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            : 'border-brand-navy/20 hover:border-brand-navy/50 bg-brand-ivory/30 hover:bg-brand-ivory/60 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || uploading}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <span className="text-3xl mb-2">📸</span>
          <p className="text-sm font-bold text-gray-800">
            {uploading ? 'Processing & Uploading...' : 'Click or Drag to Upload Product Images'}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Supports JPEG, PNG, WebP. High-res smartphone photos (5–6 MB) are automatically compressed in-browser before direct R2 upload.
          </p>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {uploadProgress && (
        <div className="p-4 bg-brand-ivory rounded-xl border border-brand-navy/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-brand-navy">{uploadProgress.filename}</span>
            <span className="text-gray-500 font-mono">{uploadProgress.percent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-navy h-2 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-500">{uploadProgress.stage}</p>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>⚠️ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="font-bold text-red-600 hover:text-red-900">✕</button>
        </div>
      )}

      {/* Image Gallery & Management List */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
          {images.map((img, index) => {
            // Determine preview source (R2 direct public URL, or verified upload path)
            const src = img.url || getR2ImageUrl(img.image_key);

            return (
              <div
                key={img.id || img.image_key || index}
                className={`relative group bg-white rounded-xl border overflow-hidden shadow-sm transition-all ${
                  img.is_primary ? 'border-brand-navy ring-2 ring-brand-navy/20' : 'border-gray-200'
                }`}
              >
                {/* Image thumbnail */}
                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                  <img
                    src={src}
                    alt={img.alt_text || 'Product image'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback icon if preview fails
                      e.target.style.display = 'none';
                    }}
                  />
                  {/* Primary indicator badge */}
                  {img.is_primary && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-navy text-white text-[10px] font-bold rounded-md shadow-sm">
                      ★ Primary
                    </span>
                  )}
                </div>

                {/* Controls overlay */}
                <div className="p-2.5 bg-white space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-1">
                    {!img.is_primary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(img.id)}
                        className="text-[11px] font-semibold text-brand-navy hover:underline"
                      >
                        Set Primary
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-medium">Main Image</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-semibold"
                      title="Delete Image"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Reorder arrows */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      className="hover:text-gray-700 disabled:opacity-20 text-xs px-1"
                      title="Move Left"
                    >
                      ◀
                    </button>
                    <span className="text-[10px] text-gray-400 font-mono">#{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 1)}
                      disabled={index === images.length - 1}
                      className="hover:text-gray-700 disabled:opacity-20 text-xs px-1"
                      title="Move Right"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

