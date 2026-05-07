const User = require('../models/User');
const { sendEmail } = require('../config/email');
const NotificationService = require('./notificationService');
const path = require('path');
const fs = require('fs');

class ProfileNotificationService {
  constructor() {
    this.notificationIntervals = {
      '24h': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
  }

  async checkAndSendNotifications() {
    try {
      console.log('Checking profile completion notifications...');

      const dbState = User.db.readyState;
      if (dbState !== 1) {
        console.error('Database not connected, state:', dbState);
        return;
      }

      const now = new Date();

      // For each interval, atomically claim users who need that specific notification.
      // The $set happens in the query itself, so even if two job instances run
      // simultaneously, only one will match each user per interval.
      await this.processInterval('24h', now);
      await this.processInterval('3d', now);
      await this.processInterval('7d', now);

      console.log('Profile completion notifications check completed');
    } catch (error) {
      console.error('Error in profile notification service:', error);
    }
  }

  async processInterval(intervalKey, now) {
    const intervalMs = this.notificationIntervals[intervalKey];
    const cutoffDate = new Date(now.getTime() - intervalMs);
    const scheduleField = `profile_notification_schedule.sent_${intervalKey}`;

    // Find users who:
    // 1. Are active and verified with incomplete profiles
    // 2. Were created before the cutoff (enough time has passed)
    // 3. Have NOT yet received this specific notification (field is null/missing)
    //
    // We use findOneAndUpdate in a loop instead of updateMany so we can
    // send the email for each user individually with proper error handling.
    let processed = 0;

    while (true) {
      // Atomically find one unclaimed user and mark them as claimed for this interval.
      // If two job instances run at the same time, only one will get each user
      // because MongoDB's findOneAndUpdate is atomic.
      const user = await User.findOneAndUpdate(
        {
          email_verified: true,
          profile_completion_status: 'not_submitted',
          user_status: 'active',
          createdAt: { $lte: cutoffDate },
          [scheduleField]: { $in: [null, undefined] }, // not yet sent
        },
        {
          $set: { [scheduleField]: now }, // claim it immediately
        },
        {
          new: false, // return the doc before update (we only need email/name)
          select: 'email first_name _id',
          maxTimeMS: 5000,
        }
      );

      if (!user) break; // no more users need this notification

      // Send the notification. If this fails, the schedule field is already
      // set so we won't retry — log the error clearly.
      await this.sendNotification(user, intervalKey);
      processed++;

      if (processed >= 100) {
        // Safety cap per run — next job cycle will pick up the rest
        console.log(`Reached 100-user cap for ${intervalKey} interval, will continue next run`);
        break;
      }
    }

    if (processed > 0) {
      console.log(`Sent ${intervalKey} notifications to ${processed} users`);
    }
  }

  async sendNotification(user, notificationType) {
    try {
      console.log(`Sending ${notificationType} profile completion notification to ${user.email}`);

      const notificationMessage = this.getNotificationMessage(notificationType);
      await NotificationService.createNotification({
        user_id: user._id,
        type: 'profile_completion_reminder',
        title: 'Complete Your Profile',
        message: notificationMessage,
        metadata: {
          notification_type: notificationType,
          user_email: user.email,
          scheduled_at: new Date(),
        },
        sendEmail: false,
      });

      const templatePath = path.join(__dirname, '../templates/profileCompletionReminder.html');
      let emailTemplate = fs.readFileSync(templatePath, 'utf8');
      emailTemplate = emailTemplate.replace('{{USER_NAME}}', user.first_name);
      emailTemplate = emailTemplate.replace('{{USER_EMAIL}}', user.email);
      emailTemplate = emailTemplate.replace('{{NOTIFICATION_TYPE}}', this.getNotificationTypeText(notificationType));
      emailTemplate = emailTemplate.replace('{{CURRENT_YEAR}}', new Date().getFullYear());

      const emailResult = await sendEmail({
        to: user.email,
        subject: this.getEmailSubject(notificationType),
        html: emailTemplate,
      });

      if (emailResult.success) {
        console.log(`Successfully sent ${notificationType} notification to ${user.email}`);
      } else {
        console.error(`Failed to send ${notificationType} email to ${user.email}:`, emailResult.error);
      }
    } catch (error) {
      console.error(`Error sending ${notificationType} notification to ${user.email}:`, error);
    }
  }

  getNotificationTypeText(notificationType) {
    const texts = {
      '24h': '24 hours after registration',
      '3d': '3 days after registration',
      '7d': '7 days after registration',
    };
    return texts[notificationType] || 'profile completion reminder';
  }

  getNotificationMessage(notificationType) {
    const messages = {
      '24h': "Welcome to ProductNerve! You've been with us for 24 hours. Take a moment to complete your profile.",
      '3d': "You've been a ProductNerve member for 3 days! Complete your profile to unlock all features.",
      '7d': "A week has passed since you joined ProductNerve! Don't forget to complete your profile.",
    };
    return messages[notificationType] || 'Complete your profile to get the most out of ProductNerve.';
  }

  getEmailSubject(notificationType) {
    const subjects = {
      '24h': 'ProductNerve: Complete Your Profile',
      '3d': 'ProductNerve: Complete Your Profile',
      '7d': 'ProductNerve: Complete Your Profile — Final Reminder',
    };
    return subjects[notificationType] || 'ProductNerve: Profile Completion Reminder';
  }

  async sendTestNotification(email, notificationType = '24h') {
    try {
      const user = await User.findOne({ email }).select('email first_name _id');
      if (!user) throw new Error('User not found');
      await this.sendNotification(user, notificationType);
      console.log(`Test ${notificationType} notification sent to ${email}`);
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }
}

module.exports = new ProfileNotificationService();