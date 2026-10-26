import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { getCachedProductImage } from "../../lib/product-image-cache";

type ProductImageProps = {
  src?: string;
  alt: string;
  category: string;
  eager?: boolean;
};

export function ProductImage({
  src = "",
  alt,
  category,
  eager = false,
}: ProductImageProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [resolvedSrc, setResolvedSrc] = useState("");
  const [failed, setFailed] = useState(!src.trim());

  useEffect(() => {
    setShouldLoad(eager);
    setResolvedSrc("");
    setFailed(!src.trim());
  }, [src, eager]);

  useEffect(() => {
    if (eager || shouldLoad || failed) return;
    const element = rootRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [eager, failed, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || failed || !src.trim()) return;
    let active = true;
    // Tampilkan URL dulu; cache jalan di background
    setResolvedSrc(src.trim());
    getCachedProductImage(src).then((value) => {
      if (active && value) setResolvedSrc(value);
    });
    return () => {
      active = false;
    };
  }, [failed, shouldLoad, src]);

  const showPlaceholder = failed || !resolvedSrc;
  const isLoading = !!src.trim() && !failed && !resolvedSrc;

  return (
    <span ref={rootRef} className="pos-product-image">
      {!showPlaceholder && (
        <img
          src={resolvedSrc}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {showPlaceholder && (
        <span
          className={`pos-product-image__placeholder${isLoading ? " is-loading" : ""}`}
          aria-label={isLoading ? `Memuat gambar ${category}` : `Gambar ${category} tidak tersedia`}
        >
          <ImageOff aria-hidden="true" />
          <strong>{category || "Produk"}</strong>
          <small>{isLoading ? "Memuat gambar..." : "Gambar tidak tersedia"}</small>
        </span>
      )}
    </span>
  );
}
