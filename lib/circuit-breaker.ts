import { logger } from '@/lib/logger';

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxAttempts: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 60_000,
  halfOpenMaxAttempts: 1,
};

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.allowRequest()) {
      throw new CircuitBreakerOpenError(`Circuit breaker '${this.name}' is open`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private allowRequest(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'half-open') return true;

    // State is 'open' - check if cooldown has elapsed
    const now = Date.now();
    if (now - this.lastFailureTime > this.config.cooldownMs) {
      this.state = 'half-open';
      this.successCount = 0;
      logger.info('circuit_breaker.half_open', { name: this.name });
      return true;
    }
    return false;
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenMaxAttempts) {
        this.state = 'closed';
        this.failureCount = 0;
        logger.info('circuit_breaker.closed', { name: this.name });
      }
    } else if (this.state === 'closed') {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      logger.warn('circuit_breaker.reopened', { name: this.name });
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      logger.warn('circuit_breaker.opened', {
        name: this.name,
        failureCount: this.failureCount,
      });
    }
  }

  async isOpen(): Promise<boolean> {
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.config.cooldownMs) {
        this.state = 'half-open';
        this.successCount = 0;
        logger.info('circuit_breaker.half_open', { name: this.name });
        return false;
      }
      return true;
    }
    return false;
  }

  async recordFailure(): Promise<void> {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      logger.warn('circuit_breaker.reopened', { name: this.name });
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      logger.warn('circuit_breaker.opened', {
        name: this.name,
        failureCount: this.failureCount,
      });
    }
  }

  async recordSuccess(): Promise<void> {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenMaxAttempts) {
        this.state = 'closed';
        this.failureCount = 0;
        logger.info('circuit_breaker.closed', { name: this.name });
      }
    } else {
      this.failureCount = 0;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

// Pre-configured circuit breakers for external API services
export const linkedinCircuitBreaker = new CircuitBreaker('linkedin');
export const instagramCircuitBreaker = new CircuitBreaker('instagram');
export const facebookCircuitBreaker = new CircuitBreaker('facebook');
export const xCircuitBreaker = new CircuitBreaker('x');
export const resendCircuitBreaker = new CircuitBreaker('resend');
export const tokenRefreshCircuitBreaker = new CircuitBreaker('token-refresh');

const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, config));
  }
  return breakers.get(name)!;
}

export function resetAllCircuitBreakers(): void {
  linkedinCircuitBreaker.reset();
  instagramCircuitBreaker.reset();
  facebookCircuitBreaker.reset();
  xCircuitBreaker.reset();
  resendCircuitBreaker.reset();
  tokenRefreshCircuitBreaker.reset();
  for (const breaker of breakers.values()) {
    breaker.reset();
  }
  logger.info('circuit_breaker.all_reset');
}

export function getCircuitBreakerStatus(): Record<string, CircuitState> {
  const status: Record<string, CircuitState> = {
    linkedin: linkedinCircuitBreaker.getState(),
    instagram: instagramCircuitBreaker.getState(),
    facebook: facebookCircuitBreaker.getState(),
    x: xCircuitBreaker.getState(),
    resend: resendCircuitBreaker.getState(),
    'token-refresh': tokenRefreshCircuitBreaker.getState(),
  };
  for (const [name, breaker] of breakers.entries()) {
    status[name] = breaker.getState();
  }
  return status;
}
