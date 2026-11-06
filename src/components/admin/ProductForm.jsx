import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicCategories } from '../../services/api/categories.js';
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
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('basic'); // basic, variants, specs, images

  // Form State
  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionHi, setDescriptionHi] = useState('');
  const [material, setMaterial] = useState('');
  const [brand, setBrand] = useState('YES ENTERPRISES');
  const [status, setStatus] = useState('active');
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [notes, setNotes] = useState('');

  // Simple Pricing & Stock
  const [sku, setSku] = useState('');
  const [priceInr, setPriceInr] = useState('');
  const [compareAtInr, setCompareAtInr] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');

  // Variable Products State
  const [hasVariants, setHasVariants] = useState(false);
  const [attributeSchema, setAttributeSchema] = useState(['Capacity', 'Colour']); // Dynamic seller attributes
  const [newAttributeName, setNewAttributeName] = useState('');
  const [variants, setVariants] = useState([]);

  // Specifications Key-Value rows
  const [specifications, setSpecifications] = useState([
    { key: 'Material', value: 'Stainless Steel 304' },
    { key: 'Usage', value: 'Commercial & Retail' }
  ]);

  // Images state
  const [images, setImages] = useState([]);

  // Load categories
  useEffect(() => {
    getPublicCategories({ cache: 'no-cache' })
      .then(cats => {
        setCategories(cats || []);
        if (cats && cats.length > 0) {
          setCategoryId(prev => prev || cats[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Pre-fill initialData on edit
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setNameHi(initialData.name_hi || '');
      setSlug(initialData.slug || '');
      setCategoryId(initialData.category_id || '');
      setDescription(initialData.description || '');
      setDescriptionHi(initialData.description_hi || '');
      setMaterial(initialData.material || '');
      setBrand(initialData.brand || 'YES ENTERPRISES');
      setStatus(initialData.status || 'active');
      setIsFeatured(Boolean(initialData.is_featured));
      setSortOrder(initialData.sort_order ?? 0);
      setNotes(initialData.notes || '');

      setSku(initialData.sku || '');
      setPriceInr(initialData.base_price_paise != null ? String(paiseToInr(initialData.base_price_paise)) : '');
      setCompareAtInr(initialData.compare_at_price_paise != null ? String(paiseToInr(initialData.compare_at_price_paise)) : '');
      setStockQuantity(String(initialData.stock_quantity ?? 0));
      setLowStockThreshold(String(initialData.low_stock_threshold ?? 5));

      setHasVariants(Boolean(initialData.has_variants));

      // Parse variant attribute schema
      if (initialData.variant_attributes_schema_json) {
        try {
          const parsed = typeof initialData.variant_attributes_schema_json === 'string'
            ? JSON.parse(initialData.variant_attributes_schema_json)
            : initialData.variant_attributes_schema_json;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAttributeSchema(parsed);
          }
        } catch {}
      }

      // Map variants
      if (initialData.variants && Array.isArray(initialData.variants)) {
        setVariants(initialData.variants.map(v => {
          let attrs = {};
          try {
            attrs = typeof v.attributes_json === 'string' ? JSON.parse(v.attributes_json) : v.attributes_json;
          } catch {}
          return {
            id: v.id,
            sku: v.sku || '',
            title: v.title || '',
            title_hi: v.title_hi || '',
            priceInr: String(paiseToInr(v.price_paise)),
            compareAtInr: v.compare_at_price_paise != null ? String(paiseToInr(v.compare_at_price_paise)) : '',
            stock_quantity: v.stock_quantity ?? 0,
            low_stock_threshold: v.low_stock_threshold ?? 5,
            attributes: attrs || {}
          };
        }));
      }

      // Parse specifications
      if (initialData.specifications_json) {
        try {
          const parsed = typeof initialData.specifications_json === 'string'
            ? JSON.parse(initialData.specifications_json)
            : initialData.specifications_json;
          if (Array.isArray(parsed)) {
            setSpecifications(parsed);
          } else if (typeof parsed === 'object') {
            setSpecifications(Object.entries(parsed).map(([key, value]) => ({ key, value })));
          }
        } catch {}
      }

      // Images
      if (initialData.images && Array.isArray(initialData.images)) {
        setImages(initialData.images);
      }
    }
  }, [initialData]);

  // Handle auto-slug on name change
  const handleNameChange = (val) => {
    setName(val);
    if (!isEdit && (!slug || slug === slugify(name))) {
      setSlug(slugify(val));
    }
  };

  // Dynamic Attribute Schema Management
  const addAttribute = () => {
    const trimmed = newAttributeName.trim();
    if (trimmed && !attributeSchema.includes(trimmed)) {
      setAttributeSchema([...attributeSchema, trimmed]);
      setNewAttributeName('');
    }
  };

  const removeAttribute = (attr) => {
    setAttributeSchema(attributeSchema.filter(a => a !== attr));
  };

  // Variant row management
  const addVariantRow = () => {
    const newVariant = {
      sku: `${sku ? `${sku}-` : 'SKU-'}${variants.length + 1}`,
      title: `${name || 'Product'} (Variant ${variants.length + 1})`,
      title_hi: '',
      priceInr: priceInr || '0',
      compareAtInr: compareAtInr || '',
      stock_quantity: 10,
      low_stock_threshold: 5,
      attributes: {}
    };
    attributeSchema.forEach(attr => {
      newVariant.attributes[attr] = '';
    });
    setVariants([...variants, newVariant]);
  };

  const updateVariantField = (index, field, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const updateVariantAttr = (index, attrName, value) => {
    const updated = [...variants];
    const attrs = { ...(updated[index].attributes || {}), [attrName]: value };
    updated[index] = { ...updated[index], attributes: attrs };
    setVariants(updated);
  };

  const removeVariantRow = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Specification row management
  const addSpecRow = () => {
    setSpecifications([...specifications, { key: '', value: '' }]);
  };

  const updateSpecRow = (index, field, value) => {
    const updated = [...specifications];
    updated[index][field] = value;
    setSpecifications(updated);
  };

  const removeSpecRow = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Clean specifications into JSON string
    const validSpecs = specifications.filter(s => s.key && s.key.trim());
    const specsJson = JSON.stringify(validSpecs);

    // Format Variants if variable
    let formattedVariants = [];
    if (hasVariants) {
      formattedVariants = variants.map((v, i) => ({
        id: v.id || undefined,
        sku: v.sku.trim().toUpperCase(),
        title: v.title || `${name} Variant ${i + 1}`,
        title_hi: v.title_hi || (nameHi.trim() ? `${nameHi.trim()} विकल्प ${i + 1}` : `${v.title || name} विकल्प ${i + 1}`),
        attributes_json: JSON.stringify(v.attributes || {}),
        price_paise: inrToPaise(v.priceInr),
        compare_at_price_paise: v.compareAtInr ? inrToPaise(v.compareAtInr) : null,
        stock_quantity: parseInt(v.stock_quantity, 10) || 0,
        low_stock_threshold: parseInt(v.low_stock_threshold, 10) || 5,
        status: 'active',
        sort_order: i + 1
      }));
    }

    const payload = {
      name: name.trim(),
      name_hi: nameHi.trim() || null,
      slug: slug.trim(),
      category_id: categoryId,
      description: description.trim() || null,
      description_hi: descriptionHi.trim() || null,
      material: material.trim() || null,
      brand: brand.trim() || 'YES ENTERPRISES',
      status,
      is_featured: isFeatured,
      sort_order: parseInt(sortOrder, 10) || 0,
      notes: notes.trim() || null,
      specifications_json: specsJson,
      has_variants: hasVariants,
      sku: !hasVariants && sku.trim() ? sku.trim().toUpperCase() : null,
      base_price_paise: inrToPaise(priceInr),
      compare_at_price_paise: compareAtInr ? inrToPaise(compareAtInr) : null,
      stock_quantity: parseInt(stockQuantity, 10) || 0,
      low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
      variant_attributes_schema_json: hasVariants ? JSON.stringify(attributeSchema) : null,
      variants: formattedVariants
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Top Bar Actions & Error ────────────────────────────────────── */}
      {apiError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
          ⚠️ {apiError}
        </div>
      )}

      {/* ── Tab Bar Navigation ─────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1 text-sm font-bold">
        {[
          { id: 'basic', label: '1. Basic Info & Pricing', icon: '📝' },
          { id: 'variants', label: '2. Product Type & Variants', icon: '🔀' },
          { id: 'specs', label: '3. Specifications', icon: '📋' },
          { id: 'images', label: '4. Image Gallery', icon: '🖼️' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-brand-navy text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: BASIC INFORMATION & PRICING ──────────────────────────── */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
              General Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Product Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Stainless Steel Feeding Bottle 250ml"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Product Name (Hindi)
                </label>
                <input
                  type="text"
                  value={nameHi}
                  onChange={(e) => setNameHi(e.target.value)}
                  placeholder="उदा. स्टेनलेस स्टील फीडिंग बोतल 250ml"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 font-devanagari"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="product-url-slug"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                >
                  <option value="" disabled>-- Select a Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="YES ENTERPRISES"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description (English)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed English product description..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description (Hindi)
                </label>
                <textarea
                  rows={3}
                  value={descriptionHi}
                  onChange={(e) => setDescriptionHi(e.target.value)}
                  placeholder="हिंदी विवरण दर्ज करें..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 font-devanagari"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white"
                >
                  <option value="active">Active (Visible in Catalogue)</option>
                  <option value="draft">Draft (Admin Only)</option>
                  <option value="archived">Archived (Unlisted)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Primary Material
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. Borosilicate Glass / SS 304"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                  />
                  Feature on Homepage
                </label>
              </div>
            </div>
          </div>

          {/* Pricing & Stock (Only displayed directly if not variable product) */}
          {!hasVariants && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                Pricing & Inventory (Simple Product)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Selling Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required={!hasVariants}
                    value={priceInr}
                    onChange={(e) => setPriceInr(e.target.value)}
                    placeholder="e.g. 299.00"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    MRP / Compare Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={compareAtInr}
                    onChange={(e) => setCompareAtInr(e.target.value)}
                    placeholder="e.g. 399.00"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Stock Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required={!hasVariants}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="100"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Stock Keeping Unit (SKU)
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="YE-BOT-01"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PRODUCT TYPE & VARIANTS ──────────────────────────────── */}
      {activeTab === 'variants' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Product Type Selection
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Choose between a single standalone product or multiple size/colour variants.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-brand-ivory px-3.5 py-2 rounded-xl border border-brand-navy/10">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                  />
                  <span className="text-xs font-bold text-brand-navy">Enable Variable Product</span>
                </label>
              </div>
            </div>

            {hasVariants ? (
              <div className="space-y-6 pt-2">
                {/* Attribute Schema Configurator */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Seller-Defined Attributes (e.g. Capacity, Colour, Compartments)
                  </h4>
                  <div className="flex flex-wrap gap-2 items-center">
                    {attributeSchema.map((attr) => (
                      <span
                        key={attr}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 shadow-sm"
                      >
                        {attr}
                        <button
                          type="button"
                          onClick={() => removeAttribute(attr)}
                          className="text-gray-400 hover:text-red-600 font-bold ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="New Attribute..."
                        value={newAttributeName}
                        onChange={(e) => setNewAttributeName(e.target.value)}
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg w-32 focus:outline-none focus:ring-1 focus:ring-brand-navy"
                      />
                      <button
                        type="button"
                        onClick={addAttribute}
                        className="px-2.5 py-1 bg-brand-navy text-white text-xs font-semibold rounded-lg hover:bg-brand-navy-light"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Variants Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Product Variants ({variants.length})
                    </h4>
                    <button
                      type="button"
                      onClick={addVariantRow}
                      className="px-3 py-1.5 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-brand-navy-light shadow-sm"
                    >
                      + Add Variant
                    </button>
                  </div>

                  {variants.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 text-xs">
                      No variants added yet. Click "+ Add Variant" to configure individual SKUs and prices.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2.5">SKU *</th>
                            <th className="px-3 py-2.5">Title</th>
                            {attributeSchema.map(attr => (
                              <th key={attr} className="px-3 py-2.5">{attr}</th>
                            ))}
                            <th className="px-3 py-2.5">Price (₹) *</th>
                            <th className="px-3 py-2.5">Stock *</th>
                            <th className="px-3 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {variants.map((v, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  required
                                  value={v.sku}
                                  onChange={(e) => updateVariantField(idx, 'sku', e.target.value.toUpperCase())}
                                  placeholder="SKU-01"
                                  className="w-24 px-2 py-1 border border-gray-300 rounded font-mono uppercase"
                                />
                              </td>

                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={v.title}
                                  onChange={(e) => updateVariantField(idx, 'title', e.target.value)}
                                  placeholder="Variant Title"
                                  className="w-32 px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>

                              {attributeSchema.map(attr => (
                                <td key={attr} className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={v.attributes[attr] || ''}
                                    onChange={(e) => updateVariantAttr(idx, attr, e.target.value)}
                                    placeholder={attr}
                                    className="w-24 px-2 py-1 border border-gray-300 rounded"
                                  />
                                </td>
                              ))}

                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  value={v.priceInr}
                                  onChange={(e) => updateVariantField(idx, 'priceInr', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded font-bold"
                                />
                              </td>

                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  required
                                  value={v.stock_quantity}
                                  onChange={(e) => updateVariantField(idx, 'stock_quantity', e.target.value)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded"
                                />
                              </td>

                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeVariantRow(idx)}
                                  className="text-red-600 hover:text-red-800 font-bold p-1"
                                  title="Remove Variant"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-4">
                This is configured as a Simple Product. Switch the toggle above if this product has multiple sizes, colours, or packaging options.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: SPECIFICATIONS ───────────────────────────────────────── */}
      {activeTab === 'specs' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Product Specifications
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Add flexible technical specifications (Material, Capacity, Packaging, MOQ, Usage).
              </p>
            </div>
            <button
              type="button"
              onClick={addSpecRow}
              className="px-3.5 py-1.5 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-brand-navy-light shadow-sm"
            >
              + Add Specification
            </button>
          </div>

          <div className="space-y-2">
            {specifications.map((spec, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Feature / Key (e.g. Material)"
                  value={spec.key}
                  onChange={(e) => updateSpecRow(index, 'key', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. Borosilicate Glass 304)"
                  value={spec.value}
                  onChange={(e) => updateSpecRow(index, 'value', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
                <button
                  type="button"
                  onClick={() => removeSpecRow(index)}
                  className="text-gray-400 hover:text-red-600 font-bold p-1.5"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: IMAGE GALLERY ────────────────────────────────────────── */}
      {activeTab === 'images' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Product Images & R2 Storage
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload photos directly to Cloudflare R2 with automatic client-side compression.
            </p>
          </div>

          {!initialData?.id ? (
            <div className="p-8 text-center bg-brand-ivory/50 border border-brand-navy/10 rounded-2xl">
              <span className="text-3xl block mb-2">💾</span>
              <p className="text-sm font-bold text-brand-navy">Save Product First</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Please complete basic information and save this product to generate a permanent database ID before attaching image uploads.
              </p>
            </div>
          ) : (
            <ImageUploader
              productId={initialData.id}
              images={images}
              onImagesChange={(newImgs) => setImages(newImgs)}
            />
          )}
        </div>
      )}

      {/* ── Form Action Buttons ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => navigate('/admin/products')}
          className="px-5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-brand-navy text-white text-sm font-bold rounded-xl hover:bg-brand-navy-light shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>
    </form>
  );
}

