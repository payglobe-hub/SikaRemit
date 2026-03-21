import api from './api';
import { ENDPOINTS } from '../constants/api';

export interface ReferralCode {
  id: string;
  code: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  usage_count: number;
  max_uses?: number;
}

export interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_earnings: number;
  available_balance: number;
  referral_code?: string;
}

export interface ReferralReward {
  id: string;
  type: 'cash' | 'points' | 'discount';
  amount: number;
  currency?: string;
  description: string;
  claimed_at?: string;
  expires_at?: string;
}

export interface ReferralHistory {
  id: string;
  referred_user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  status: 'pending' | 'completed' | 'expired';
  reward_earned: number;
  reward_type: string;
  created_at: string;
  completed_at?: string;
}

export const referralService = {
  /**
   * Generate a new referral code for the user
   */
  generateReferralCode: async (): Promise<ReferralCode> => {
    const response = await api.post(ENDPOINTS.REFERRAL?.GENERATE || '/referrals/generate/');
    return response.data;
  },

  /**
   * Get user's referral statistics
   */
  getReferralStats: async (): Promise<ReferralStats> => {
    const response = await api.get(ENDPOINTS.REFERRAL?.STATS || '/referrals/stats/');
    return response.data;
  },

  /**
   * Get user's referral history
   */
  getReferralHistory: async (page = 1, limit = 20): Promise<{
    results: ReferralHistory[];
    count: number;
    next?: string;
    previous?: string;
  }> => {
    const response = await api.get(ENDPOINTS.REFERRAL?.HISTORY || '/referrals/history/', {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * Get user's referral rewards
   */
  getReferralRewards: async (): Promise<ReferralReward[]> => {
    const response = await api.get(ENDPOINTS.REFERRAL?.REWARDS || '/referrals/rewards/');
    return response.data;
  },

  /**
   * Claim a referral reward
   */
  claimReward: async (rewardId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(
      (ENDPOINTS.REFERRAL?.CLAIM_REWARD || '/referrals/rewards/{id}/claim/').replace('{id}', rewardId)
    );
    return response.data;
  },

  /**
   * Apply referral code during registration
   */
  applyReferralCode: async (code: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(ENDPOINTS.REFERRAL?.APPLY || '/referrals/apply/', {
      referral_code: code
    });
    return response.data;
  },

  /**
   * Share referral link/code
   */
  shareReferralLink: (code: string): string => {
    const baseUrl = 'https://sikaremit.com';
    return `${baseUrl}/register?ref=${code}`;
  },

  /**
   * Validate referral code
   */
  validateReferralCode: async (code: string): Promise<{ valid: boolean; message?: string }> => {
    try {
      const response = await api.post(ENDPOINTS.REFERRAL?.VALIDATE || '/referrals/validate/', {
        code
      });
      return response.data;
    } catch (error: any) {
      return {
        valid: false,
        message: error.response?.data?.message || 'Invalid referral code'
      };
    }
  },

  /**
   * Get referral leaderboard (top referrers)
   */
  getReferralLeaderboard: async (limit = 10): Promise<Array<{
    user: {
      id: string;
      first_name: string;
      last_name: string;
    };
    referral_count: number;
    total_earnings: number;
  }>> => {
    const response = await api.get(ENDPOINTS.REFERRAL?.LEADERBOARD || '/referrals/leaderboard/', {
      params: { limit }
    });
    return response.data;
  }
};

export default referralService;
