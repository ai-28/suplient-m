import { sql } from './postgresql';

export const integrationRepo = {
    // Get all integrations for a coach (using database)
    async getCoachIntegrations(coachId) {
        try {

            const integrations = await sql`
                SELECT id, "coachId", platform, "accessToken", "refreshToken", 
                       "tokenExpiresAt", scope, "platformUserId", "platformEmail", 
                       "platformName", "isActive", settings, "createdAt", "updatedAt"
                FROM "CoachIntegration"
                WHERE "coachId" = ${coachId} AND "isActive" = true
                ORDER BY "createdAt" DESC
            `;

            return integrations;
        } catch (error) {
            console.error('Error getting coach integrations:', error);
            throw error;
        }
    },

    // Get specific integration for a coach (using database)
    async getCoachIntegration(coachId, platform) {
        try {

            const [integration] = await sql`
                SELECT id, "coachId", platform, "accessToken", "refreshToken", 
                       "tokenExpiresAt", scope, "platformUserId", "platformEmail", 
                       "platformName", "isActive", settings, "createdAt", "updatedAt"
                FROM "CoachIntegration"
                WHERE "coachId" = ${coachId} AND platform = ${platform} AND "isActive" = true
                LIMIT 1
            `;

            return integration || null;
        } catch (error) {
            console.error('Error getting coach integration:', error);
            throw error;
        }
    },

    // Create or update integration (using database)
    async upsertCoachIntegration(integrationData) {
        try {

            const {
                coachId,
                platform,
                accessToken,
                refreshToken,
                tokenExpiresAt,
                scope,
                isActive = true,
                platformUserId,
                platformEmail,
                platformName,
                settings
            } = integrationData;

            // Use UPSERT to handle both insert and update cases
            const [integration] = await sql`
                INSERT INTO "CoachIntegration" (
                    "coachId", platform, "accessToken", "refreshToken", 
                    "tokenExpiresAt", scope, "platformUserId", "platformEmail", 
                    "platformName", "isActive", settings, "createdAt", "updatedAt"
                )
                VALUES (
                    ${coachId}, ${platform}, ${accessToken}, ${refreshToken}, 
                    ${tokenExpiresAt}, ${scope}, ${platformUserId}, ${platformEmail}, 
                    ${platformName}, ${isActive}, ${JSON.stringify(settings || {})}, 
                    NOW(), NOW()
                )
                ON CONFLICT ("coachId", platform) 
                DO UPDATE SET
                    "accessToken" = EXCLUDED."accessToken",
                    "refreshToken" = EXCLUDED."refreshToken",
                    "tokenExpiresAt" = EXCLUDED."tokenExpiresAt",
                    scope = EXCLUDED.scope,
                    "platformUserId" = EXCLUDED."platformUserId",
                    "platformEmail" = EXCLUDED."platformEmail",
                    "platformName" = EXCLUDED."platformName",
                    "isActive" = EXCLUDED."isActive",
                    settings = EXCLUDED.settings,
                    "updatedAt" = NOW()
                RETURNING id, "coachId", platform, "accessToken", "refreshToken", 
                          "tokenExpiresAt", scope, "platformUserId", "platformEmail", 
                          "platformName", "isActive", settings, "createdAt", "updatedAt"
            `;

            return integration;
        } catch (error) {
            console.error('Error upserting coach integration:', error);
            throw error;
        }
    },

    // Update integration token (using database)
    async updateIntegrationToken(integrationId, accessToken, tokenExpiresAt) {
        try {

            // Validate and format the expiration date
            let expiresAt;
            if (tokenExpiresAt instanceof Date) {
                expiresAt = tokenExpiresAt;
            } else if (typeof tokenExpiresAt === 'string') {
                expiresAt = new Date(tokenExpiresAt);
            } else if (typeof tokenExpiresAt === 'number') {
                expiresAt = new Date(tokenExpiresAt);
            } else {
                console.error('❌ Invalid tokenExpiresAt type:', typeof tokenExpiresAt, tokenExpiresAt);
                throw new Error(`Invalid tokenExpiresAt: ${tokenExpiresAt}`);
            }

            // Validate the date
            if (isNaN(expiresAt.getTime())) {
                console.error('❌ Invalid date:', tokenExpiresAt);
                throw new Error(`Invalid date: ${tokenExpiresAt}`);
            }


            const [integration] = await sql`
                UPDATE "CoachIntegration"
                SET "accessToken" = ${accessToken},
                    "tokenExpiresAt" = ${expiresAt},
                    "updatedAt" = NOW()
                WHERE id = ${integrationId}
                RETURNING id, "coachId", platform, "accessToken", "refreshToken", 
                          "tokenExpiresAt", scope, "platformUserId", "platformEmail", 
                          "platformName", "isActive", settings, "createdAt", "updatedAt"
            `;

            if (!integration) {
                console.error('❌ Integration not found for token update:', integrationId);
                throw new Error(`Integration with ID ${integrationId} not found`);
            }

            return integration;
        } catch (error) {
            console.error('❌ Error updating integration token:', error);
            throw error;
        }
    },

    // Update integration refresh token (using database)
    async updateIntegrationRefreshToken(integrationId, refreshToken) {
        try {

            const [integration] = await sql`
                UPDATE "CoachIntegration"
                SET "refreshToken" = ${refreshToken},
                    "updatedAt" = NOW()
                WHERE id = ${integrationId}
                RETURNING id, "coachId", platform, "accessToken", "refreshToken", 
                          "tokenExpiresAt", scope, "platformUserId", "platformEmail", 
                          "platformName", "isActive", settings, "createdAt", "updatedAt"
            `;

            if (!integration) {
                console.error('❌ Integration not found for refresh token update:', integrationId);
                throw new Error(`Integration with ID ${integrationId} not found`);
            }

            return integration;
        } catch (error) {
            console.error('❌ Error updating integration refresh token:', error);
            throw error;
        }
    },

    // Deactivate integration (using database)
    async deactivateIntegration(coachId, platform) {
        try {

            const [integration] = await sql`
                UPDATE "CoachIntegration"
                SET "isActive" = false,
                    "updatedAt" = NOW()
                WHERE "coachId" = ${coachId} AND platform = ${platform}
                RETURNING id, "coachId", platform, "accessToken", "refreshToken", 
                          "tokenExpiresAt", scope, "platformUserId", "platformEmail", 
                          "platformName", "isActive", settings, "createdAt", "updatedAt"
            `;

            if (!integration) {
                return null;
            }

            return integration;
        } catch (error) {
            console.error('Error deactivating integration:', error);
            throw error;
        }
    },

};
