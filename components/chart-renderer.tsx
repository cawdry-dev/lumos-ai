"use client";

import { useTheme } from "next-themes";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** JSON schema for chart artifact content */
export type ChartSpec = {
  type: "bar" | "line" | "pie" | "area" | "scatter";
  data: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
};

const COLOURS = [
  "hsl(221 83% 53%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(280 67% 55%)",
  "hsl(199 89% 48%)",
  "hsl(330 81% 60%)",
  "hsl(160 84% 39%)",
];

export function ChartRenderer({ content }: { content: string }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  let spec: ChartSpec;
  try {
    spec = JSON.parse(content) as ChartSpec;
  } catch {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
        Invalid chart data
      </div>
    );
  }

  if (!spec.data || spec.data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
        No data to display
      </div>
    );
  }

  const axisColour = isDark ? "hsl(240 5% 64.9%)" : "hsl(240 3.8% 46.1%)";
  const gridColour = isDark ? "hsl(240 3.7% 20%)" : "hsl(240 5.9% 90%)";
  const keys = spec.yKeys ?? (spec.yKey ? [spec.yKey] : []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
      {spec.title && (
        <h3 className="text-lg font-semibold text-foreground">{spec.title}</h3>
      )}
      <ResponsiveContainer width="100%" height={400}>
        {renderChart(spec, keys, axisColour, gridColour, isDark)}
      </ResponsiveContainer>
    </div>
  );
}

function renderChart(
  spec: ChartSpec,
  keys: string[],
  axisColour: string,
  gridColour: string,
  isDark: boolean,
) {
  const commonAxisProps = {
    stroke: axisColour,
    tick: { fill: axisColour, fontSize: 12 },
  };

  switch (spec.type) {
    case "bar":
      return (
        <BarChart data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColour} />
          <XAxis dataKey={spec.xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={tooltipStyle(isDark)} />
          <Legend />
          {keys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLOURS[i % COLOURS.length]} />
          ))}
        </BarChart>
      );

    case "line":
      return (
        <LineChart data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColour} />
          <XAxis dataKey={spec.xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={tooltipStyle(isDark)} />
          <Legend />
          {keys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLOURS[i % COLOURS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      );

    case "area":
      return (
        <AreaChart data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColour} />
          <XAxis dataKey={spec.xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={tooltipStyle(isDark)} />
          <Legend />
          {keys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLOURS[i % COLOURS.length]}
              fill={COLOURS[i % COLOURS.length]}
              fillOpacity={0.3}
            />
          ))}
        </AreaChart>
      );

    case "scatter":
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColour} />
          <XAxis dataKey={spec.xKey} name={spec.xLabel ?? spec.xKey} {...commonAxisProps} />
          <YAxis dataKey={keys[0]} name={spec.yLabel ?? keys[0]} {...commonAxisProps} />
          <Tooltip contentStyle={tooltipStyle(isDark)} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={spec.data} fill={COLOURS[0]} />
        </ScatterChart>
      );

    case "pie":
      return (
        <PieChart>
          <Tooltip contentStyle={tooltipStyle(isDark)} />
          <Legend />
          <Pie
            data={spec.data}
            dataKey={keys[0] ?? "value"}
            nameKey={spec.xKey ?? "name"}
            cx="50%"
            cy="50%"
            outerRadius={140}
            label
          >
            {spec.data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLOURS[i % COLOURS.length]} />
            ))}
          </Pie>
        </PieChart>
      );

    default:
      return (
        <BarChart data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColour} />
          <XAxis dataKey={spec.xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={tooltipStyle(isDark)} />
          {keys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLOURS[i % COLOURS.length]} />
          ))}
        </BarChart>
      );
  }
}

function tooltipStyle(isDark: boolean): React.CSSProperties {
  return {
    backgroundColor: isDark ? "hsl(240 10% 10%)" : "hsl(0 0% 100%)",
    border: `1px solid ${isDark ? "hsl(240 3.7% 25%)" : "hsl(240 5.9% 85%)"}`,
    borderRadius: "6px",
    color: isDark ? "hsl(0 0% 95%)" : "hsl(240 10% 3.9%)",
  };
}

