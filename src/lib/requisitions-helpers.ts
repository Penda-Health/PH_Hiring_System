import { Branch } from "@/types";

export function branchName(branchId: string | undefined, branches: Branch[]): string {
  if (!branchId) return "—";
  return branches.find((b) => b.id === branchId)?.name ?? "—";
}

