const Notification = require('../models/Notification');
const { sendEmail } = require('../config/email');

class NotificationService {
  /**
   * Create a notification and optionally send email
   */
  static async createNotification({ user_id, type, title, message, metadata = {}, sendEmail: shouldSendEmail = false }) {
    try {
      // Create notification in database
      const notification = await Notification.create({
        user_id,
        type,
        title,
        message,
        metadata
      });

      // Send email if requested
      if (shouldSendEmail) {
        await this.sendNotificationEmail(user_id, notification);
      }

      return { success: true, notification };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification to user
   */
  static async sendNotificationEmail(user_id, notification) {
    try {
      // Get user details (you'll need to import User model)
      const User = require('../models/User');
      const user = await User.findById(user_id).select('email first_name last_name');
      
      if (!user) {
        console.error('User not found for email notification');
        return { success: false, error: 'User not found' };
      }

      const emailSubject = `ProductNerve: ${notification.title}`;
      const emailHtml = this.generateEmailTemplate(user, notification);

      const emailResult = await sendEmail({
        to: user.email,
        subject: emailSubject,
        html: emailHtml
      });

      return emailResult;
    } catch (error) {
      console.error('Error sending notification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML email template
   */
  static generateEmailTemplate(user, notification) {
    const userName = user.first_name && user.last_name ? 
      `${user.first_name} ${user.last_name}` : 
      user.first_name || 'User';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title} - ProductNerve</title>
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }
              
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #1a1a1a;
                  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                  padding: 20px;
                  -webkit-font-smoothing: antialiased;
                  -moz-osx-font-smoothing: grayscale;
              }
              
              .email-wrapper {
                  max-width: 600px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 16px;
                  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
                  overflow: hidden;
              }
              
              .header {
                  background: linear-gradient(135deg, #25696C 0%, #1e40af 100%);
                  padding: 40px 30px;
                  text-align: center;
                  position: relative;
              }
              
              .header::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E");
                  opacity: 0.1;
              }
              
              .logo {
                  font-size: 28px;
                  font-weight: 700;
                  color: white;
                  margin-bottom: 8px;
                  letter-spacing: -0.5px;
              }
              
              .tagline {
                  color: rgba(255, 255, 255, 0.9);
                  font-size: 14px;
                  font-weight: 500;
              }
              
              .content {
                  padding: 40px 30px;
              }
              
              .greeting {
                  font-size: 18px;
                  font-weight: 600;
                  color: #1a1a1a;
                  margin-bottom: 16px;
              }
              
              .message {
                  font-size: 16px;
                  color: #4b5563;
                  margin-bottom: 24px;
                  line-height: 1.7;
              }
              
              .notification-card {
                  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                  border: 1px solid #bae6fd;
                  border-radius: 12px;
                  padding: 20px;
                  margin: 24px 0;
              }
              
              .notification-title {
                  font-size: 16px;
                  font-weight: 600;
                  color: #0369a1;
                  margin-bottom: 8px;
              }
              
              .notification-text {
                  font-size: 15px;
                  color: #0c4a6e;
                  line-height: 1.6;
              }
              
              .action-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #25696C 0%, #1e40af 100%);
                  color: white !important;
                  padding: 14px 32px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 15px;
                  margin: 24px 0;
                  box-shadow: 0 4px 12px rgba(37, 105, 108, 0.25);
                  transition: all 0.2s ease;
              }
              
              .action-button:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 20px rgba(37, 105, 108, 0.35);
              }
              
              .action-button:visited {
                  color: white !important;
              }
              
              .security-notice {
                  background: #fef3c7;
                  border: 1px solid #fbbf24;
                  border-radius: 8px;
                  padding: 16px;
                  margin: 24px 0;
              }
              
              .security-title {
                  font-size: 14px;
                  font-weight: 600;
                  color: #92400e;
                  margin-bottom: 8px;
              }
              
              .security-text {
                  font-size: 13px;
                  color: #78350f;
                  line-height: 1.5;
              }
              
              .footer {
                  background: #f8fafc;
                  padding: 24px 30px;
                  text-align: center;
                  border-top: 1px solid #e5e7eb;
              }
              
              .footer-text {
                  font-size: 12px;
                  color: #6b7280;
                  margin-bottom: 8px;
              }
              
              .footer-links {
                  font-size: 12px;
                  color: #6b7280;
              }
              
              .footer-links a {
                  color: #25696C;
                  text-decoration: none;
                  font-weight: 500;
              }
              
              @media (max-width: 600px) {
                  body {
                      padding: 10px;
                  }
                  
                  .email-wrapper {
                      border-radius: 12px;
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                  }
                  
                  .header {
                      padding: 30px 20px;
                  }
                  
                  .content {
                      padding: 30px 20px;
                  }
                  
                  .footer {
                      padding: 20px;
                  }
              }
          </style>
      </head>
      <body>
          <div class="email-wrapper">
              <div class="header">
                  <div class="logo">ProductNerve</div>
                  <div class="tagline">Product Management Platform</div>
              </div>
              
              <div class="content">
                  <div class="greeting">Hello ${userName},</div>
                  <div class="message">We have an important update for you regarding your ProductNerve account.</div>
                  
                  <div class="notification-card">
                      <div class="notification-title">${notification.title}</div>
                      <div class="notification-text">${notification.message}</div>
                  </div>
                  
                  ${notification.link ? `
                      <div style="text-align: center;">
                          <a href="${notification.link}" class="action-button" style="color: white !important;" inline style="color: white !important;">
                              Take Action
                          </a>
                      </div>
                  ` : ''}
                  
                  <div class="security-notice">
                      <div class="security-title">🔒 Security Notice</div>
                      <div class="security-text">
                          This is an automated notification from ProductNerve. If you did not expect this message or have concerns about your account security, please contact our support team immediately. Never share your login credentials with anyone.
                      </div>
                  </div>
              </div>
              
              <div class="footer">
                  <div class="footer-text">&copy; 2024 ProductNerve. All rights reserved.</div>
                  <div class="footer-links">
                      <a href="#">Privacy Policy</a> • 
                      <a href="#">Terms of Service</a> • 
                      <a href="#">Support</a>
                  </div>
                  <div class="footer-text">This message was sent to ${user.email}</div>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(user_id, { page = 0, limit = 20, unreadOnly = false } = {}) {
    try {
      const query = { user_id };
      if (unreadOnly) {
        query.read = false;
      }

      const notifications = await Notification.find(query)
        .sort({ created_at: -1 })
        .skip(page * limit)
        .limit(limit);

      const total = await Notification.countDocuments(query);

      return {
        success: true,
        data: {
          notifications,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notification_id, user_id) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notification_id, user_id },
        { read: true },
        { new: true }
      );

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      return { success: true, notification };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(user_id) {
    try {
      await Notification.updateMany(
        { user_id, read: false },
        { read: true }
      );

      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notification_id, user_id) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notification_id,
        user_id
      });

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(user_id) {
    try {
      const count = await Notification.countDocuments({
        user_id,
        read: false
      });

      return { success: true, count };
    } catch (error) {
      console.error('Error getting unread count:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;
