import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href?: string | null;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  stacked?: boolean;
};

const sizes = {
  sm: 44,
  md: 56,
  lg: 88,
};

export function BrandMark({ href = "/", subtitle, size = "md", stacked = false }: BrandMarkProps) {
  const px = sizes[size];
  const inner = (
    <>
      <span className={`brand-mark-frame brand-mark-frame-${size}`}>
        <Image
          src="/logo-smart-kids.jpg"
          alt="Smart Kids"
          width={px}
          height={px}
          priority={size !== "sm"}
        />
      </span>
      <span className={stacked ? "brand-mark-copy stacked" : "brand-mark-copy"}>
        <span className="brand-mark-smart">Smart Kids</span>
        {subtitle ? <span className="brand-mark-sub">{subtitle}</span> : <span className="brand-mark-kids">Education Care</span>}
      </span>
    </>
  );

  if (href === null) {
    return <span className="brand-mark">{inner}</span>;
  }

  return (
    <Link href={href} className="brand-mark">
      {inner}
    </Link>
  );
}
