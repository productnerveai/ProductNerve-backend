const profileNotificationService = require('../services/profileNotificationService');

class ProfileNotificationJob {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  // Start the job to run every hour
  start() {
    if (this.isRunning) {
      console.log('Profile notification job is already running');
      return;
    }

    console.log('Starting profile notification job...');
    this.isRunning = true;

    // Run immediately on start
    this.runJob();

    // Then run every hour
    this.intervalId = setInterval(() => {
      this.runJob();
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    console.log('Profile notification job started - will run every hour');
  }

  // Stop the job
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Profile notification job stopped');
  }

  // Run the job
  async runJob() {
    try {
      console.log(`Running profile notification job at ${new Date().toISOString()}`);
      await profileNotificationService.checkAndSendNotifications();
      console.log(`Profile notification job completed at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error running profile notification job:', error);
    }
  }

  // Manual trigger for testing
  async trigger() {
    console.log('Manually triggering profile notification job...');
    await this.runJob();
  }
}

module.exports = new ProfileNotificationJob();
