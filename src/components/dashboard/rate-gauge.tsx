"use client";

import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TRACK_COLOR = "#E5ECEB";
const SIZE = 140;

export function RateGauge({
  title,
  value,
  target,
  color = "#005B5E",
}: {
  title: string;
  value: number;
  target?: string;
  color?: string;
}) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const data = [{ value: clamped, fill: color }];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 pt-0">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <RadialBarChart
            width={SIZE}
            height={SIZE}
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="100%"
            barSize={14}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: TRACK_COLOR }} angleAxisId={0} />
          </RadialBarChart>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-semibold">{clamped.toFixed(1)}%</span>
          </div>
        </div>
        {target && <p className="text-xs text-muted-foreground">Target: {target}</p>}
      </CardContent>
    </Card>
  );
}
