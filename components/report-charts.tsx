"use client";
import { useEffect, useId, useState } from "react";
import {
  ChartNoAxesCombined,
  type LucideIcon,
  Library,
  Coins,
  Building2,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { money, statuses } from "@/lib/contracts";
import { Blank } from "./shared";
export default function Charts({ data }: { data: any }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimate(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return (
    <div className="chart-grid">
      <Chart
        title="Sales over time"
        description="Verified revenue, day by day"
        icon={Coins}
        rows={data.daily}
        value="sales"
        currency
        animate={animate}
      />
      <Chart
        title="Orders over time"
        description="Your daily order activity"
        icon={ShoppingBag}
        rows={data.daily}
        value="orders"
        animate={animate}
      />
      <Chart
        title="Best-selling books"
        description="The most ordered course materials"
        icon={Library}
        rows={data.best}
        bars
        animate={animate}
      />
      <Chart
        title="Revenue by category"
        description="Sales across your pricing categories"
        icon={ChartNoAxesCombined}
        rows={data.category}
        bars
        currency
        animate={animate}
      />
      <Chart
        title="Campus order distribution"
        description="Where your orders are coming from"
        icon={Building2}
        rows={data.campus}
        bars
        animate={animate}
      />
      <Chart
        title="Payment status"
        description="A closer look at payment reviews"
        icon={ShieldCheck}
        animate={animate}
        rows={data.payment.map((d: any) => ({
          ...d,
          label: statuses[d.label] || d.label,
        }))}
        bars
      />
    </div>
  );
}
function Chart({
  title,
  description,
  icon: Icon,
  animate,
  rows,
  value = "value",
  currency = false,
  bars = false,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  animate: boolean;
  rows: any[];
  value?: string;
  currency?: boolean;
  bars?: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");
  return (
    <section className="panel chart">
      <div className="chart-heading">
        <Icon aria-hidden="true" />
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {!rows.length ? (
        <Blank
          title="No activity in this period"
          description="This chart will fill as orders are submitted."
        />
      ) : (
        <>
          <div
            role="img"
            aria-label={`${title}: ${rows.map((r) => `${r.label} ${currency ? money(r[value]) : r[value]}`).join(", ")}`}
            style={{ height: 240, width: "100%" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {bars ? (
                <BarChart
                  data={rows}
                  margin={{ left: 0, right: 12, bottom: 10 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => (currency ? String(v / 100) : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      color: "var(--foreground)",
                    }}
                    formatter={(v: any) => (currency ? money(Number(v)) : v)}
                  />
                  <Bar
                    dataKey={value}
                    fill="var(--primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                    isAnimationActive={animate}
                    animationDuration={650}
                  />
                </BarChart>
              ) : (
                <AreaChart data={rows}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--primary)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--primary)"
                        stopOpacity={0.015}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => (currency ? String(v / 100) : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      color: "var(--foreground)",
                    }}
                    formatter={(v: any) => (currency ? money(Number(v)) : v)}
                  />
                  <Area
                    dataKey={value}
                    type="monotone"
                    stroke="var(--primary)"
                    fill={`url(#${gradientId})`}
                    strokeWidth={2.5}
                    dot={
                      rows.length === 1
                        ? { r: 4, fill: "var(--primary)" }
                        : false
                    }
                    activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                    isAnimationActive={animate}
                    animationDuration={650}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          <p className="small-text">
            {currency
              ? "Amounts in PKR. Verified sales exclude cancellations and refund requests."
              : "Based on orders in the selected period."}
          </p>
        </>
      )}
    </section>
  );
}
