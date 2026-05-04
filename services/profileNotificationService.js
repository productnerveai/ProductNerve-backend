const User = require('../models/User');
const { sendEmail } = require('../config/email');
const fs = require('fs');
const path = require('path');

class ProfileNotificationService {
  constructor() {
    this.notificationIntervals = {
      '6h': 6 * 60 * 60 * 1000,      // 6 hours
      '24h': 24 * 60 * 60 * 1000,    // 24 hours
      '3d': 3 * 24 * 60 * 60 * 1000, // 3 days
      '7d': 7 * 24 * 60 * 60 * 1000, // 7 days
      'weekly': 7 * 24 * 60 * 60 * 1000 // 7 days for weekly
    };
  }

  // Check and send profile completion notifications
  async checkAndSendNotifications() {
    try {
      console.log('Checking profile completion notifications...');
      
      // Check database connection first
      const dbState = User.db.readyState;
      if (dbState !== 1) {
        console.error('Database not connected, state:', dbState);
        return;
      }
      
      // Find users who need notifications with lean query, timeout, and pagination
      const usersNeedingNotifications = await User.find({
        email_verified: true,
        'profile_completion_status': 'not_submitted',
        user_status: 'active'
      })
      .select('email first_name createdAt profile_notification_schedule')
      .lean()
      .limit(100) // Limit to prevent memory issues
      .maxTimeMS(5000) // 5 second timeout
      .exec();

      console.log(`Found ${usersNeedingNotifications.length} users for profile completion notifications`);

      for (const user of usersNeedingNotifications) {
        await this.processUserNotifications(user);
      }

      console.log('Profile completion notifications check completed');
    } catch (error) {
      if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
        console.error('MongoDB timeout in profile notification service - database may be slow or unresponsive');
      } else {
        console.error('Error in profile notification service:', error);
      }
    }
  }

  async processUserNotifications(user) {
    const now = new Date();
    const createdAt = new Date(user.createdAt);
    const timeSinceCreation = now - createdAt;
    
    // Initialize notification schedule if it doesn't exist
    if (!user.profile_notification_schedule) {
      user.profile_notification_schedule = {
        last_6h_notification: null,
        last_24h_notification: null,
        last_3d_notification: null,
        last_7d_notification: null,
        last_weekly_notification: null,
        weekly_notification_count: 0
      };
    }

    const schedule = user.profile_notification_schedule;

    // Check 6-hour notification
    if (timeSinceCreation >= this.notificationIntervals['6h'] && !schedule.last_6h_notification) {
      await this.sendNotification(user, '6h');
      schedule.last_6h_notification = now;
    }

    // Check 24-hour notification
    if (timeSinceCreation >= this.notificationIntervals['24h'] && !schedule.last_24h_notification) {
      await this.sendNotification(user, '24h');
      schedule.last_24h_notification = now;
    }

    // Check 3-day notification
    if (timeSinceCreation >= this.notificationIntervals['3d'] && !schedule.last_3d_notification) {
      await this.sendNotification(user, '3d');
      schedule.last_3d_notification = now;
    }

    // Check 7-day notification
    if (timeSinceCreation >= this.notificationIntervals['7d'] && !schedule.last_7d_notification) {
      await this.sendNotification(user, '7d');
      schedule.last_7d_notification = now;
    }

    // Check weekly notifications (after 7 days, send weekly reminders)
    if (timeSinceCreation >= this.notificationIntervals['weekly']) {
      const lastWeeklyNotification = schedule.last_weekly_notification;
      const weeklyNotificationCount = schedule.weekly_notification_count || 0;
      
      // Send weekly notification if it's been a week since last one
      if (!lastWeeklyNotification || (now - lastWeeklyNotification >= this.notificationIntervals['weekly'])) {
        await this.sendNotification(user, 'weekly');
        schedule.last_weekly_notification = now;
        schedule.weekly_notification_count = weeklyNotificationCount + 1;
      }
    }

    // Save updated schedule - convert lean doc back to User model if needed
    if (user._id && typeof user.save === 'function') {
      await user.save();
    } else {
      // For lean documents, we need to fetch and update the full User document
      const fullUser = await User.findById(user._id).maxTimeMS(3000);
      if (fullUser) {
        fullUser.profile_notification_schedule = schedule;
        await fullUser.save();
      }
    }
  }

  async sendNotification(user, notificationType) {
    try {
      console.log(`Sending ${notificationType} profile completion notification to ${user.email}`);
      
      // Read email template
      const templatePath = path.join(__dirname, '../templates/profileCompletionReminder.html');
      let emailTemplate = fs.readFileSync(templatePath, 'utf8');
      
      // Replace placeholders
      emailTemplate = emailTemplate.replace('{{USER_NAME}}', user.first_name);
      emailTemplate = emailTemplate.replace('{{USER_EMAIL}}', user.email);
      emailTemplate = emailTemplate.replace('{{NOTIFICATION_TYPE}}', this.getNotificationTypeText(notificationType));
      emailTemplate = emailTemplate.replace('{{CURRENT_YEAR}}', new Date().getFullYear());
      
      // Send email
      const emailResult = await sendEmail({
        to: user.email,
        subject: this.getEmailSubject(notificationType),
        html: emailTemplate
      });

      if (emailResult.success) {
        console.log(`Successfully sent ${notificationType} notification to ${user.email}`);
      } else {
        console.error(`Failed to send ${notificationType} notification to ${user.email}:`, emailResult.error);
      }
    } catch (error) {
      console.error(`Error sending ${notificationType} notification to ${user.email}:`, error);
    }
  }

  getNotificationTypeText(notificationType) {
    const texts = {
      '6h': '6 hours after registration',
      '24h': '24 hours after registration',
      '3d': '3 days after registration',
      '7d': '7 days after registration',
      'weekly': 'weekly reminder'
    };
    return texts[notificationType] || 'profile completion reminder';
  }

  getEmailSubject(notificationType) {
    const subjects = {
      '6h': 'Complete Your Profile - Product Nerve',
      '24h': 'Profile Completion Reminder - Product Nerve',
      '3d': 'Complete Your Profile to Unlock Full Features - Product Nerve',
      '7d': 'Final Profile Completion Reminder - Product Nerve',
      'weekly': 'Weekly Profile Completion Reminder - Product Nerve'
    };
    return subjects[notificationType] || 'Profile Completion Reminder - Product Nerve';
  }

  // Manual trigger for testing
  async sendTestNotification(email, notificationType = '24h') {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }
      
      await this.sendNotification(user, notificationType);
      console.log(`Test ${notificationType} notification sent to ${email}`);
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }
}

module.exports = new ProfileNotificationService();
