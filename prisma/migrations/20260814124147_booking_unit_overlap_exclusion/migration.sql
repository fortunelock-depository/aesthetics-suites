-- DB backstop against double-seating a unit: no two blocking bookings
-- (PENDING / CONFIRMED / CHECKED_IN) may occupy the same room for
-- overlapping [checkIn, checkOut) ranges. The application's primary gate
-- is the per-room-type advisory lock + availability re-check inside the
-- booking transaction (booking-service.ts); this constraint catches
-- anything that slips past it.
--
-- Deliberate limitation: an exclusion constraint cannot reference now(),
-- so a PENDING booking whose hold has lapsed still blocks at the DB layer
-- until it is swept to EXPIRED. The booking transaction sweeps the room
-- type's lapsed holds inline before inserting, which keeps the constraint
-- aligned with what the availability query reports.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_unit_overlap"
  EXCLUDE USING gist (
    "roomId" WITH =,
    daterange("checkIn"::date, "checkOut"::date, '[)') WITH &&
  )
  WHERE ("roomId" IS NOT NULL AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN'));
