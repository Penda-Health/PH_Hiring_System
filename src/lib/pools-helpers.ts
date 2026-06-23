import { Locum, Reliever } from "@/types";
import { RELIEVER_CADRES, RELIEVER_POOL_TARGET, coverageZones, getZoneBranches } from "@/lib/mock-data/clusters";

export type CadrePoolDepth = {
  cadre: string;
  count: number;
  target: number;
  met: boolean;
};

export function getCadrePoolDepth(relievers: Reliever[]): CadrePoolDepth[] {
  return RELIEVER_CADRES.map((cadre) => {
    const count = relievers.filter((r) => r.role === cadre && r.status === "Active").length;
    return { cadre, count, target: RELIEVER_POOL_TARGET, met: count >= RELIEVER_POOL_TARGET };
  });
}

export type ZoneCoverage = {
  zone: string;
  relievers: Reliever[];
  locums: Locum[];
  covered: boolean;
};

export function getZoneCoverage(relievers: Reliever[], locums: Locum[]): ZoneCoverage[] {
  return coverageZones.map((zone) => {
    const zoneBranches = getZoneBranches(zone);
    // Relievers are assigned to specific branches; cluster coverage is derived from those.
    // Locums are assigned directly at the cluster/standalone-branch level.
    const zoneRelievers = relievers.filter(
      (r) => r.status === "Active" && r.branchesCovered.some((b) => zoneBranches.includes(b))
    );
    const zoneLocums = locums.filter((l) => l.branchesCovered.includes(zone));
    return { zone, relievers: zoneRelievers, locums: zoneLocums, covered: zoneRelievers.length + zoneLocums.length > 0 };
  });
}

export function getCoverageRate(relievers: Reliever[], locums: Locum[]): number {
  const zones = getZoneCoverage(relievers, locums);
  if (zones.length === 0) return 0;
  return (zones.filter((z) => z.covered).length / zones.length) * 100;
}

