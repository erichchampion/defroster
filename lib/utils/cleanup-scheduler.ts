/**
 * Cleanup scheduler utility
 * In production, this should be replaced with a scheduled Cloud Function or cron job
 */

export class CleanupScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  start(intervalMinutes: number = 15) {
    if (this.intervalId) {
      console.log('Cleanup scheduler already running');
      return;
    }

    console.log(`Starting cleanup scheduler (every ${intervalMinutes} minutes)`);

    // Run cleanup immediately
    this.runCleanup();

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Cleanup scheduler stopped');
    }
  }

  private async runCleanup() {
    try {
      const response = await fetch('/api/cleanup-messages', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Cleanup completed: ${data.deletedCount} messages deleted`);
      } else {
        console.error('Cleanup failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
    }
  }
}

// Singleton instance
export const cleanupScheduler = new CleanupScheduler();
