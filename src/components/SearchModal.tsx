import React, { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown, Tag } from 'lucide-react';
import { CategoryId, Product } from '../types';
import { ProductCard } from './ProductCard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, size: string, color?: string) => void;
  onBuyNow: (product: Product, size: string, color?: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [priceBracket, setPriceBracket] = useState<'all' | 'under999' | '1000to1999' | 'above2000'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'priceLow' | 'priceHigh' | 'discount'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Available unique sizes in catalog
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.sizes.forEach((s) => set.add(s)));
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Query match
        const q = query.toLowerCase().trim();
        const matchesQuery =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q);

        // Category match
        const matchesCategory =
          selectedCategory === 'all' || p.category === selectedCategory;

        // Size match
        const matchesSize =
          selectedSize === 'all' || p.sizes.includes(selectedSize);

        // Price match
        let matchesPrice = true;
        if (priceBracket === 'under999') matchesPrice = p.sellingPrice < 1000;
        else if (priceBracket === '1000to1999')
          matchesPrice = p.sellingPrice >= 1000 && p.sellingPrice <= 1999;
        else if (priceBracket === 'above2000') matchesPrice = p.sellingPrice >= 2000;

        return matchesQuery && matchesCategory && matchesSize && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'priceLow') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'priceHigh') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'discount') return b.discountPercent - a.discountPercent;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [products, query, selectedCategory, selectedSize, priceBracket, sortBy]);

  if (!isOpen) return null;

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="search-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[#0E1628] rounded-2xl sm:rounded-3xl border border-slate-700 text-slate-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-4"
      >
        {/* Search Input Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-[#0A0F1D] flex items-center gap-2">
          <Search className="w-5 h-5 text-amber-400 shrink-0 ml-1" />
          <input
            type="text"
            autoFocus
            placeholder="Search shirts, jeans, jackets, footwear..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm sm:text-base focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1 text-xs"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer border ${
              showFilters
                ? 'bg-amber-400 text-slate-950 border-amber-400'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Accordion */}
        {showFilters && (
          <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 space-y-3 text-xs animate-in slide-in-from-top-2">
            {/* Category selection */}
            <div>
              <span className="font-bold text-slate-300 block mb-1">Category:</span>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'shirts', 't-shirts', 'jeans', 'trousers', 'jackets', 'footwear', 'accessories'].map(
                  (c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer capitalize border ${
                        selectedCategory === c
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {c}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Size & Price filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              {/* Size */}
              <div>
                <span className="font-bold text-slate-300 block mb-1">Filter by Size:</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedSize('all')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      selectedSize === 'all'
                        ? 'bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    All
                  </button>
                  {availableSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        selectedSize === s
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price bracket */}
              <div>
                <span className="font-bold text-slate-300 block mb-1">Price Range:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'under999', label: 'Under ₹999' },
                    { id: '1000to1999', label: '₹1000 - ₹1999' },
                    { id: 'above2000', label: '₹2000+' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPriceBracket(p.id as any)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        priceBracket === p.id
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sort options */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                Sort By:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
              >
                <option value="newest">Newest First</option>
                <option value="priceLow">Price: Low to High</option>
                <option value="priceHigh">Price: High to Low</option>
                <option value="discount">Biggest Discount %</option>
              </select>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="px-4 py-2.5 bg-slate-950/60 text-xs text-slate-400 flex justify-between items-center border-b border-slate-800">
          <span>Found {filteredProducts.length} men's fashion items</span>
          {(selectedCategory !== 'all' || selectedSize !== 'all' || priceBracket !== 'all') && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSize('all');
                setPriceBracket('all');
              }}
              className="text-amber-400 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Results Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-white">No products found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with different keywords or clearing applied filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelectProduct={(p) => {
                    onClose();
                    onSelectProduct(p);
                  }}
                  onAddToCart={onAddToCart}
                  onBuyNow={(p, size, color) => {
                    onClose();
                    onBuyNow(p, size, color);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
