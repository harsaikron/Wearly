'use client';

import { useState, useCallback } from 'react';
import ClothingCard from '@/components/ClothingCard';
import UploadZone from '@/components/UploadZone';
import CameraCapture from '@/components/Camera';
import { useWardrobeStore } from '@/store/wardrobe';
import { ClothingItem, ClothingCategory, OccasionTag } from '@/types';
import { categoryLabel, occasionLabel } from '@/lib/utils';
import { compressImage, stripDataPrefix } from '@/lib/image-utils';
import { Plus, X, Search, Shirt, Loader, Sparkles, Trash2, Camera } from 'lucide-react';

const CATEGORIES: ClothingCategory[] = [
  'shirt','formal_shirt','tshirt','pants','jeans','shorts',
  'shoes','sneakers','loafers','jacket','watch','belt','accessory',
];
const OCCASIONS: OccasionTag[] = [
  'office','casual','date_night','weekend','smart_casual',
  'minimal','luxury','travel','festive','gym',
];

type FilterCat = ClothingCategory | 'all';

export default function WardrobePage() {
  const { items, addItem, removeItem } = useWardrobeStore();

  const [filter, setFilter]           = useState<FilterCat>('all');
  const [search, setSearch]           = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [showCamera, setShowCamera]   = useState(false);
  const [preview, setPreview]         = useState('');       // data URL
  const [analyzing, setAnalyzing]     = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'shirt' as ClothingCategory,
    color_hex: '#FFFFFF',
    color_name: 'White',
    tags: [] as OccasionTag[],
  });

  const filtered = items.filter((item) => {
    const matchCat = filter === 'all' || item.category === filter;
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.color_name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  async function analyzePhoto(dataUrl: string) {
    setPreview(dataUrl);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-clothing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: stripDataPrefix(dataUrl) }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm({
          name:       data.suggested_name ?? '',
          category:   data.category       ?? 'shirt',
          color_hex:  data.color_hex      ?? '#FFFFFF',
          color_name: data.color_name     ?? 'White',
          tags:       data.tags           ?? [],
        });
      }
    } catch { /* keep blank form */ } finally {
      setAnalyzing(false);
    }
  }

  function onCameraCapture(dataUrl: string) {
    setShowCamera(false);
    analyzePhoto(dataUrl);
  }

  const handleFile = useCallback(async (file: File, _url: string) => {
    const compressed = await compressImage(file);
    analyzePhoto(compressed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTag(tag: OccasionTag) {
    setForm((p) => ({
      ...p,
      tags: p.tags.includes(tag) ? p.tags.filter((t) => t !== tag) : [...p.tags, tag],
    }));
  }

  function handleAdd() {
    if (!form.name || !preview) return;
    const item: ClothingItem = {
      id:         crypto.randomUUID(),
      user_id:    'local',
      name:       form.name,
      category:   form.category,
      color_hex:  form.color_hex,
      color_name: form.color_name,
      image_url:  preview,
      tags:       form.tags,
      times_worn: 0,
      created_at: new Date().toISOString(),
    };
    addItem(item);
    closeModal();
  }

  function closeModal() {
    setShowModal(false);
    setPreview('');
    setAnalyzing(false);
    setForm({ name: '', category: 'shirt', color_hex: '#FFFFFF', color_name: 'White', tags: [] });
  }

  const categories = [...new Set(items.map((i) => i.category))] as ClothingCategory[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Wardrobe</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {items.length === 0
              ? 'Upload your first clothing item to get started'
              : `${items.length} item${items.length !== 1 ? 's' : ''} — click any item to remove`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Filter bar — only show if items exist */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            <Search size={16} style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: 'var(--foreground)' }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', ...categories] as (FilterCat)[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className="px-3 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: filter === cat ? 'var(--accent-muted)' : 'var(--card)',
                  border: filter === cat ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--card-border)',
                  color: filter === cat ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {cat === 'all' ? 'All' : categoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div
          className="rounded-2xl p-16 flex flex-col items-center text-center"
          style={{ background: 'var(--card)', border: '2px dashed var(--card-border)' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-muted)' }}
          >
            <Shirt size={36} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-xl font-semibold mb-2">Your wardrobe is empty</h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--muted)' }}>
            Upload photos of your shirts, pants, shoes, watches, jackets — AI will auto-detect the category and colour.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}
          >
            <Plus size={16} /> Add Your First Item
          </button>
        </div>
      )}

      {/* Items grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="relative group">
              <ClothingCard item={item} />
              <button
                onClick={() => removeItem(item.id)}
                className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                style={{ background: 'rgba(217,60,60,0.85)' }}
                title="Remove"
              >
                <Trash2 size={13} style={{ color: '#fff' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={onCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--card-border)' }}
            >
              <h2 className="font-semibold">Add Clothing Item</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[var(--muted-bg)]" style={{ color: 'var(--muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              {/* Camera / upload choice */}
              {!preview && (
                <button
                  onClick={() => setShowCamera(true)}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #c9a84c22, #e8c96a11)', border: '1px solid rgba(201,168,76,0.4)', color: 'var(--accent)' }}
                >
                  <Camera size={16} /> Use Camera
                </button>
              )}
              {/* Upload zone */}
              <UploadZone onFile={handleFile} preview={preview} label="Or drop / click to upload a photo" />

              {/* AI analyzing indicator */}
              {analyzing && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--accent-muted)', border: '1px solid rgba(201,168,76,0.3)' }}
                >
                  <Loader size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>AI is analysing your photo…</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Detecting category, colour & tags</p>
                  </div>
                </div>
              )}

              {/* AI pre-filled badge */}
              {!analyzing && preview && form.name && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{ background: 'rgba(160,196,160,0.1)', border: '1px solid rgba(160,196,160,0.3)', color: '#a0c4a0' }}
                >
                  <Sparkles size={12} />
                  AI detected and filled the details — review and confirm
                </div>
              )}

              {/* Form — only show after image is selected */}
              {preview && !analyzing && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Item Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. White Oxford Shirt"
                      className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                      style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ClothingCategory }))}
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Colour</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={form.color_hex}
                          onChange={(e) => setForm((p) => ({ ...p, color_hex: e.target.value }))}
                          className="w-10 h-9 rounded-lg cursor-pointer"
                          style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
                        />
                        <input
                          type="text"
                          value={form.color_name}
                          onChange={(e) => setForm((p) => ({ ...p, color_name: e.target.value }))}
                          placeholder="White"
                          className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Occasion Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {OCCASIONS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                          style={{
                            background: form.tags.includes(tag) ? 'rgba(201,168,76,0.2)' : 'var(--muted-bg)',
                            border: form.tags.includes(tag) ? '1px solid rgba(201,168,76,0.5)' : '1px solid var(--card-border)',
                            color: form.tags.includes(tag) ? 'var(--accent)' : 'var(--muted)',
                          }}
                        >
                          {occasionLabel(tag)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div
              className="px-5 py-4 flex gap-3 justify-end"
              style={{ borderTop: '1px solid var(--card-border)' }}
            >
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.name || !preview || analyzing}
                className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}
              >
                Add to Wardrobe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
