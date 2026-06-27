import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image src="/assets/logo.webp" alt="Penda Health" width={40} height={40} className="h-10 w-10 object-contain" />
      <span className="text-sm font-semibold text-penda-teal">Hiring</span>
    </div>
  );
}
