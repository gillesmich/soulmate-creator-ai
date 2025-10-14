const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

interface AuthAttempt {
  count: number;
  lockoutUntil?: number;
}

export class AuthRateLimit {
  private attempts: Map<string, AuthAttempt> = new Map();

  canAttempt(email: string): boolean {
    const record = this.attempts.get(email);
    if (!record) return true;

    if (record.lockoutUntil && Date.now() < record.lockoutUntil) {
      return false;
    }

    // Reset lockout if expired
    if (record.lockoutUntil && Date.now() >= record.lockoutUntil) {
      this.attempts.delete(email);
      return true;
    }

    return record.count < MAX_ATTEMPTS;
  }

  recordAttempt(email: string, success: boolean) {
    if (success) {
      this.attempts.delete(email);
      return;
    }

    const record = this.attempts.get(email) || { count: 0 };
    record.count++;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockoutUntil = Date.now() + LOCKOUT_DURATION;
    }

    this.attempts.set(email, record);
  }

  getRemainingAttempts(email: string): number {
    const record = this.attempts.get(email);
    if (!record) return MAX_ATTEMPTS;
    return Math.max(0, MAX_ATTEMPTS - record.count);
  }

  getTimeUntilUnlock(email: string): number {
    const record = this.attempts.get(email);
    if (!record || !record.lockoutUntil) return 0;
    return Math.max(0, record.lockoutUntil - Date.now());
  }
}

export const authRateLimit = new AuthRateLimit();
