import type { MembershipReward } from '../api/customerApi';

export interface RewardProgress {
  /** True when at least one reward of this currency costs no more than the balance. */
  available: boolean;
  /** Cheapest reward whose cost is above the balance, or null. */
  next: MembershipReward | null;
  hasRewards: boolean;
}

/** Progress for one currency: the target is the cheapest reward not yet affordable. */
export function getRewardProgress(
  rewards: readonly MembershipReward[],
  activityType: 'stamps' | 'points',
  balance: number,
): RewardProgress {
  const ofType = rewards.filter((reward) => reward.activityType === activityType);
  let next: MembershipReward | null = null;
  for (const reward of ofType) {
    if (reward.cost > balance && (!next || reward.cost < next.cost)) next = reward;
  }
  return {
    available: ofType.some((reward) => reward.cost <= balance),
    next,
    hasRewards: ofType.length > 0,
  };
}
