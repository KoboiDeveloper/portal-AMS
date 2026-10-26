import type { Product, ScanExactHit } from "../../types/pos";
import { ProductDetailContent, type ProductDetailVariant } from "./ProductDetailContent";

type ScanProductPanelProps = {
  hit: ScanExactHit;
  onAddToCart: (product: Product, variant: ProductDetailVariant) => void;
  onDismiss: () => void;
};

export function ScanProductPanel({ hit, onAddToCart, onDismiss }: ScanProductPanelProps) {
  const isPluScan = hit.matchType === "plu";

  return (
    <ProductDetailContent
      product={hit.product}
      onAddToCart={onAddToCart}
      onDismiss={onDismiss}
      initialColor={hit.variant.color}
      initialSize={hit.variant.size}
      lockVariant={isPluScan}
      scanMode={hit.matchType}
      otherStores={hit.otherStores}
      layout="inline"
    />
  );
}