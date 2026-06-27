import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="light min-h-screen flex items-start sm:items-center justify-center bg-gradient-to-br from-penda-bg via-[#EAFBF6] to-[#DCF3EC] py-10 px-4">
      <Card className="w-full max-w-xl shadow-lg border-penda-teal-light/40">
        <CardHeader>
          <Image
            src="/assets/logo.webp"
            alt="Penda Health"
            width={180}
            height={72}
            className="h-[72px] w-auto self-center shrink-0 mb-1"
            priority
          />
          <CardTitle className="text-2xl text-foreground">{title}</CardTitle>
          {subtitle && <CardDescription className="text-muted-foreground">{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

export function FormMessage({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 text-sm text-foreground/90">{children}</div>;
}
