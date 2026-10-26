import { memo, useEffect, useRef, useState } from "react";
import type { Product } from "../../types/pos";
import { ProductImage } from "./ProductImage";
import { ProductPreviewDialog } from "./ProductPreviewDialog";

type ProductGridProps = {
  products: Product[];
  onAdd: (product: Product) => void;
  /** Query partial dari kotak scan — filter tampilan default */
  searchQuery?: string;
  loading?: boolean;
  error?: string;
};

function ProductGridBase({
  products,
  onAdd,
  searchQuery = "",
  loading = false,
  error = "",
}: ProductGridProps) {
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const q = searchQuery.trim();
  const isSearching = q.length > 0;
  const revision = `${q}|${loading}|${error}|${products.length}`;

  useEffect(() => {
    scrollRef.current?.scrollTo?.(0, 0);
  }, [revision]);

  const handleAddFromPreview = (
    product: Product,
    variant: { plu: string; size: string; color: string; stock: number; image?: string }
  ) => {
    onAdd({
      ...product,
      id: variant.plu,
      barcode: variant.plu,
      name: `${product.name} (${variant.color} / ${variant.size})`,
      stock: variant.stock,
      image: variant.image || product.image,
    });
  };

  return (
    <>
      <div className="pos-products">
        <div className="pos-products__meta">
          <span className="pos-products__badge">{products.length} Produk</span>
          <span className="pos-products__hint">
            {isSearching ? `hasil pencarian “${q}”` : "dalam kategori ini"}
          </span>
        </div>

        {/*
          Grid produk: scroll native.
          Locomotive transform di parent bikin kartu aspect-ratio 3/4 jadi garis horizontal.
          Desain kartu (overlay nama/harga) tetap sama.
        */}
        <div ref={scrollRef} className="pos-products__scroll pos-products__scroll--native">
          {loading ? (
            <div className="pos-products__empty">
              <p>Memuat produk...</p>
            </div>
          ) : error ? (
            <div className="pos-products__empty">
              <p>{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="pos-products__empty">
              <p>Tidak ada produk{isSearching ? " untuk pencarian ini" : ""}</p>
            </div>
          ) : (
            <div className="pos-products__grid">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="pos-product-card"
                  onClick={() => setPreviewProduct(product)}
                >
                  <div className="pos-product-card__img">
                    <ProductImage
                      src={product.image}
                      alt={product.name}
                      category={product.category}
                    />
                    <div className="pos-product-card__overlay">
                      <span>Pilih Varian</span>
                    </div>
                    <div className="pos-product-card__body">
                      <p className="pos-product-card__name">{product.name}</p>
                      <div className="pos-product-card__meta">
                        <span className="pos-product-card__sku">
                          {product.article || product.barcode}
                        </span>
                        <span className="pos-product-card__price">
                          Rp{product.price.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductPreviewDialog
        product={previewProduct}
        open={!!previewProduct}
        onClose={() => setPreviewProduct(null)}
        onAddToCart={handleAddFromPreview}
      />
    </>
  );
}

export const ProductGrid = memo(ProductGridBase);
