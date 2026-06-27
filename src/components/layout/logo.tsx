import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image src="/assets/logo.webp" alt="Penda Health" width={28} height={28} className="h-7 w-7 object-contain" />
      <span className="text-sm font-semibold text-penda-teal">Hiring</span>
    </div>
  );
}
