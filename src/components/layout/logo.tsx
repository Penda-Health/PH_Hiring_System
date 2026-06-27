import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image src="/assets/logo.webp" alt="Penda Health" width={56} height={56} className="h-14 w-14 object-contain shrink-0" />
      <span className="text-base font-semibold text-penda-teal">Hiring</span>
    </div>
  );
}
