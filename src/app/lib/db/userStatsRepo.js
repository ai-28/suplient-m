import { sql } from './postgresql';

export const userStatsRepo = {
    // Get user stats with caching
    async getUserStats(userId) {
        try {
            const result = await sql`
                SELECT 
                    daily_streak,
                    total_points,
                    last_checkin_date,
                    updated_at
                FROM user_stats 
                WHERE user_id = ${userId}
            `;

            return result[0] || {
                daily_streak: 0,
                total_points: 0,
                last_checkin_date: null,
                updated_at: null
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    },

    // Update user stats incrementally
    async updateUserStats(userId, updates) {
        try {
            // Ensure we have valid values
            const validUpdates = {
                // Use null for unspecified so we don't overwrite existing values
                daily_streak: updates.daily_streak ?? null,
                total_points: updates.total_points ?? null,
                last_checkin_date: updates.last_checkin_date ?? null
            };

            const result = await sql`
                INSERT INTO user_stats (user_id, daily_streak, total_points, last_checkin_date, updated_at)
                VALUES (${userId}, ${validUpdates.daily_streak ?? 0}, ${validUpdates.total_points ?? 0}, ${validUpdates.last_checkin_date}, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    daily_streak = COALESCE(${validUpdates.daily_streak}, user_stats.daily_streak),
                    total_points = COALESCE(${validUpdates.total_points}, user_stats.total_points),
                    last_checkin_date = COALESCE(${validUpdates.last_checkin_date}, user_stats.last_checkin_date),
                    updated_at = NOW()
                RETURNING *
            `;

            return result[0];
        } catch (error) {
            console.error('Error updating user stats:', error);
            throw error;
        }
    },

    // Add engagement activity
    async addEngagementActivity(userId, activityType, points = 1, date = null) {
        try {
            // Ensure we have valid values
            const validPoints = points || 1;
            const validDate = date || new Date().toISOString().split('T')[0];
            if (!userId) {
                throw new Error('addEngagementActivity: userId is required');
            }
            console.log('Adding engagement activity', { userId, activityType, validPoints, validDate });
            // Simply increment total points in user_stats
            const updated = await sql`
                INSERT INTO user_stats (user_id, daily_streak, total_points, last_checkin_date, updated_at)
                VALUES (${userId}, 0, ${validPoints}, ${validDate}, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    total_points = COALESCE(user_stats.total_points, 0) + ${validPoints},
                    last_checkin_date = ${validDate},
                    updated_at = NOW()
                RETURNING daily_streak, total_points, last_checkin_date, updated_at
            `;
            const row = updated?.[0] || null;
            console.log('Updated user_stats row:', row);
            return { userId, activityType, points: validPoints, date: validDate, userStats: row };
        } catch (error) {
            console.error('Error adding engagement activity:', error);
            throw error;
        }
    },

    // Update daily streak when check-in occurs
    async updateDailyStreak(userId, checkinDate) {
        try {
            // Ensure we have a valid checkin date
            const validCheckinDate = checkinDate || new Date().toISOString().split('T')[0];

            const userStats = await this.getUserStats(userId);
            const lastCheckin = userStats.last_checkin_date;

            if (!lastCheckin) {
                // First check-in
                await this.updateUserStats(userId, {
                    daily_streak: 1,
                    last_checkin_date: validCheckinDate
                });
                return 1;
            }

            // Normalize dates to UTC to avoid timezone issues
            const lastCheckinDate = new Date(lastCheckin + 'T00:00:00Z');
            const currentCheckinDate = new Date(validCheckinDate + 'T00:00:00Z');
            const daysDiff = Math.floor((currentCheckinDate - lastCheckinDate) / (1000 * 60 * 60 * 24));

            let newStreak;
            if (daysDiff === 1) {
                // Consecutive day - increment streak
                newStreak = userStats.daily_streak + 1;
            } else if (daysDiff === 0) {
                // Same day - no change
                newStreak = userStats.daily_streak;
            } else {
                // Gap in streak - reset to 1
                newStreak = 1;
            }

            await this.updateUserStats(userId, {
                daily_streak: newStreak,
                last_checkin_date: validCheckinDate
            });

            return newStreak;
        } catch (error) {
            console.error('Error updating daily streak:', error);
            throw error;
        }
    },


};
