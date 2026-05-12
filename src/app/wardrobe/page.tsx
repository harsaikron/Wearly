'use client';

import { useState, useCallback } from 'react';
import ClothingCard from '@/components/ClothingCard';
import UploadZone from '@/components/UploadZone';
import { mockClothingItems } from '@/lib/mock-data';
import { ClothingItem, ClothingCategory, OccasionTag } from '@/types';
import { categoryLabel, occasionLabel } from '@/lib/utils';
import { Plus, X, Search } from 'lucide-react';

const categories: ClothingCategory[] = [
  'shirt', 'formal_shirt', 'tshirt', 'pants', 'jeans', 'shorts',
  'shoes', 'sneakers', 'loafers', 'jacket', 'watch', 'belt', 'accessory',
];

const occasions: OccasionTag[] = [
  'office', 'casual', 'date_night', 'weekend', 'smart_casual',
  'minimal', 'luxury', 'travel', 'festive', 'gym',
];

const ALL_FILTER = 'all';

export default function WardrobePage() {
  const [items, setItems] = useState<ClothingItem[]>(mockClothingItems);
  const [filter, setFilter] = useState<string>(ALL_FILTER);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'shirt' as ClothingCategory,
    color_hex: '#FFFFFF',
    color_name: 'White',
    tags: [] as OccasionTag[],
  });

  const filtered = items.filter((item) => {
    const matchCategory = filter === ALL_FILTER || item.category === filter;
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.color_name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleFile = useCallback((file: File, url: string) => {
    setPreview(url);
    setNewItem((prev) => ({ ...prev, name: file.name.replace(/\.[^.]+$/, '').replace(/-|_/g, ' ') }));
  }, []);

  function toggleTag(tag: OccasionTag) {
    setNewItem((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }

  function handleAdd() {
    if (!newItem.name || !preview) return;
    const item: ClothingItem = {
      id: crypto.randomUUID(),
      user_id: 'user1',
      name: newItem.name,
      category: newItem.category,
      color_hex: newItem.color_hex,
      color_name: newItem.color_name,
      image_url: preview,
      tags: newItem.tags,
      times_worn: 0,
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [item, ...prev]);
    setShowAddModal(false);
    setPreview('');
    setNewItem({ name: '', category: 'shirt', color_hex: '#FFFFFF', color_name: 'White', tags: [] });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Wardrobe</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {items.length} items · Manage and tag your clothing
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#000' }}
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        >
          <Search size={16} style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search by name or colour…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: 'var(--foreground)' }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter(ALL_FILTER)}
            className="px-3 py-2 rounded-xl text-sm transition-all"
            style={{
              background: filter === ALL_FILTER ? 'var(--accent-muted)' : 'var(--card)',
              border: filter === ALL_FILTER ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--card-border)',
              color: filter === ALL_FILTER ? 'var(--accent)' : 'var(--muted)',
            }}
          >
            All
          </button>
          {categories.slice(0, 6).map((cat) => (
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
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--muted)' }}>
          <p className="text-lg">No items found.</p>
          <p className="text-sm mt-1">Try a different filter or add a new item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <ClothingCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
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
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg transition-all hover:bg-[var(--muted-bg)]"
                style={{ color: 'var(--muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <UploadZone onFile={handleFile} preview={preview} />

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  Item Name
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. White Oxford Shirt"
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{
                    background: 'var(--muted-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value as ClothingCategory }))}
                    className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                    style={{
                      background: 'var(--muted-bg)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{categoryLabel(c)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                    Colour
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newItem.color_hex}
                      onChange={(e) => setNewItem((p) => ({ ...p, color_hex: e.target.value }))}
                      className="w-10 h-9 rounded-lg cursor-pointer"
                      style={{ background: 'var(--muted-bg)', border: '1px solid var(--card-border)' }}
                    />
                    <input
                      type="text"
                      value={newItem.color_name}
                      onChange={(e) => setNewItem((p) => ({ ...p, color_name: e.target.value }))}
                      placeholder="White"
                      className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                      style={{
                        background: 'var(--muted-bg)',
                        border: '1px solid var(--card-border)',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>
                  Occasion Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {occasions.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: newItem.tags.includes(tag) ? 'rgba(201,168,76,0.2)' : 'var(--muted-bg)',
                        border: newItem.tags.includes(tag) ? '1px solid rgba(201,168,76,0.5)' : '1px solid var(--card-border)',
                        color: newItem.tags.includes(tag) ? 'var(--accent)' : 'var(--muted)',
                      }}
                    >
                      {occasionLabel(tag)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4 flex gap-3 justify-end"
              style={{ borderTop: '1px solid var(--card-border)' }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-sm transition-all"
                style={{ background: 'var(--muted-bg)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newItem.name || !preview}
                className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
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
