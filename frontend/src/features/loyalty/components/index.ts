/**
 * Loyalty UI Components - Shared presentation components for loyalty programmes
 * 
 * These components are used by both customer and merchant features to ensure
 * consistent visualization of loyalty programme progress and types.
 */

export { StampProgress, type StampProgressProps } from './StampProgress';
export { PointsProgress, type PointsProgressProps } from './PointsProgress';
export { ProgramTypeLabel, getProgramTypeLabel, type ProgramTypeLabelProps, type TranslateFunction } from './ProgramTypeLabel';
export { StampSlots, MAX_STAMP_SLOTS, type StampSlotsProps } from './StampSlots';
export { RewardProgressBar, type RewardProgressBarProps } from './RewardProgressBar';
export { getRewardProgress, type RewardProgress } from './rewardProgress';
export { LoyaltyCardView, type LoyaltyCardViewProps } from './LoyaltyCardView';
