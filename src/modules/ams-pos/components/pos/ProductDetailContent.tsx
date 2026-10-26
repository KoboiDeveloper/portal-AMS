import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, ShoppingCart, Store, X } from "lucide-react";
import type { Product, ScanMatchType, StoreStockAvailability } from "../../types/pos";
import { colorSwatchBackground, isLightColor } from "../../lib/color-palette";
import { usePosStore } from "../../store/use-pos-store";
import { ProductImage } from "./ProductImage";

export type ProductDetailVariant = {
  plu: string;
  size: string;
  color: string;
  stock: number;
  image?: string;
};

type ProductDetailContentProps = {
  product: Product;
  onAddToCart: (product: Product, variant: ProductDetailVariant) => void;
  onDismiss?: () => void;
  initialColor?: string | null;
  initialSize?: string | null;
  lockVariant?: boolean;
  scanMode?: ScanMatchType;
  otherStores?: StoreStockAvailability[];
  /** inline = area produk tengah; dialog = di dalam modal */
  layout?: "inline" | "dialog";
};

export function ProductDetailContent({
  product,
  onAddToCart,
  onDismiss,
  initialColor = null,
  initialSize = null,
  lockVariant = false,
  scanMode,
  otherStores = [],
  layout = "dialog",
}: ProductDetailContentProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const cart = usePosStore((s) => s.cart);

  const rootClass = layout === "inline" ? "pos-scan-product" : "pos-preview-dialog";

  const variants = useMemo(() => product.variants ?? [], [product.variants]);

  const uniqueColors = useMemo(
    () =>
      Array.from(
        new Map(variants.map((v) => [v.color, { color: v.color, colorHex: v.colorHex }])).values()
      ),
    [variants]
  );

  const availableSizes = useMemo(() => {
    if (!selectedColor) return [];
    return variants.filter((v) => v.color === selectedColor).map((v) => v.size);
  }, [variants, selectedColor]);
  const allSizes = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.size))),
    [variants]
  );

  const selectedVariant = useMemo(() => {
    if (!selectedColor || !selectedSize) return null;
    return variants.find((v) => v.color === selectedColor && v.size === selectedSize) ?? null;
  }, [variants, selectedColor, selectedSize]);

  const activeImage = useMemo(() => {
    if (selectedColor) {
      const colorImage = variants.find(
        (v) => v.color === selectedColor && v.image
      )?.image;
      if (colorImage) return colorImage;
    }
    if (selectedVariant?.image) return selectedVariant.image;
    return product.image || "";
  }, [product.image, selectedColor, selectedVariant, variants]);

  const isOos = !!selectedVariant && selectedVariant.stock <= 0;
  const inCartQty = selectedVariant
    ? cart.find((item) => item.productId === selectedVariant.plu)?.qty ?? 0
    : 0;
  const remaining = selectedVariant
    ? Math.max(0, selectedVariant.stock - inCartQty)
    : 0;
  const resolvedOtherStores = useMemo(() => {
    if (!selectedVariant || selectedVariant.stock > 0) return [] as StoreStockAvailability[];
    return otherStores;
  }, [selectedVariant, otherStores]);
  const showOtherStores = isOos && resolvedOtherStores.length > 0;

  useEffect(() => {
    const onlyVariant = variants.length === 1 ? variants[0] : null;
    const nextColor = initialColor ?? onlyVariant?.color ?? null;
    setSelectedColor(nextColor);
    if (initialSize) {
      setSelectedSize(initialSize);
    } else if (nextColor) {
      const sizesForColor = variants.filter((v) => v.color === nextColor);
      const preferred =
        sizesForColor.find((v) => v.stock > 0) ?? sizesForColor[0] ?? null;
      setSelectedSize(preferred?.size ?? null);
    } else {
      setSelectedSize(null);
    }
    setJustAdded(false);
  }, [product.id, initialColor, initialSize, variants]);

  const handleColorSelect = (color: string) => {
    if (lockVariant) return;
    setSelectedColor(color);
    const sizesForColor = variants.filter((v) => v.color === color);
    const preferred =
      sizesForColor.find((v) => v.stock > 0) ?? sizesForColor[0] ?? null;
    setSelectedSize(preferred?.size ?? null);
  };

  const handleSizeSelect = (size: string) => {
    if (lockVariant) return;
    setSelectedSize(size);
  };

  const handleAdd = () => {
    if (!selectedVariant || remaining <= 0) return;
    onAddToCart(product, {
      plu: selectedVariant.plu,
      size: selectedVariant.size,
      color: selectedVariant.color,
      stock: selectedVariant.stock,
      image: activeImage,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 700);
  };

  const canAdd = remaining > 0;

  const detailGrid = (
    <div className={`${rootClass}__grid`}>
      <div className={`${rootClass}__img-wrap`}>
        <ProductImage
          src={activeImage}
          alt={product.name}
          category={product.category}
          eager
        />
        <span className={`${rootClass}__cat-badge`}>{product.category}</span>
      </div>

      <div className={`${rootClass}__body`}>
        {layout === "dialog" && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`${rootClass}__close`}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        )}

        <div className={`${rootClass}__meta`}>
            <p className={`${rootClass}__cat`}>{product.category}</p>
            <h2 className={`${rootClass}__name`}>{product.name}</h2>
            {!lockVariant && (
              <p className={`${rootClass}__sku`}>
                PLU: {selectedVariant?.plu ?? product.barcode}
              </p>
            )}
            {lockVariant && (
              <p className={`${rootClass}__sku`}>
                Artikel: {product.article || product.barcode}
              </p>
            )}
            <p className={`${rootClass}__price`}>
              Rp{product.price.toLocaleString("id-ID")}
            </p>
          </div>

          {isOos && (
            <div className={`${rootClass}__oos-banner`}>
              <Store size={16} />
              <div>
                <strong>Stok di toko ini habis</strong>
                <p>Arahkan customer ke toko lain yang masih tersedia untuk varian ini.</p>
              </div>
            </div>
          )}

          {lockVariant && selectedVariant && selectedColor && selectedSize ? (
            <div
              className={[
                `${rootClass}__scan-specs`,
                selectedVariant.stock <= 0 ? "is-oos" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={`${rootClass}__scan-spec-row`}>
                <span>Warna</span>
                <span className={`${rootClass}__scan-spec-value`}>
                  <span
                    className={[
                      `${rootClass}__scan-spec-swatch`,
                      isLightColor(
                        uniqueColors.find((c) => c.color === selectedColor)?.colorHex ?? ""
                      )
                        ? "is-light"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ background: colorSwatchBackground(selectedColor) }}
                    aria-hidden="true"
                  />
                  {selectedColor}
                </span>
              </div>
              <div className={`${rootClass}__scan-spec-row`}>
                <span>
                  {allSizes.length === 1 && allSizes[0] === "-" ? "Varian" : "Ukuran"}
                </span>
                <strong>{selectedSize}</strong>
              </div>
              <div className={`${rootClass}__scan-spec-row`}>
                <span>PLU</span>
                <code>{selectedVariant.plu}</code>
              </div>
              <div className={`${rootClass}__scan-spec-row`}>
                <span>Stok toko</span>
                <strong
                  className={
                    selectedVariant.stock <= 0
                      ? `${rootClass}__scan-spec-stock is-oos`
                      : `${rootClass}__scan-spec-stock`
                  }
                >
                  {selectedVariant.stock} pcs
                </strong>
              </div>
            </div>
          ) : (
            <>
              <hr className={`${rootClass}__divider`} />

              <div className={`${rootClass}__section`}>
                <p className={`${rootClass}__label`}>
                  Warna
                  {selectedColor && <span> — {selectedColor}</span>}
                </p>
                <div className={`${rootClass}__swatches`}>
                  {uniqueColors.map(({ color, colorHex }) => {
                    const isLight = isLightColor(colorHex);
                    const isActive = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorSelect(color)}
                        title={color}
                        className={[
                          `${rootClass}__swatch`,
                          isLight ? "is-light" : "",
                          isActive ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ background: colorSwatchBackground(color) }}
                      >
                        {isActive && (
                          <span
                            className={[
                              `${rootClass}__swatch-dot`,
                              isLight ? "is-dark" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`${rootClass}__section`}>
                <p className={`${rootClass}__label`}>
                  {allSizes.length === 1 && allSizes[0] === "-" ? "Varian" : "Ukuran"}
                  {!selectedColor && <span className="is-muted"> — pilih warna dulu</span>}
                </p>
                <div className={`${rootClass}__sizes`}>
                  {allSizes.map((size) => {
                    const available = availableSizes.includes(size);
                    const isActive = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!available}
                        onClick={() => handleSizeSelect(size)}
                        className={[
                          `${rootClass}__size`,
                          isActive ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`${rootClass}__plu`}>
                {selectedVariant ? (
                  <div
                    className={`${rootClass}__plu-box${
                      selectedVariant.stock <= 0 ? " is-oos" : ""
                    }`}
                  >
                    <span className={`${rootClass}__plu-label`}>PLU</span>
                    <span className={`${rootClass}__plu-code`}>{selectedVariant.plu}</span>
                    <span className={`${rootClass}__plu-stock`}>
                      Stok toko: {selectedVariant.stock}
                    </span>
                  </div>
                ) : (
                  <div className={`${rootClass}__plu-box is-empty`}>
                    <span className={`${rootClass}__plu-hint`}>
                      Pilih warna &amp; ukuran untuk melihat PLU
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {showOtherStores && (
            <div className={`${rootClass}__stores`}>
              <div className={`${rootClass}__stores-head`}>
                <MapPin size={15} />
                <span>Tersedia di toko lain</span>
              </div>
              <div className={`${rootClass}__stores-list`}>
                {resolvedOtherStores.map((s) => (
                  <div key={s.storeId} className={`${rootClass}__store-row`}>
                    <div className={`${rootClass}__store-info`}>
                      <strong>{s.storeName}</strong>
                      <span>
                        {s.kota}, {s.provinsi}
                      </span>
                    </div>
                    <span className={`${rootClass}__store-qty`}>{s.qty} pcs</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isOos && resolvedOtherStores.length === 0 && (
            <p className={`${rootClass}__stores-empty`}>
              Tidak ada stok di toko lain untuk varian ini.
            </p>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className={[
              `${rootClass}__add`,
              justAdded ? "is-success" : canAdd ? "is-ready" : "is-disabled",
            ].join(" ")}
          >
            <ShoppingCart size={16} />
            {justAdded
              ? "Ditambahkan!"
              : canAdd
                ? "Tambah ke Keranjang"
                : "Stok tidak tersedia"}
          </button>
        </div>
      </div>
  );

  if (layout === "inline") {
    return (
      <div className={`pos-scan-product${showOtherStores ? " is-wide" : ""}`}>
        {onDismiss && (
          <div className="pos-scan-product__toolbar">
            <button type="button" className="pos-scan-product__back" onClick={onDismiss}>
              <ArrowLeft size={16} />
              Kembali ke katalog
            </button>
            <span className="pos-scan-product__scan-badge">
              {scanMode === "plu"
                ? "Scan PLU"
                : scanMode === "article"
                  ? "Scan Artikel"
                  : "Hasil scan"}
            </span>
          </div>
        )}
        {detailGrid}
      </div>
    );
  }

  return detailGrid;
}
