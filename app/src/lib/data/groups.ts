// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED: This file has been renamed to events.ts as part of the
// Group → Event concept rename. Re-exporting everything for backwards compat.
// ─────────────────────────────────────────────────────────────────────────────
export {
  getMyEvents  as getMyGroups,
  getEvent     as getGroup,
  getMyEvents,
  getEvent,
} from '@/lib/data/events'
