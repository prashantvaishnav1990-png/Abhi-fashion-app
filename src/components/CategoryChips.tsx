import React from 'react';
import { Category, CategoryId } from '../types';

interface CategoryChipsProps {
  categories: Category[];
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (categoryId: CategoryId | 'all') => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <section className="my-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
            Explore Categories
          </h2>
          <p className="text-xs text-slate-400">Curated styles for every occasion</p>
        </div>
        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs text-amber-400 font-bold hover:underline cursor-pointer"
          >
            Show All
          </button>
        )}
      </div>

      {/* Mobile horizontal scroll / responsive grid */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x md:grid md:grid-cols-7 md:gap-3">
        {/* 'All' pill */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`shrink-0 snap-start px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer border ${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
        >
          All (All Items)
        </button>

        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              id={`cat-card-${category.id}`}
              onClick={() => onSelectCategory(category.id)}
              className={`shrink-0 snap-start relative overflow-hidden rounded-xl transition cursor-pointer border group text-left w-28 sm:w-32 md:w-auto h-24 sm:h-28 flex flex-col justify-end p-2.5 ${
                isSelected
                  ? 'border-amber-400 ring-2 ring-amber-400/40'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Image */}
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition duration-500 brightness-60"
              />
              <div
                className={`absolute inset-0 transition ${
                  isSelected
                    ? 'bg-gradient-to-t from-amber-950/90 via-slate-950/40 to-transparent'
                    : 'bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent'
                }`}
              />

              {/* Text */}
              <div className="relative z-10">
                <span
                  className={`text-xs font-black tracking-wide block uppercase ${
                    isSelected ? 'text-amber-300' : 'text-white'
                  }`}
                >
                  {category.name}
                </span>
                <span className="text-[10px] text-slate-300 line-clamp-1">
                  {category.itemCountLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
