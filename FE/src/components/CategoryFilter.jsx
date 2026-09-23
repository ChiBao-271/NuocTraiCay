export function CategoryFilter({ categories, activeCategory, onChange }) {
  return (
    <div className="category-filter" role="tablist" aria-label="Lọc sản phẩm">
      {categories.map((category) => (
        <button
          key={category.id}
          className={category.id === activeCategory ? 'active' : ''}
          type="button"
          onClick={() => onChange(category.id)}
        >
          <span>{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
}

