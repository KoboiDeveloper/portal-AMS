
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Category, PosCategory, Product } from "../../types/pos";
import { CategoryIcon } from "./CategoryIcon";
import { SmoothScrollArea } from "./SmoothScrollArea";

type CategorySidebarProps = {
  activeCategory: Category;
  onSelect: (category: Category) => void;
  categories: PosCategory[];
  products: Product[];
  loading?: boolean;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
};

export function CategorySidebar({
  activeCategory,
  onSelect,
  categories,
  products,
  loading = false,
  collapsed,
  onCollapsedChange,
}: CategorySidebarProps) {
  const total = products.length;

  return (
    <aside className={cn("pos-cat", collapsed && "is-collapsed")}>
      {!collapsed && (
        <div className="pos-cat__head">
          <div className="pos-cat__head-card">
            <p className="pos-cat__head-title">Semua Kategori</p>
            <p className="pos-cat__head-sub">
              {loading ? "Memuat..." : `${total} Items`}
            </p>
          </div>
        </div>
      )}

      <SmoothScrollArea
        className="pos-cat__list"
        revision={`${categories.length}|${collapsed}`}
      >
        {categories.map((cat) => {
          const active = activeCategory === cat.code;

          return (
            <button
              key={cat.code}
              type="button"
              onClick={() => onSelect(cat.code)}
              title={cat.label}
              className={cn("pos-cat__item", active && "is-active")}
            >
              <CategoryIcon label={cat.label} className="pos-cat__icon" />
              {!collapsed && (
                <span className="pos-cat__label">
                  <p className="pos-cat__name">{cat.label}</p>
                </span>
              )}
            </button>
          );
        })}
      </SmoothScrollArea>

      <div className="pos-cat__foot">
        <button
          type="button"
          className="pos-cat__collapse"
          onClick={() => onCollapsedChange(!collapsed)}
          title={collapsed ? "Perlebar kategori" : "Perkecil kategori"}
          aria-label={collapsed ? "Perlebar kategori" : "Perkecil kategori"}
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Perkecil</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
