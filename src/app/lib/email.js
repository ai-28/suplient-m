// Use EmailJS REST API directly instead of SDK to avoid connection issues
const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

async function sendEmailViaAPI(templateId, templateParams) {
    if (!process.env.EMAIL_SERVICE_ID || !process.env.EMAIL_PUBLIC_KEY || !process.env.EMAIL_PRIVATE_KEY) {
        throw new Error('EmailJS configuration is missing. Check your environment variables.');
    }

    if (!templateId) {
        throw new Error('Template ID is required');
    }

    const response = await fetch(EMAILJS_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            service_id: process.env.EMAIL_SERVICE_ID,
            template_id: templateId,
            user_id: process.env.EMAIL_PUBLIC_KEY,
            template_params: templateParams,
            accessToken: process.env.EMAIL_PRIVATE_KEY,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch {
            errorData = { text: errorText };
        }
        throw new Error(errorData.text || `EmailJS API error: ${response.status}`);
    }

    // EmailJS may return "OK" as plain text or JSON
    const responseText = await response.text();
    try {
        return JSON.parse(responseText);
    } catch {
        // If response is plain text (like "OK"), return success object
        return { status: 200, text: responseText };
    }
}

export const sendClientRegistrationEmail = async (newClient) => {
    try {
        const templateParams = {
            name: newClient.name,
            login_url: `${process.env.NEXTAUTH_URL}/login`,
            user_email: newClient.email,
            user_pwd: newClient.tempPassword,
            support_email: 'amin@suplient.com',
            website_url: 'https://app.suplient.com',
            email: newClient.email,
        };

        await sendEmailViaAPI(process.env.EMAIL_CLIENT_TEMPLATE_ID, templateParams);
        console.log('✅ Client registration email sent to:', newClient.email);
    } catch (error) {
        console.error('❌ Error sending client registration email:', error);
        throw error;
    }
}

export const sendCoachRegistrationEmail = async (newCoach) => {
    try {
        const templateParams = {
            name: newCoach.name,
            login_url: `${process.env.NEXTAUTH_URL}/login`,
            user_email: newCoach.email,
            user_pwd: newCoach.tempPassword,
            support_email: 'amin@suplient.com',
            website_url: 'https://app.suplient.com',
            email: newCoach.email,
        }

        await sendEmailViaAPI(process.env.EMAIL_COACH_TEMPLATE_ID, templateParams);
        console.log('✅ Coach registration email sent to:', newCoach.email);
    } catch (error) {
        console.error('❌ Error sending coach registration email:', error);
        throw error;
    }
}

export const sendCoachPendingEmail = async (newCoach) => {
    try {
        const templateParams = {
            name: newCoach.name,
            support_email: 'amin@suplient.com',
            website_url: 'https://app.suplient.com',
            email: newCoach.email,
        }

        await sendEmailViaAPI(process.env.EMAIL_COACH_PENDING_TEMPLATE_ID, templateParams);
        console.log('✅ Coach pending email sent to:', newCoach.email);
    } catch (error) {
        console.error('❌ Error sending pending email:', error);
        throw error;
    }
}

export const sendCoachApprovalEmail = async (coach) => {
    try {
        const templateParams = {
            name: coach.name,
            login_url: `${process.env.NEXTAUTH_URL}/login`,
            user_email: coach.email,
            user_pwd: coach.tempPassword || 'Please use the password you registered with, or use password reset if needed',
            support_email: 'amin@suplient.com',
            website_url: 'https://app.suplient.com',
            email: coach.email,
        }

        await sendEmailViaAPI(process.env.EMAIL_COACH_TEMPLATE_ID, templateParams);
        console.log('✅ Coach approval email sent to:', coach.email);
    } catch (error) {
        console.error('❌ Error sending approval email:', error);
        throw error;
    }
}

export const sendCoachDenialEmail = async (coach) => {
    try {
        const templateParams = {
            name: coach.name,
            support_email: 'amin@suplient.com',
            website_url: 'https://app.suplient.com',
            email: coach.email,
        }

        await sendEmailViaAPI(process.env.EMAIL_COACH_DENIED_TEMPLATE_ID, templateParams);
        console.log('✅ Coach denial email sent to:', coach.email);
    } catch (error) {
        console.error('❌ Error sending denial email:', error);
        throw error;
    }
}

export const sendClientToCoachEmail = async (contactData) => {
    try {
        if (!contactData.coachEmail) {
            throw new Error('Coach email address is required');
        }
        if (!contactData.message) {
            throw new Error('Message content is required');
        }

        const templateParams = {
            email: contactData.coachEmail,
            name: contactData.clientName,
            coach_name: contactData.coachName,
            client_name: contactData.clientName,
            client_email: contactData.clientEmail,
            message: contactData.message,
            reply_to: contactData.clientEmail,
            support_email: 'amin@suplient.com',
            website_url: 'https://app.suplient.com',
        };

        await sendEmailViaAPI(
            process.env.EMAIL_CLIENT_TO_COACH_TEMPLATE_ID || 'template_client_to_coach',
            templateParams
        );
        console.log('✅ Email sent successfully to coach:', contactData.coachEmail);
    } catch (error) {
        console.error('❌ Error sending client to coach email:', error);
        throw error;
    }
}

export const sendPasswordResetEmail = async (userData) => {
    try {
        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${userData.resetToken}`;

        const templateParams = {
            name: userData.name,
            reset_url: resetUrl,
            user_email: userData.email,
            support_email: 'amin@suplient.com',
            website_url: 'https://app.suplient.com',
            email: userData.email,
        };

        await sendEmailViaAPI(
            process.env.EMAIL_PASSWORD_RESET_TEMPLATE_ID || 'template_password_reset',
            templateParams
        );
        console.log('✅ Password reset email sent successfully to:', userData.email);
    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        throw error;
    }
}
