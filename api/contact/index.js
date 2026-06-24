const { app } = require('@azure/functions');
const nodemailer = require('nodemailer');

// Fallback config — used if environment variables are not set in Azure Portal.
// Fill these in if Environment variables in Azure Portal are not working.
const CONFIG = {
    SMTP_USER: process.env.SMTP_USER || 'website@rascomtechnology.com',
    SMTP_PASS: process.env.SMTP_PASS || '',   // ← paste your App Password here as fallback
    SMTP_TO:   process.env.SMTP_TO   || 'contactus@rascomtechnology.com'
};

app.http('contact', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {

        // Parse body
        let body;
        try {
            body = await request.json();
        } catch {
            return { status: 400, jsonBody: { error: 'Malformed request.' } };
        }

        const { name, email, topic, message, website } = body ?? {};

        // Honeypot — bots fill hidden fields
        if (website) {
            return { status: 200, jsonBody: { ok: true } };
        }

        // Validation
        if (!name?.trim() || !email?.trim() || !message?.trim()) {
            return { status: 400, jsonBody: { error: 'Name, email and message are required.' } };
        }
        if (name.length > 100) {
            return { status: 400, jsonBody: { error: 'Name must be 100 characters or fewer.' } };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return { status: 400, jsonBody: { error: 'Please provide a valid email address.' } };
        }
        if (message.length > 2000) {
            return { status: 400, jsonBody: { error: 'Message must be 2000 characters or fewer.' } };
        }

        // Read credentials from CONFIG (env vars with fallback)
        const smtpUser = CONFIG.SMTP_USER;
        const smtpPass = CONFIG.SMTP_PASS;
        const smtpTo   = CONFIG.SMTP_TO;

        if (!smtpUser || !smtpPass) {
            context.error('SMTP credentials not configured. Set SMTP_USER and SMTP_PASS in Azure Portal → Configuration.');
            return { status: 500, jsonBody: { error: 'Email is not configured on the server yet.' } };
        }

        // Send via Gmail SMTP
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: smtpUser, pass: smtpPass }
        });

        try {
            await transporter.sendMail({
                from: `"Rascom Website" <${smtpUser}>`,
                to: smtpTo,
                replyTo: `"${name.trim()}" <${email.trim()}>`,
                subject: `[Website] ${topic ?? 'Enquiry'} — ${name.trim()}`,
                text:
                    `Name:    ${name.trim()}\n` +
                    `Email:   ${email.trim()}\n` +
                    `Topic:   ${topic ?? '-'}\n\n` +
                    `Message:\n${message.trim()}`
            });

            return { status: 200, jsonBody: { ok: true } };

        } catch (err) {
            context.error('Mail send failed:', err.message);
            return {
                status: 500,
                jsonBody: { error: 'Could not send your message right now. Please try again later.' }
            };
        }
    }
});
