import { useState, useRef } from 'react';
import { executeDirectImageUpload, deleteImage, updateImage, reorderImages, getR2ImageUrl } from '../../services/api/uploads.js';

export default function ImageUploader({
  productId,
  variantId = null,
  availableVariants = [],
  images = [],
  onImagesChange,
  disabled = false
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { filename, stage, percent }
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleAssignVariant = async (imgId, targetVariantId) => {
    try {
      await updateImage(imgId, { variant_id: targetVariantId || null });
      const next = images.map(img => (
        img.id === imgId ? { ...img, variant_id: targetVariantId || null } : img
      ));
      onImagesChange(next);
    } catch (err) {
      setUploadError(`Failed to update variant association: ${err.message}`);
    }
  };

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
        className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center transition-all ${
          disabled || uploading
            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            : 'border-brand-navy/20 hover:border-brand-navy/50 bg-brand-ivory/30 hover:bg-brand-ivory/60 cursor-pointer min-h-[120px] flex flex-col justify-center'
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
            {uploading ? 'Processing & Uploading...' : 'Tap or Drag to Upload Product Photos'}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Supports multiple selection. High-resolution photos are automatically compressed before storage.
          </p>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {uploadProgress && (
        <div className="p-3.5 sm:p-4 bg-brand-ivory rounded-xl border border-brand-navy/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-brand-navy truncate max-w-[200px]">{uploadProgress.filename}</span>
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
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>⚠️ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="font-bold text-red-600 hover:text-red-900 min-h-[36px] min-w-[36px] flex items-center justify-center">✕</button>
        </div>
      )}

      {/* Image Gallery & Management List */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {images.map((img, index) => {
            const src = img.url || getR2ImageUrl(img.image_key);

            return (
              <div
                key={img.id || img.image_key || index}
                className={`relative group bg-white rounded-xl border overflow-hidden shadow-sm transition-all ${
                  img.is_primary ? 'border-brand-navy ring-2 ring-brand-navy/30' : 'border-gray-200'
                }`}
              >
                {/* Image thumbnail */}
                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                  <img
                    src={src}
                    alt={img.alt_text || 'Product image'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
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
                <div className="p-2 sm:p-2.5 bg-white space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-1">
                    {!img.is_primary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(img.id)}
                        className="text-[11px] font-bold text-brand-navy hover:text-brand-navy-light px-2 py-1.5 rounded-lg bg-brand-ivory hover:bg-brand-navy/10 min-h-[36px] flex items-center"
                      >
                        Set Primary
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-500 font-semibold px-1 py-1.5 min-h-[36px] flex items-center">
                        Main Image
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="text-red-600 hover:text-white hover:bg-red-600 border border-red-200 text-xs font-semibold p-1.5 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                      title="Delete Image"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Reorder controls with touch-friendly touch targets */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-gray-600">
                    <button
                      type="button"
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      className="hover:text-gray-900 hover:bg-gray-100 disabled:opacity-20 text-xs px-2 py-1 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center font-bold"
                      title="Move Left"
                    >
                      ◀
                    </button>
                    <span className="text-[11px] text-gray-500 font-mono font-semibold">#{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 1)}
                      disabled={index === images.length - 1}
                      className="hover:text-gray-900 hover:bg-gray-100 disabled:opacity-20 text-xs px-2 py-1 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center font-bold"
                      title="Move Right"
                    >
                      ▶
                    </button>
                  </div>

                  {/* Variant capacity tag dropdown */}
                  {availableVariants && availableVariants.length > 0 && (
                    <div className="pt-1.5 border-t border-gray-100">
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">Capacity Tag:</label>
                      <select
                        value={img.variant_id || ''}
                        onChange={(e) => handleAssignVariant(img.id, e.target.value || null)}
                        className="w-full text-[11px] py-1 px-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-navy"
                      >
                        <option value="">Shared Family</option>
                        {availableVariants.map((v) => (
                          <option key={v.id || v.title} value={v.id || ''}>
                            {v.title || v.sku || 'Variant'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
