import { X } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import type { Product, StoreStockAvailability } from "../../types/pos";
import { ProductDetailContent, type ProductDetailVariant } from "./ProductDetailContent";

type Props = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, variant: ProductDetailVariant) => void;
  initialColor?: string | null;
  initialSize?: string | null;
  lockVariant?: boolean;
  otherStores?: StoreStockAvailability[];
};

export function ProductPreviewDialog({
  product,
  open,
  onClose,
  onAddToCart,
  initialColor = null,
  initialSize = null,
  lockVariant = false,
  otherStores = [],
}: Props) {
  const handleOpenChange = (v: boolean) => {
    if (!v) onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="pos-preview-dialog"
        hideCloseButton
        accessibleTitle="Detail produk"
      >
        <ProductDetailContent
          product={product}
          onAddToCart={onAddToCart}
          onDismiss={onClose}
          initialColor={initialColor}
          initialSize={initialSize}
          lockVariant={lockVariant}
          otherStores={otherStores}
          layout="dialog"
        />
      </DialogContent>
    </Dialog>
  );
}
