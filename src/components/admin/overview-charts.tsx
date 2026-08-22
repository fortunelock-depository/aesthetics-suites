// src/components/admin/overview-charts.tsx
//
// The dashboard's charts (recharts): the 12-month revenue + bookings
// trend, the period's booking-status breakdown, and where bookings come
// from. Deliberately just these three - enough to read how
// the hotel is running, nothing decorative.
'use client';

import * as React from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, formatMoneyCompact } from '@/lib/format-money';
import {
  BOOKING_STATUS_LABEL,
  type BookingStatusValue,
} from '@/types/booking.types';

// Chart colors resolve through the theme's --chart-* tokens (SVG fills
// follow CSS variables fine - grid/tick already did), so the palette has
// ONE definition in globals.css and adapts with the theme. Statuses map
// onto the token roles; the two alarm colors (cancelled/no-show) come
// from the destructive scale for consistent semantics.
const COLORS = {
  revenue: 'var(--chart-2)', // clay
  bookings: 'var(--chart-3)', // deep eucalyptus
  grid: 'var(--border)',
  tick: 'var(--muted-foreground)',
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'var(--chart-3)',
  CHECKED_IN: 'var(--chart-2)',
  CHECKED_OUT: 'var(--chart-1)',
  PENDING: 'var(--chart-4)',
  CANCELLED: 'var(--destructive)',
  NO_SHOW: 'var(--chart-5)',
  EXPIRED: 'var(--muted-foreground)',
};

/** "2026-08" -> "Aug" (Jan gets the year for orientation). */
function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  if (!year || !m || m < 1 || m > 12) return month;
  const label = new Date(Date.UTC(year, m - 1, 1)).toLocaleString('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  });
  return m === 1 ? `${label} ${String(year).slice(2)}` : label;
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 0,
  fontSize: 12,
  color: 'var(--foreground)',
};

/** Monthly revenue bars with the bookings-count line over them. */
export function RevenueTrendChart({
  data,
}: {
  data: { month: string; revenue: number; bookings: number }[];
}) {
  const rows = (Array.isArray(data) ? data : []).map((row) => ({
    ...row,
    label: monthLabel(row.month),
  }));

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Revenue appears here once the first bookings are confirmed.
      </p>
    );
  }

  // The chart itself is pointer-only (recharts puts every figure behind a
  // hover tooltip), so the same numbers are carried by a summarising label
  // and a hidden table - the pattern the other charts here follow.
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalBookings = rows.reduce((sum, row) => sum + row.bookings, 0);
  const peak = rows.reduce((best, row) =>
    row.revenue > best.revenue ? row : best,
  );
  const summary =
    `Bar and line chart of revenue and bookings by month, ` +
    `${rows[0].label} to ${rows[rows.length - 1].label}. ` +
    `${formatMoney(totalRevenue)} in total across ` +
    `${totalBookings.toLocaleString()} bookings, highest in ${peak.label} at ` +
    `${formatMoney(peak.revenue)}. Every month's figures follow in a table.`;

  return (
    // 12 months can't squeeze into a fold's ~250px of card - the chart
    // keeps a readable minimum and scrolls INSIDE this container, so the
    // page itself never grows sideways.
    <div className="w-full overflow-x-auto overflow-y-hidden">
      <div className="h-72 min-w-[420px]" role="img" aria-label={summary}>
        <div className="h-full w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={rows}
              margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
            >
              <CartesianGrid
                stroke={COLORS.grid}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: COLORS.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: COLORS.grid }}
              />
              <YAxis
                yAxisId="revenue"
                tick={{ fill: COLORS.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value: number) => formatMoneyCompact(value)}
              />
              <YAxis
                yAxisId="bookings"
                orientation="right"
                allowDecimals={false}
                tick={{ fill: COLORS.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                formatter={(value, name) =>
                  name === 'Revenue'
                    ? [formatMoney(Number(value)), 'Revenue']
                    : [String(value), 'Bookings']
                }
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                name="Revenue"
                fill={COLORS.revenue}
                maxBarSize={28}
              />
              <Line
                yAxisId="bookings"
                dataKey="bookings"
                name="Bookings"
                stroke={COLORS.bookings}
                strokeWidth={2}
                dot={{ r: 2.5, fill: COLORS.bookings }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <table className="sr-only">
        <caption>Revenue and bookings by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Revenue</th>
            <th scope="col">Bookings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{row.label}</th>
              <td>{formatMoney(row.revenue)}</td>
              <td>{row.bookings.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        aria-hidden="true"
        className="mt-2 flex min-w-[420px] items-center justify-center gap-4 text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5"
            style={{ backgroundColor: COLORS.revenue }}
          />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4"
            style={{ backgroundColor: COLORS.bookings }}
          />
          Bookings
        </span>
      </p>
    </div>
  );
}

/** Donut of the period's bookings by status, with a readable legend. */
export function BookingStatusChart({
  byStatus,
}: {
  byStatus: Record<string, number>;
}) {
  const slices = Object.entries(byStatus ?? {})
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      label:
        BOOKING_STATUS_LABEL[status as BookingStatusValue] ?? status,
      count,
      color: STATUS_COLORS[status] ?? 'var(--muted-foreground)',
    }));
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No bookings in this period yet.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 min-[480px]:flex-row">
      <div className="relative h-44 w-44 max-w-full flex-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.status} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <span>
            <span className="block font-heading text-2xl font-semibold text-foreground">
              {total.toLocaleString()}
            </span>
            <span className="block text-xs text-muted-foreground">
              bookings
            </span>
          </span>
        </span>
      </div>
      <ul className="w-full min-w-0 space-y-1.5">
        {slices.map((slice) => (
          <li
            key={slice.status}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className="h-2.5 w-2.5 flex-none"
              style={{ backgroundColor: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {slice.label}
            </span>
            <span className="flex-none font-medium text-foreground">
              {slice.count.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Website vs walk-in split as one readable stacked bar. */
export function BookingSourcesChart({
  sources,
}: {
  sources: { website: number; manual: number };
}) {
  const website = sources?.website ?? 0;
  const manual = sources?.manual ?? 0;
  const total = website + manual;

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No bookings in this period yet.
      </p>
    );
  }

  const websiteShare = Math.round((website / total) * 100);
  const rows = [
    {
      label: 'Website',
      count: website,
      share: websiteShare,
      color: COLORS.revenue,
    },
    {
      label: 'Walk-in / phone',
      count: manual,
      share: 100 - websiteShare,
      color: COLORS.bookings,
    },
  ];

  return (
    <div className="space-y-4">
      <div
        className="flex h-3 w-full overflow-hidden bg-muted"
        role="img"
        aria-label={`Website ${websiteShare}%, walk-in ${100 - websiteShare}%`}
      >
        {rows.map(
          (row) =>
            row.count > 0 && (
              <span
                key={row.label}
                style={{
                  width: `${row.share}%`,
                  backgroundColor: row.color,
                }}
              />
            ),
        )}
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 flex-none"
              style={{ backgroundColor: row.color }}
            />
            <span className="min-w-0 flex-1 text-muted-foreground">
              {row.label}
            </span>
            <span className="flex-none font-medium text-foreground">
              {row.count.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({row.share}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
