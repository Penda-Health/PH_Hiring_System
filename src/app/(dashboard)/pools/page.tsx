"use client";

import * as React from "react";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelieverCard } from "@/components/pools/reliever-card";
import { RelieverListItem } from "@/components/pools/reliever-list-item";
import { LocumCard } from "@/components/pools/locum-card";
import { LocumListItem } from "@/components/pools/locum-list-item";
import { BranchFilter } from "@/components/pools/branch-filter";
import { CadrePoolDepth } from "@/components/pools/cadre-pool-depth";
import { ClusterCoverage } from "@/components/pools/cluster-coverage";
import { NewRelieverDialog } from "@/components/pools/new-reliever-dialog";
import { NewLocumDialog } from "@/components/pools/new-locum-dialog";
import { ViewMode, ViewToggle } from "@/components/ui/view-toggle";

export default function PoolsPage() {
  const { branches, relievers, createReliever, locums, createLocum, canEdit, extendedLoading } = useRecruitmentData();
  const [branchFilter, setBranchFilter] = React.useState("All");
  const [view, setView] = React.useState<ViewMode>("cards");

  const branchNames = React.useMemo(
    () => branches.filter((b) => b.active).map((b) => b.name).sort(),
    [branches]
  );
  const filteredRelievers = relievers.filter(
    (r) => branchFilter === "All" || r.branchesCovered.includes(branchFilter)
  );
  const filteredLocums = locums.filter(
    (l) => branchFilter === "All" || l.branchesCovered.includes(branchFilter)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Relievers & Locum Pools</h1>
        {extendedLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CadrePoolDepth relievers={relievers} />
        <ClusterCoverage relievers={relievers} locums={locums} />
      </div>

      <Tabs defaultValue="relievers">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="relievers">Relievers ({filteredRelievers.length})</TabsTrigger>
            <TabsTrigger value="locums">Locums ({filteredLocums.length})</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <BranchFilter branches={branchNames} value={branchFilter} onChange={setBranchFilter} />
            <ViewToggle view={view} onChange={setView} />
            {canEdit && <NewRelieverDialog onCreate={createReliever} />}
            {canEdit && <NewLocumDialog branches={branches} onCreate={createLocum} />}
          </div>
        </div>

        <TabsContent value="relievers">
          {view === "list" ? (
            <div className="space-y-2">
              {filteredRelievers.map((reliever) => (
                <RelieverListItem key={reliever.id} reliever={reliever} />
              ))}
              {filteredRelievers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {extendedLoading ? "Loading relievers…" : "No relievers cover this zone"}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRelievers.map((reliever) => (
                <RelieverCard key={reliever.id} reliever={reliever} />
              ))}
              {filteredRelievers.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                  {extendedLoading ? "Loading relievers…" : "No relievers cover this zone"}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="locums">
          {view === "list" ? (
            <div className="space-y-2">
              {filteredLocums.map((locum) => (
                <LocumListItem key={locum.id} locum={locum} />
              ))}
              {filteredLocums.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {extendedLoading ? "Loading locums…" : "No locums cover this zone"}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocums.map((locum) => (
                <LocumCard key={locum.id} locum={locum} />
              ))}
              {filteredLocums.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                  {extendedLoading ? "Loading locums…" : "No locums cover this zone"}
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
