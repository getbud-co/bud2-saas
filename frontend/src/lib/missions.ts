/**
 * Barrel file — re-exports all missions utilities and mock data.
 * Utility functions: missions-utils.ts
 * Seed/mock data:    missions-mock.ts
 */

export {
  numVal,
  getGoalTypeIcon,
  getGoalLabel,
  getKRStatusLabel,
  getKRStatusBadge,
  formatPeriodRange,
  getOwnerName,
  getOwnerInitials,
  getIndicatorIcon,
  formatCheckinDate,
} from "./missions-utils";

export { MOCK_MISSIONS, MOCK_CHECKIN_HISTORY } from "./missions-mock";
