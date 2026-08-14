// src/components/admin/overview-client.tsx
'use client';

import { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useGetOverviewQuery } from '@/redux/overview-api';
import { extractApiError } from '@/lib/extract-api-error';
import { ErrorState } from '@/components/ui/error-state';
import { OverviewSkeleton } from '@/components/admin/skeletons';
import { StatusBadge } from '@/components/ui/status-badge';
import { LabeledSelect } from '@/components/forms/labeled-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatMoney, formatMoneyCompact } from '@/lib/format-money';
import { formatDate } from '@/lib/format-date';
import {
  BookingSourcesChart,
  BookingStatusChart,
  RevenueTrendChart,
} from '@/components/admin/overview-charts';
import type { StatusTone } from '@/lib/status-colors';
import type {
  DashboardPreset,
  ITrendData,
} from '@/types/overview.types';

const PRESET_OPTIONS: { value: DashboardPreset; label: string }[] = [
  { value: 'TODAY', label: 'Today' },
  { value: 'THIS_WEEK', label: 'This week' },
  { value: 'THIS_MONTH', label: 'This month' },
  { value: 'LAST_MONTH', label: 'Last month' },
  { value: 'LAST_90_DAYS', label: 'Last 90 days' },
  { value: 'THIS_YEAR', label: 'This year' },
  { value: 'CUSTOM', label: 'Custom range' },
];

const BOOKING_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CHECKED_IN: 'info',
  CHECKED_OUT: 'neutral',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  EXPIRED: 'neutral',
};

function Trend({ trend }: { trend: ITrendData }) {
  if (trend.direction === 'neutral') return null;
  const up = trend.direction === 'upward';
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        up ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
      }`}
    >
      {up ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}
      {trend.percentage}%
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: ITrendData;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p
          className="min-w-0 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]"
          title={value}
        >
          {value}
        </p>
        {trend && <Trend trend={trend} />}
      </div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/**
 * The rich admin dashboard (dms-style): range picker + trend cards, today's
 * operations, needs-attention, breakdowns and activity lists.
 */
export function OverviewClient() {
  const [preset, setPreset] = useState<DashboardPreset>('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  // The QUERIED range; Custom only lands here on Apply, so half-typed
  // dates never fire requests.
  const [applied, setApplied] = useState<{
    preset: DashboardPreset;
    from?: string;
    to?: string;
  }>({ preset: 'THIS_MONTH' });

  const { data, isLoading, isError, error, refetch } =
    useGetOverviewQuery(applied);

  const handlePresetChange = (value: DashboardPreset) => {
    setPreset(value);
    if (value !== 'CUSTOM') setApplied({ preset: value });
  };

  const customValid = Boolean(
    customFrom && customTo && customTo >= customFrom,
  );
  const applyCustom = () => {
    if (!customValid) return;
    setApplied({ preset: 'CUSTOM', from: customFrom, to: customTo });
  };

  if (isLoading) return <OverviewSkeleton />;

  if (isError || !data) {
    return (
      <ErrorState
        title="Couldn't load the dashboard"
        description={extractApiError(error).message}
        onRetry={refetch}
      />
    );
  }

  const stats = data.data;
  const attention = stats.needsAttention;
  const attentionItems = [
    { label: 'Reviews awaiting moderation', value: attention.pendingReviews },
    { label: 'Unpaid holds in progress', value: attention.pendingHolds },
    { label: 'Arrivals due (not checked in)', value: attention.arrivalsDue },
    { label: 'Stale Airbnb calendars', value: attention.staleCalendars },
    { label: 'Failed payments (7 days)', value: attention.failedPayments7d },
    { label: 'Refunds needing retry', value: attention.failedRefunds },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Range picker: presets, or a custom from/to (the dms filter). */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-[220px] min-[480px]:w-[180px]">
          <LabeledSelect
            label="Period"
            options={PRESET_OPTIONS}
            value={preset}
            onValueChange={(value) =>
              handlePresetChange(value as DashboardPreset)
            }
          />
        </div>
        {preset === 'CUSTOM' && (
          <>
            <div className="space-y-1.5">
              <label
                htmlFor="overview-from"
                className="block text-sm font-medium text-muted-foreground"
              >
                From
              </label>
              <Input
                id="overview-from"
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="overview-to"
                className="block text-sm font-medium text-muted-foreground"
              >
                To
              </label>
              <Input
                id="overview-to"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={applyCustom} disabled={!customValid}>
              Apply
            </Button>
          </>
        )}
      </div>

      {/* Headline cards (trend vs the previous period) */}
      <div className="grid gap-3 min-[360px]:grid-cols-2 @3xl/main:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatMoneyCompact(stats.revenue.total)}
          sub={`${stats.revenue.count} confirmed · avg ${formatMoneyCompact(stats.revenue.average)}`}
          trend={stats.revenue.trend}
        />
        <StatCard
          label="Bookings"
          value={String(stats.bookings.count)}
          sub="created in period"
          trend={stats.bookings.trend}
        />
        <StatCard
          label="Occupancy"
          value={`${stats.occupancy.rate}%`}
          sub={`${stats.occupancy.occupiedNights}/${stats.occupancy.availableNights} unit-nights`}
        />
        <StatCard
          label="Refunds"
          value={formatMoneyCompact(stats.refunds.total)}
          sub={`${stats.refunds.count} refund(s)`}
        />
      </div>

      {/* Today's operations */}
      <div className="grid gap-3 min-[360px]:grid-cols-2 @3xl/main:grid-cols-4">
        <StatCard label="Arrivals today" value={String(stats.today.arrivals)} />
        <StatCard
          label="Departures today"
          value={String(stats.today.departures)}
        />
        <StatCard label="In house" value={String(stats.today.inHouse)} />
        <StatCard
          label="Pending holds"
          value={String(stats.today.pendingHolds)}
        />
      </div>

      <div className="grid gap-3 @3xl/main:grid-cols-2">
        {/* Needs attention */}
        <SectionCard title="Needs attention">
          {attentionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All clear - nothing needs attention right now.
            </p>
          ) : (
            <ul className="space-y-2">
              {attentionItems.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="flex-none font-semibold">{item.value}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Top room types */}
        <SectionCard title="Top rooms (period)">
          {stats.topRoomTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No confirmed bookings in this period yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.topRoomTypes.map((roomType) => (
                <li
                  key={roomType.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate" title={roomType.name}>
                    {roomType.name}
                  </span>
                  <span
                    className="flex-none font-semibold"
                    title={formatMoney(roomType.revenue)}
                  >
                    {formatMoneyCompact(roomType.revenue)}
                    <span className="ml-1 font-normal text-muted-foreground">
                      · {roomType.bookings}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-3 @3xl/main:grid-cols-2">
        {/* Upcoming arrivals */}
        <SectionCard title="Upcoming arrivals (7 days)">
          {stats.upcomingArrivals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No arrivals in the next 7 days.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.upcomingArrivals.map((arrival) => (
                <li key={arrival.id} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {arrival.guestName}
                    </p>
                    <span className="flex-none text-xs text-muted-foreground">
                      {formatDate(arrival.checkIn)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {arrival.roomType.name}
                    {arrival.room ? ` · ${arrival.room.name}` : ''} ·{' '}
                    {arrival.nights} night(s) · {arrival.code}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Recent bookings */}
        <SectionCard title="Recent bookings">
          {stats.recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentBookings.map((booking) => (
                <li key={booking.id} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {booking.guestName}
                    </p>
                    <span
                      className="flex-none text-sm font-semibold"
                      title={formatMoney(booking.totalAmount, booking.currency)}
                    >
                      {formatMoneyCompact(booking.totalAmount, booking.currency)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-muted-foreground">
                      {booking.roomType.name} · {formatDate(booking.checkIn)} ·{' '}
                      {booking.code}
                    </p>
                    <StatusBadge
                      tone={BOOKING_STATUS_TONE[booking.status] ?? 'neutral'}
                      className="px-1.5 py-px text-[10px]"
                    >
                      {booking.status.replace('_', ' ')}
                    </StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Charts: the 12-month trend, then the period breakdowns. */}
      <SectionCard title="Revenue & bookings (12 months)">
        <RevenueTrendChart data={stats.revenueByMonth} />
      </SectionCard>

      <div className="grid gap-3 @3xl/main:grid-cols-2">
        <SectionCard title="Bookings by status (period)">
          <BookingStatusChart byStatus={stats.bookingsByStatus} />
        </SectionCard>
        <SectionCard title="Booking sources (period)">
          <BookingSourcesChart sources={stats.sources} />
        </SectionCard>
      </div>
    </div>
  );
}
