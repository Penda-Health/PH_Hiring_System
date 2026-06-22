import { Branch } from "@/types";

export function branchName(branchId: string | undefined, branches: Branch[]): string {
  if (!branchId) return "—";
  return branches.find((b) => b.id === branchId)?.name ?? "—";
}

let nextReqNumber = 6;

export function generateReqId(): string {
  const id = `REQ-${String(nextReqNumber).padStart(3, "0")}`;
  nextReqNumber += 1;
  return id;
}
