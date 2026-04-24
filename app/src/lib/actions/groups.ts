'use server'
// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED: This file has been renamed to events.ts as part of the
// Group → Event concept rename. Re-exporting everything for backwards compat.
// ─────────────────────────────────────────────────────────────────────────────
export {
  createEvent as createGroup,
  joinEvent   as joinGroup,
  leaveEvent  as leaveGroup,
  updateEvent as updateGroup,
  createEvent,
  joinEvent,
  leaveEvent,
  updateEvent,
} from '@/lib/actions/events'
