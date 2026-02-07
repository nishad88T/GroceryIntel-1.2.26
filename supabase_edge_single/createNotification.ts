import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Helper function to create in-app notifications
 * Called internally by other backend functions when events occur
 */

// Notification content templates
const NOTIFICATION_TEMPLATES = {
    trial_started: {
        title: "Welcome to GroceryIntel! 🎉",
        message: "Your free trial has started. You have 4 free scans to explore all features!",
        action_url: "/Guide"
    },
    trial_ending: {
        title: "Trial Ending Soon ⏰",
        message: "Your trial is ending in 3 days. Upgrade to continue enjoying unlimited features!",
        action_url: "/Settings"
    },
    trial_expired: {
        title: "Trial Expired",
        message: "Your free trial has ended. Upgrade to continue using GroceryIntel.",
        action_url: "/Settings"
    },
    first_scan_completed: {
        title: "First Receipt Scanned! 🎯",
        message: "Great job! You've successfully scanned your first receipt. Check out your insights!",
        action_url: "/Dashboard"
    },
    first_recipe_parsed: {
        title: "Recipe Imported! 👨‍🍳",
        message: "You've imported your first recipe! Start building your meal plans now.",
        action_url: "/Recipes"
    },
    household_joined: {
        title: "Household Joined! 🏠",
        message: "Welcome! You're now part of a shared household. Your data is now synced.",
        action_url: "/Household"
    },
    limit_reached: {
        title: "Monthly Limit Reached 🚫",
        message: "You've reached your monthly scan limit. Upgrade for more scans!",
        action_url: "/Settings"
    },
    upgraded: {
        title: "Subscription Active! ⭐",
        message: "Thank you for upgrading! You now have access to all premium features.",
        action_url: "/Dashboard"
    },
    payment_failed: {
        title: "Payment Failed ⚠️",
        message: "Your recent payment failed. Please update your payment method to continue.",
        action_url: "/Settings"
    },
    renewal_due: {
        title: "Renewal Coming Up 🔔",
        message: "Your subscription will renew soon. Make sure your payment method is up to date.",
        action_url: "/Settings"
    },
    recipe_limit_reached: {
        title: "Recipe Limit Reached 📚",
        message: "You've reached your monthly recipe parsing limit. Upgrade to parse more recipes!",
        action_url: "/Settings"
    }
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { user_id, user_email, type } = await req.json();

        if (!user_id || !user_email || !type) {
            return Response.json({ 
                error: 'Missing required parameters: user_id, user_email, type' 
            }, { status: 400 });
        }

        const template = NOTIFICATION_TEMPLATES[type];
        if (!template) {
            return Response.json({ 
                error: `Unknown notification type: ${type}` 
            }, { status: 400 });
        }

        // Create the notification
        const notification = await base44.asServiceRole.entities.Notification.create({
            user_id: user_id,
            user_email: user_email,
            type: type,
            title: template.title,
            message: template.message,
            action_url: template.action_url,
            is_read: false
        });

        console.log(`[Notification] Created notification for ${user_email}: ${type}`);

        return Response.json({ 
            success: true, 
            notification: notification
        });

    } catch (error) {
        console.error('[Notification] Function error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});