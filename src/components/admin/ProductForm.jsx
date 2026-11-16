import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminCategories } from '../../services/api/categories.js';
import ImageUploader from './ImageUploader.jsx';
import { paiseToInr, inrToPaise } from '../../utils/currency.js';
import { slugify } from '../../utils/slugify.js';

export default function ProductForm({
  initialData = null,
  isEdit = false,
  onSubmit,
  isSubmitting = false,
  apiError = null
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);

  // Collapsible sections (collapsed by default for simplicity)
  const [showSpecs, setShowSpecs] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);

  // 1. Mandatory Fields (Only English Name and Category)
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // 2. Commercial / Pricing Fields
  const [compareAtPriceInr, setCompareAtPriceInr] = useState('');
  const [priceInr, setPriceInr] = useState('');
  const [minOrderQuantity, setMinOrderQuantity] = useState('');
  const [pricingFormError, setPricingFormError] = useState(null);

  // Variant Management (Phase 11.3)
  const [hasVariants, setHasVariants] = useState(Boolean(initialData?.has_variants));
  const [variants, setVariants] = useState([]);

  // 3. Characteristics / Specifications (Simple 4 useful fields)
  const [specCapacity, setSpecCapacity] = useState('');
  const [specMaterial, setSpecMaterial] = useState('');
  const [specColour, setSpecColour] = useState('');
  const [specPackaging, setSpecPackaging] = useState('');
  const [customSpecs, setCustomSpecs] = useState([]);

  // 4. Additional Optional Details
  const [nameHi, setNameHi] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [descriptionHi, setDescriptionHi] = useState('');
  const [status, setStatus] = useState('active');
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  // Photos: Pending files for new product creation
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);

  // Photos: Existing images for edit mode
  const [images, setImages] = useState([]);

  const [isDirty, setIsDirty] = useState(false);

  // Warn on leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load all categories for admin (including draft-only categories)
  useEffect(() => {
    getAdminCategories({ cache: 'no-cache' })
      .then(cats => {
        setCategories(cats || []);
        if (cats && cats.length > 0 && !categoryId) {
          setCategoryId(cats[0].id);
        }
      })
      .catch(() => { });
  }, []);

  // Pre-fill initialData on edit
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setNameHi(initialData.name_hi || '');
      setSlug(initialData.slug || '');
      setSlugManuallyEdited(true);
      setCategoryId(initialData.category_id || '');
      setDescription(initialData.description || '');
      setDescriptionHi(initialData.description_hi || '');
      setStatus(initialData.status || 'active');
      setIsFeatured(Boolean(initialData.is_featured));
      setSortOrder(initialData.sort_order ?? 0);

      // Commercial
      setCompareAtPriceInr(initialData.compare_at_price_paise != null && initialData.compare_at_price_paise > 0 ? String(paiseToInr(initialData.compare_at_price_paise)) : '');
      setPriceInr(initialData.base_price_paise != null && initialData.base_price_paise > 0 ? String(paiseToInr(initialData.base_price_paise)) : '');
      setMinOrderQuantity(initialData.min_order_quantity != null ? String(initialData.min_order_quantity) : '');

      // Variants
      setHasVariants(Boolean(initialData.has_variants));
      if (initialData.variants && Array.isArray(initialData.variants)) {
        setVariants(initialData.variants.map((v, idx) => ({
          id: v.id || null,
          sku: v.sku || '',
          title: v.title || '',
          title_hi: v.title_hi || '',
          attributes: v.attributes || (v.attributes_json ? (typeof v.attributes_json === 'string' ? JSON.parse(v.attributes_json) : v.attributes_json) : null),
          attributes_json: v.attributes_json || null,
          compareAtPriceInr: v.compare_at_price_paise != null && v.compare_at_price_paise > 0 ? String(paiseToInr(v.compare_at_price_paise)) : '',
          priceInr: v.price_paise != null && v.price_paise > 0 ? String(paiseToInr(v.price_paise)) : '',
          minOrderQuantity: v.min_order_quantity != null ? String(v.min_order_quantity) : '',
          stock_quantity: v.stock_quantity ?? 0,
          status: v.status || 'active',
          sort_order: v.sort_order ?? idx
        })));
      } else {
        setVariants([]);
      }

      // Parse specifications
      let specs = [];
      if (initialData.specifications_json) {
        try {
          const parsed = typeof initialData.specifications_json === 'string'
            ? JSON.parse(initialData.specifications_json)
            : initialData.specifications_json;
          if (Array.isArray(parsed)) specs = parsed;
          else if (typeof parsed === 'object' && parsed !== null) {
            specs = Object.entries(parsed).map(([key, value]) => ({ key, value }));
          }
        } catch { }
      } else if (initialData.specifications) {
        if (Array.isArray(initialData.specifications)) specs = initialData.specifications;
        else if (typeof initialData.specifications === 'object' && initialData.specifications !== null) {
          specs = Object.entries(initialData.specifications).map(([key, value]) => ({ key, value }));
        }
      }

      let cap = '';
      let mat = initialData.material || '';
      let col = '';
      let pack = '';
      const extra = [];

      specs.forEach(s => {
        if (!s || !s.key) return;
        const k = String(s.key).toLowerCase().trim();
        const v = s.value != null ? String(s.value) : '';
        if (k === 'capacity' || k === 'size' || k === 'capacity/size') {
          cap = v;
        } else if (k === 'material') {
          if (!mat) mat = v;
        } else if (k === 'colour' || k === 'color' || k === 'colour/design' || k === 'design') {
          col = v;
        } else if (k === 'packaging' || k === 'package') {
          pack = v;
        } else {
          extra.push(s);
        }
      });

      setSpecCapacity(cap);
      setSpecMaterial(mat);
      setSpecColour(col);
      setSpecPackaging(pack);
      setCustomSpecs(extra);

      // Images
      if (initialData.images && Array.isArray(initialData.images)) {
        setImages(initialData.images);
      }
    }
  }, [initialData]);

  // Auto-slug on name change
  const handleNameChange = (val) => {
    setName(val);
    if (!isEdit && !slugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  // Pending file upload handling for new product
  const handlePendingFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const valid = files.filter(f => allowed.includes(f.type));

    setPendingFiles(prev => [...prev, ...valid]);
    const urls = valid.map(f => URL.createObjectURL(f));
    setPendingPreviews(prev => [...prev, ...urls]);
    setIsDirty(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSetPrimaryPending = (index) => {
    if (index === 0) return;
    const reorderedFiles = [...pendingFiles];
    const [selectedFile] = reorderedFiles.splice(index, 1);
    reorderedFiles.unshift(selectedFile);

    const reorderedPreviews = [...pendingPreviews];
    const [selectedPreview] = reorderedPreviews.splice(index, 1);
    reorderedPreviews.unshift(selectedPreview);

    setPendingFiles(reorderedFiles);
    setPendingPreviews(reorderedPreviews);
    setIsDirty(true);
  };

  // Custom spec row management
  const addCustomSpecRow = () => {
    setCustomSpecs([...customSpecs, { key: '', value: '' }]);
  };

  const updateCustomSpecRow = (index, field, value) => {
    const updated = [...customSpecs];
    updated[index][field] = value;
    setCustomSpecs(updated);
  };

  const removeCustomSpecRow = (index) => {
    setCustomSpecs(customSpecs.filter((_, i) => i !== index));
  };

  // Variant Management Handlers
  const handleAddVariant = () => {
    setVariants(prev => [
      ...prev,
      {
        id: null,
        sku: '',
        title: '',
        title_hi: '',
        compareAtPriceInr: '',
        priceInr: '',
        minOrderQuantity: '',
        stock_quantity: 0,
        status: 'active',
        sort_order: prev.length
      }
    ]);
    setIsDirty(true);
  };

  const handleUpdateVariant = (index, field, value) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setIsDirty(true);
  };

  const handleRemoveVariant = (index) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleMoveVariant = (index, direction) => {
    setVariants(prev => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated.map((v, i) => ({ ...v, sort_order: i }));
    });
    setIsDirty(true);
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setPricingFormError(null);

    // Assemble clean specifications array
    const cleanSpecs = [];
    if (specCapacity.trim()) cleanSpecs.push({ key: 'Capacity', value: specCapacity.trim() });
    if (specMaterial.trim()) cleanSpecs.push({ key: 'Material', value: specMaterial.trim() });
    if (specColour.trim()) cleanSpecs.push({ key: 'Colour', value: specColour.trim() });
    if (specPackaging.trim()) cleanSpecs.push({ key: 'Packaging', value: specPackaging.trim() });

    customSpecs.forEach(s => {
      if (s.key && s.key.trim() && s.value && String(s.value).trim()) {
        cleanSpecs.push({ key: s.key.trim(), value: String(s.value).trim() });
      }
    });

    // Validate Crossed-out Price > Actual Price
    const actualPaise = !hasVariants && priceInr !== '' && priceInr != null && !isNaN(parseFloat(priceInr))
      ? inrToPaise(priceInr)
      : null;
    const comparePaise = !hasVariants && compareAtPriceInr !== '' && compareAtPriceInr != null && !isNaN(parseFloat(compareAtPriceInr))
      ? inrToPaise(compareAtPriceInr)
      : null;

    if (!hasVariants && comparePaise != null && actualPaise != null && comparePaise <= actualPaise) {
      setPricingFormError('Crossed-out price must be greater than actual price.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (hasVariants) {
      for (const v of variants) {
        const vActualPaise = v.priceInr !== '' && v.priceInr != null && !isNaN(parseFloat(v.priceInr))
          ? inrToPaise(v.priceInr)
          : null;
        const vComparePaise = v.compareAtPriceInr !== '' && v.compareAtPriceInr != null && !isNaN(parseFloat(v.compareAtPriceInr))
          ? inrToPaise(v.compareAtPriceInr)
          : null;

        if (vComparePaise != null && vActualPaise != null && vComparePaise <= vActualPaise) {
          setPricingFormError('Crossed-out price must be greater than actual price.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    // Auto-calculated wholesale rate per 100 pcs (Actual Price x 100)
    // Preserves existing expected_price_per_100_paise if price is untouched (Scenario 5)
    let expectedPrice100Paise = null;
    const isPriceUnchanged = initialData && (
      (initialData.base_price_paise == null && priceInr === '') ||
      (initialData.base_price_paise != null && priceInr === String(paiseToInr(initialData.base_price_paise)))
    );

    if (isPriceUnchanged && initialData?.expected_price_per_100_paise != null) {
      expectedPrice100Paise = initialData.expected_price_per_100_paise;
    } else if (actualPaise != null) {
      expectedPrice100Paise = actualPaise * 100;
    }

    const payload = {
      name: name.trim(),
      name_hi: nameHi.trim(),
      slug: (slug.trim() || slugify(name)).toLowerCase(),
      category_id: categoryId,
      description: description.trim() || null,
      description_hi: descriptionHi.trim() || null,
      material: specMaterial.trim() || null,
      brand: initialData?.brand || 'YE',
      status: status || 'active',
      is_featured: isFeatured,
      sort_order: parseInt(sortOrder, 10) || 0,
      notes: null,
      specifications_json: cleanSpecs.length > 0 ? JSON.stringify(cleanSpecs) : null,
      has_variants: hasVariants,
      sku: hasVariants ? null : (initialData?.sku || null),
      base_price_paise: hasVariants ? null : actualPaise,
      compare_at_price_paise: hasVariants ? null : comparePaise,
      min_order_quantity: hasVariants
        ? null
        : (minOrderQuantity !== '' && minOrderQuantity != null && !isNaN(parseInt(minOrderQuantity, 10)) ? parseInt(minOrderQuantity, 10) : null),
      expected_price_per_100_paise: hasVariants ? null : expectedPrice100Paise,
      stock_quantity: initialData?.stock_quantity ?? 0,
      low_stock_threshold: initialData?.low_stock_threshold ?? 5,
      variant_attributes_schema_json: initialData?.variant_attributes_schema_json || null,
      variants: hasVariants
        ? variants.map((v, idx) => {
            const vActualPaise = v.priceInr !== '' && v.priceInr != null && !isNaN(parseFloat(v.priceInr))
              ? inrToPaise(v.priceInr)
              : null;
            const vComparePaise = v.compareAtPriceInr !== '' && v.compareAtPriceInr != null && !isNaN(parseFloat(v.compareAtPriceInr))
              ? inrToPaise(v.compareAtPriceInr)
              : null;

            let vExpected100 = null;
            const oldV = v.id && initialData?.variants?.find(ov => ov.id === v.id);
            const isVUnchanged = oldV && (
              (oldV.price_paise == null && v.priceInr === '') ||
              (oldV.price_paise != null && v.priceInr === String(paiseToInr(oldV.price_paise)))
            );
            if (isVUnchanged && oldV.expected_price_per_100_paise != null) {
              vExpected100 = oldV.expected_price_per_100_paise;
            } else if (vActualPaise != null) {
              vExpected100 = vActualPaise * 100;
            }

            return {
              id: v.id || null,
              sku: v.sku?.trim() || null,
              title: v.title.trim(),
              title_hi: (v.title_hi || v.title).trim(),
              attributes: v.attributes || (v.attributes_json ? (typeof v.attributes_json === 'string' ? JSON.parse(v.attributes_json) : v.attributes_json) : { title: v.title.trim() }),
              price_paise: vActualPaise,
              compare_at_price_paise: vComparePaise,
              expected_price_per_100_paise: vExpected100,
              min_order_quantity: v.minOrderQuantity !== '' && v.minOrderQuantity != null && !isNaN(parseInt(v.minOrderQuantity, 10)) ? parseInt(v.minOrderQuantity, 10) : null,
              stock_quantity: v.stock_quantity ?? 0,
              status: v.status || 'active',
              sort_order: idx
            };
          })
        : []
    };

    setIsDirty(false);
    if (isEdit) {
      onSubmit(payload);
    } else {
      onSubmit(payload, pendingFiles);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to discard them and leave?')) {
        return;
      }
    }
    navigate('/admin/products');
  };

  // Automatic Wholesale Price Calculation for Simple Product:
  // Wholesale Rate per 100 pcs = Actual Price x 100
  // Integer paise math avoids floating-point errors
  const parsedPricePaise = priceInr !== '' && !isNaN(parseFloat(priceInr)) ? inrToPaise(priceInr) : 0;
  const autoWholesalePaise = parsedPricePaise > 0 ? parsedPricePaise * 100 : 0;
  const autoWholesaleInr = autoWholesalePaise > 0 ? paiseToInr(autoWholesalePaise) : null;
  const displayActualInr = parsedPricePaise > 0 ? paiseToInr(parsedPricePaise) : null;

  return (
    <form onSubmit={handleSubmit} onChange={() => setIsDirty(true)} className="space-y-5 sm:space-y-6 max-w-3xl mx-auto">
      {(apiError || pricingFormError) && (
        <div className="p-3.5 sm:p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{pricingFormError || apiError}</span>
        </div>
      )}

      {/* ── CARD 1: MANDATORY BASIC INFORMATION ─────────────────────────────── */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-brand-navy">1. Basic Information</h2>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
              Only Product Name and Category are required to publish.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-amber-100 text-brand-navy font-bold text-[10px] sm:text-[11px] rounded-lg">
            2 Required
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
              Product Name (English) <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Stainless Steel Feeding Bottle 250ml"
              className="w-full px-3.5 sm:px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy font-medium bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
              Category <span className="text-red-600">*</span>
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 sm:px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy font-medium"
            >
              <option value="" disabled>-- Select a Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.name_hi ? `(${c.name_hi})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Publishing Status Selector */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
              Publishing Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatus('active');
                  setIsDirty(true);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold min-h-[44px] flex items-center justify-center gap-2 transition-all ${
                  status === 'active'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                <span>✅ Active (Published)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('draft');
                  setIsDirty(true);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold min-h-[44px] flex items-center justify-center gap-2 transition-all ${
                  status === 'draft'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:text-amber-800'
                }`}
              >
                <span>🔒 Draft (Admin Only)</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {status === 'active'
                ? 'Visible on public website catalogue immediately.'
                : 'Hidden from public catalogue. Preserved safely in admin.'}
            </p>
          </div>

          {isEdit && slug && (
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Preview product in catalogue:</span>
              <a
                href={`/products/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-brand-navy hover:underline flex items-center gap-1 min-h-[36px]"
              >
                <span>Preview Page</span>
                <span>↗</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 2: PRICING & WHOLESALE DETAILS ─────────────────────────────── */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-brand-navy">2. Pricing &amp; Order Quantities</h2>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
              Choose single product or variable family with multiple bottle capacities.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 font-medium text-[10px] sm:text-[11px] rounded-lg">
            {hasVariants ? 'Multiple Variants' : 'Single Product'}
          </span>
        </div>

        {/* Product Type Toggle */}
        <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-1">
          <button
            type="button"
            onClick={() => { setHasVariants(false); setIsDirty(true); }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold min-h-[44px] transition-all flex items-center justify-center gap-2 ${
              !hasVariants
                ? 'bg-brand-navy text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>📦</span>
            <span>Simple Product (Single Capacity)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setHasVariants(true);
              setIsDirty(true);
              if (variants.length === 0) {
                handleAddVariant();
              }
            }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold min-h-[44px] transition-all flex items-center justify-center gap-2 ${
              hasVariants
                ? 'bg-brand-navy text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>🔀</span>
            <span>Variable Product (Multiple Capacities)</span>
          </button>
        </div>

        {!hasVariants ? (
          /* Simple Product Pricing Inputs */
          <div className="space-y-3.5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {/* A. Crossed-out Price (₹) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Crossed-out Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={compareAtPriceInr}
                  onChange={(e) => {
                    setCompareAtPriceInr(e.target.value);
                    setPricingFormError(null);
                  }}
                  placeholder="e.g. 240"
                  className="w-full px-3.5 sm:px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-navy/30 bg-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Original / MRP strikethrough price (optional)
                </p>
              </div>

              {/* B. Actual Price (₹) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Actual Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={priceInr}
                  onChange={(e) => {
                    setPriceInr(e.target.value);
                    setPricingFormError(null);
                  }}
                  placeholder="e.g. 85"
                  className="w-full px-3.5 sm:px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-navy/30 bg-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Actual per-piece selling / wholesale price
                </p>
              </div>

              {/* C. Minimum Order Quantity (MOQ) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Minimum Order (MOQ)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  inputMode="numeric"
                  value={minOrderQuantity}
                  onChange={(e) => setMinOrderQuantity(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full px-3.5 sm:px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-navy/30 bg-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Minimum required order pieces (optional)
                </p>
              </div>
            </div>

            {/* Read-only Auto-calculated Wholesale Rate Preview (100 pcs = Actual Price x 100) */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-brand-navy block">
                  Wholesale Rate (100 pcs):
                </span>
                {autoWholesaleInr != null ? (
                  <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                    <span className="text-base sm:text-lg font-extrabold text-emerald-700">
                      ₹{autoWholesaleInr.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      (Auto-calculated: ₹{displayActualInr.toLocaleString('en-IN')} × 100)
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic mt-0.5">
                    Enter actual price to calculate wholesale rate.
                  </p>
                )}
              </div>
              <span className="px-2 py-1 bg-blue-100 text-brand-navy text-[10px] font-bold uppercase rounded-md tracking-wider shrink-0">
                Auto-Calculated
              </span>
            </div>
          </div>
        ) : (
          /* Variable Product Management Section */
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base shrink-0">ℹ️</span>
              <div>
                <p className="font-semibold">Capacity Variant Family Model</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  Catalogue cards will display <strong className="font-bold">From ₹X</strong> (lowest active variant price) with capacity badges. Detail pages auto-select the lowest capacity and update both single and wholesale pricing synchronously.
                </p>
              </div>
            </div>

            {/* List of Variant Cards (Stacked for optimal mobile layout at 412x915px) */}
            <div className="space-y-3.5">
              {variants.map((v, index) => (
                <div
                  key={v.id || index}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    v.status === 'archived'
                      ? 'bg-gray-50/80 border-gray-200 opacity-75'
                      : 'bg-white border-brand-navy/20 shadow-sm'
                  }`}
                >
                  {/* Variant Card Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-brand-navy text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-brand-navy truncate">
                        {v.title || `Variant ${index + 1}`}
                      </span>
                      {v.status === 'archived' && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded">
                          Archived
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveVariant(index, -1)}
                        disabled={index === 0}
                        className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:text-brand-navy hover:bg-gray-100 disabled:opacity-20 flex items-center justify-center text-xs font-bold transition-colors"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveVariant(index, 1)}
                        disabled={index === variants.length - 1}
                        className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:text-brand-navy hover:bg-gray-100 disabled:opacity-20 flex items-center justify-center text-xs font-bold transition-colors"
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateVariant(index, 'status', v.status === 'active' ? 'archived' : 'active')}
                        className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-semibold border transition-colors ${
                          v.status === 'active'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Toggle Active/Archived Status"
                      >
                        {v.status === 'active' ? 'Active' : 'Archived'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="w-9 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center text-xs font-bold transition-colors"
                        title="Remove Variant"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Variant Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Capacity Title (EN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={v.title}
                        onChange={(e) => handleUpdateVariant(index, 'title', e.target.value)}
                        placeholder="e.g. 150 ml, 1 Litre"
                        className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand-navy bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Capacity Title (HI)
                      </label>
                      <input
                        type="text"
                        value={v.title_hi}
                        onChange={(e) => handleUpdateVariant(index, 'title_hi', e.target.value)}
                        placeholder="e.g. 150 ml, 1 लीटर"
                        className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand-navy bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        SKU (Optional)
                      </label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => handleUpdateVariant(index, 'sku', e.target.value.toUpperCase())}
                        placeholder="e.g. YE-SS-150"
                        className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand-navy bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Crossed-out Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={v.compareAtPriceInr}
                        onChange={(e) => {
                          handleUpdateVariant(index, 'compareAtPriceInr', e.target.value);
                          setPricingFormError(null);
                        }}
                        placeholder="e.g. 240 (Optional)"
                        className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand-navy bg-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Original / MRP (optional)</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Actual Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={v.priceInr}
                        onChange={(e) => {
                          handleUpdateVariant(index, 'priceInr', e.target.value);
                          setPricingFormError(null);
                        }}
                        placeholder="e.g. 85"
                        className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand-navy bg-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Actual wholesale per-piece</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Min Order Qty (MOQ)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        inputMode="numeric"
                        value={v.minOrderQuantity}
                        onChange={(e) => handleUpdateVariant(index, 'minOrderQuantity', e.target.value)}
                        placeholder="e.g. 100 (Optional)"
                        className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand-navy bg-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Min required order pieces</p>
                    </div>

                    {/* Auto-calculated Variant Wholesale Rate Preview (100 pcs = Actual Price x 100) */}
                    {(() => {
                      const vActualPaise = v.priceInr !== '' && !isNaN(parseFloat(v.priceInr)) ? inrToPaise(v.priceInr) : 0;
                      const vWholesaleInr = vActualPaise > 0 ? paiseToInr(vActualPaise * 100) : null;
                      const vDisplayActual = vActualPaise > 0 ? paiseToInr(vActualPaise) : null;
                      return (
                        <div className="col-span-1 sm:col-span-2 md:col-span-3 p-2.5 bg-blue-50/60 border border-blue-200/70 rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-brand-navy">
                              Wholesale Rate (100 pcs):
                            </span>{' '}
                            {vWholesaleInr != null ? (
                              <span className="font-extrabold text-emerald-700">
                                ₹{vWholesaleInr.toLocaleString('en-IN')}{' '}
                                <span className="font-normal text-gray-500">
                                  (Auto-calculated: ₹{vDisplayActual.toLocaleString('en-IN')} × 100)
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">
                                Enter actual price to calculate wholesale rate.
                              </span>
                            )}
                          </div>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-brand-navy text-[9px] font-bold uppercase rounded">
                            Auto
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Variant Button */}
            <button
              type="button"
              onClick={handleAddVariant}
              className="w-full py-3 px-4 border-2 border-dashed border-brand-navy/30 hover:border-brand-navy hover:bg-brand-navy/5 text-brand-navy rounded-xl text-xs sm:text-sm font-bold min-h-[48px] flex items-center justify-center gap-2 transition-colors"
            >
              <span className="text-base">＋</span>
              <span>Add Another Capacity Variant</span>
            </button>
          </div>
        )}
      </div>

      {/* ── CARD 3: PRODUCT PHOTOS ─────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-brand-navy">3. Product Photos</h2>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
              Select one or more photographs. Click any photo to set it as Primary.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 font-medium text-[10px] sm:text-[11px] rounded-lg">
            Optional
          </span>
        </div>

        {isEdit && initialData?.id ? (
          <ImageUploader
            productId={initialData.id}
            availableVariants={hasVariants ? variants : []}
            images={images}
            onImagesChange={(newImgs) => setImages(newImgs)}
          />
        ) : (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePendingFileSelect}
              className="hidden"
              id="product-photo-upload"
            />
            <label
              htmlFor="product-photo-upload"
              className="border-2 border-dashed border-gray-300 hover:border-brand-navy/60 rounded-2xl p-5 sm:p-8 flex flex-col items-center justify-center cursor-pointer bg-brand-ivory/30 hover:bg-brand-ivory/60 transition-colors min-h-[120px]"
            >
              <span className="text-3xl mb-2">📸</span>
              <span className="text-sm font-bold text-brand-navy text-center">Choose Photos or Drag &amp; Drop</span>
              <span className="text-xs text-gray-400 mt-1 text-center">JPEG, PNG, or WebP (multiple photos supported)</span>
            </label>

            {/* Pending Previews */}
            {pendingPreviews.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Selected Photos ({pendingPreviews.length}) &mdash; <span className="font-normal text-gray-500 lowercase">tap to make Primary</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {pendingPreviews.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSetPrimaryPending(idx)}
                      className={`relative group rounded-xl overflow-hidden border aspect-square cursor-pointer transition-all ${idx === 0
                        ? 'border-brand-navy ring-2 ring-brand-navy shadow-md'
                        : 'border-gray-200 hover:border-brand-navy/50'
                        }`}
                    >
                      <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 ? (
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-brand-navy text-white text-[10px] font-bold rounded-md shadow">
                          ★ Primary
                        </span>
                      ) : (
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded-md">
                          Set Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePendingFile(idx);
                        }}
                        className="absolute top-1.5 right-1.5 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm shadow hover:bg-red-700 min-h-[32px] min-w-[32px]"
                        title="Remove Photo"
                      >
                        ✕
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate text-center">
                        {pendingFiles[idx]?.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CARD 4: CHARACTERISTICS & SPECIFICATIONS (COLLAPSIBLE) ───────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSpecs(!showSpecs)}
          className="w-full p-4 sm:p-6 text-left flex items-center justify-between hover:bg-gray-50/60 transition-colors min-h-[56px]"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-brand-ivory text-brand-navy font-bold text-xs flex items-center justify-center border border-brand-navy/15 shrink-0">
              {showSpecs ? '▾' : '▸'}
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-brand-navy">
                4. Product Characteristics
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Capacity, Material, Colour, and Packaging details.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 shrink-0">
            {showSpecs ? 'Collapse' : 'Expand'}
          </span>
        </button>

        {showSpecs && (
          <div className="p-4 sm:p-6 pt-2 border-t border-gray-100 space-y-4 bg-gray-50/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Capacity / Size
                </label>
                <input
                  type="text"
                  value={specCapacity}
                  onChange={(e) => setSpecCapacity(e.target.value)}
                  placeholder="e.g. 250 ml / 500 ml"
                  className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Material
                </label>
                <input
                  type="text"
                  value={specMaterial}
                  onChange={(e) => setSpecMaterial(e.target.value)}
                  placeholder="e.g. Stainless Steel 304 / Borosilicate Glass"
                  className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Colour / Design
                </label>
                <input
                  type="text"
                  value={specColour}
                  onChange={(e) => setSpecColour(e.target.value)}
                  placeholder="e.g. Silver, Blue, Pink"
                  className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Packaging
                </label>
                <input
                  type="text"
                  value={specPackaging}
                  onChange={(e) => setSpecPackaging(e.target.value)}
                  placeholder="e.g. Carton of 50 pcs / Individual Box"
                  className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>
            </div>

            {/* Any extra custom specifications */}
            {customSpecs.length > 0 && (
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Additional Specifications
                </p>
                {customSpecs.map((s, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Specification Name"
                      value={s.key}
                      onChange={(e) => updateCustomSpecRow(idx, 'key', e.target.value)}
                      className="sm:w-1/3 px-3 py-2.5 min-h-[40px] border border-gray-300 rounded-xl text-xs bg-white"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        placeholder="Value"
                        value={s.value}
                        onChange={(e) => updateCustomSpecRow(idx, 'value', e.target.value)}
                        className="flex-1 px-3 py-2.5 min-h-[40px] border border-gray-300 rounded-xl text-xs bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomSpecRow(idx)}
                        className="text-gray-400 hover:text-red-600 font-bold px-3 py-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addCustomSpecRow}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-navy hover:text-brand-navy-light pt-1 min-h-[36px]"
            >
              <span>+ Add another specification row</span>
            </button>
          </div>
        )}
      </div>

      {/* ── CARD 5: ADDITIONAL DETAILS (COLLAPSIBLE) ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdditional(!showAdditional)}
          className="w-full p-4 sm:p-6 text-left flex items-center justify-between hover:bg-gray-50/60 transition-colors min-h-[56px]"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-brand-ivory text-brand-navy font-bold text-xs flex items-center justify-center border border-brand-navy/15 shrink-0">
              {showAdditional ? '▾' : '▸'}
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-brand-navy">
                5. Additional Details
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Hindi translation, descriptions, catalogue visibility &amp; homepage feature.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 shrink-0">
            {showAdditional ? 'Collapse' : 'Expand'}
          </span>
        </button>

        {showAdditional && (
          <div className="p-4 sm:p-6 pt-2 border-t border-gray-100 space-y-4 bg-gray-50/40">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Product Name (Hindi) <span className="font-normal text-gray-400 lowercase">(optional)</span>
              </label>
              <input
                type="text"
                value={nameHi}
                onChange={(e) => setNameHi(e.target.value)}
                placeholder="उदा. स्टेनलेस स्टील फीडिंग बोतल 250ml"
                className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm font-devanagari bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Description (English)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description for website visitors..."
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Description (Hindi)
              </label>
              <textarea
                rows={3}
                value={descriptionHi}
                onChange={(e) => setDescriptionHi(e.target.value)}
                placeholder="हिंदी में उत्पाद का विवरण..."
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-devanagari focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Catalogue Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                >
                  <option value="active">Active (Visible in Catalogue)</option>
                  <option value="draft">Draft (Admin Only)</option>
                  <option value="archived">Archived (Unlisted)</option>
                </select>
              </div>

              <div className="flex items-center pt-2 sm:pt-6">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-gray-800 min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                  />
                  <span>Feature on Homepage</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ACTION BUTTONS ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleCancel}
          className="px-5 py-3 min-h-[44px] bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || !categoryId}
          className="flex-1 sm:flex-initial px-6 sm:px-8 py-3 min-h-[44px] bg-brand-navy text-white text-sm font-bold rounded-xl hover:bg-brand-navy-light shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          <span>{isEdit ? 'Save Changes' : 'Create Product'}</span>
        </button>
      </div>
    </form>
  );
}
