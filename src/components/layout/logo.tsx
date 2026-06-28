import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      {/* The logo's wordmark is dark-gray-on-transparent, so it disappears
          against dark-mode backgrounds without an explicit light backing. */}
      <span className="flex shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-black/5">
        <Image src="/assets/logo.webp" alt="Penda Health" width={52} height={52} className="h-[52px] w-[52px] object-contain" />
      </span>
      <span className="text-base font-semibold text-penda-teal">Hiring</span>
    </div>
  );
}
