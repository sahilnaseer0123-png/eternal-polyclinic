import { clinic } from "@/data/clinic";

/**
 * The clinic's reception photo. A plain <img> (the site is a static export, so next/image can't resize):
 * two prepared sizes in public/photos/, width/height set so the page never jumps while it loads.
 */
export function ReceptionPhoto({
  className = "",
  sizes = "(min-width: 1024px) 600px, 100vw",
  eager = false,
}: {
  className?: string;
  sizes?: string;
  /** true where the photo is on screen as the page opens (Visit us), so lazy loading doesn't hold it back. */
  eager?: boolean;
}) {
  const p = clinic.receptionPhoto;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${p.src}-1200.webp`}
      srcSet={`${p.src}-640.webp 640w, ${p.src}-1200.webp 1200w`}
      sizes={sizes}
      alt={p.alt}
      width={p.width}
      height={p.height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      className={`block h-auto w-full object-cover ${className}`}
    />
  );
}
