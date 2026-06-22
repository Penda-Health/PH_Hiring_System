export interface BranchCluster {
  id: string;
  name: string;
  branches: string[];
}

// The IPS reliever/locum coverage network — clinic-level branches grouped into
// geographic clusters they can be deployed across, distinct from the formal
// Branch register used for roles/work trials.
export const branchClusters: BranchCluster[] = [
  { id: "cluster-eastleigh", name: "Eastleigh", branches: ["Umoja 1", "Umoja 2", "Pipeline", "Tassia", "Embakasi"] },
  { id: "cluster-waiyaki-way", name: "Waiyaki Way", branches: ["Kangemi", "Kawangware", "Kimathi"] },
  { id: "cluster-utawala", name: "Utawala", branches: ["Shooters", "Benedicata", "Kariobangi South"] },
  {
    id: "cluster-thika-road",
    name: "Thika Road",
    branches: ["Kahawa West", "Zimmerman", "Githurai 45", "Sunton", "Luckysummer"],
  },
];

export const standaloneBranches: string[] = ["Langata", "Kitengela"];

export const coverageZones: string[] = [
  ...branchClusters.map((c) => c.name),
  ...standaloneBranches,
];

// Individual clinic branches a reliever can be assigned to directly.
export const allBranches: string[] = [
  ...branchClusters.flatMap((c) => c.branches),
  ...standaloneBranches,
];

export function getZoneBranches(zone: string): string[] {
  const cluster = branchClusters.find((c) => c.name === zone);
  return cluster ? cluster.branches : [zone];
}

export const RELIEVER_CADRES = [
  "Clinical Coordinator",
  "Clinical Officer",
  "Pharm Tech",
  "Lab Technician",
  "Nurse",
  "Sonographer",
];

export const RELIEVER_POOL_TARGET = 3;
