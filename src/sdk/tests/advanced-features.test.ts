
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsManager } from '../analytics';
import { RetryManager, CircuitBreaker, CircuitState } from '../resilience';
import { AdvancedWebSocketClient } from '../advanced-websocket';

describe('Advanced SDK Features', () => {
  describe('Analytics Manager', () => {
    let analytics: AnalyticsManager;
    let mockHttpClient: any;

    beforeEach(() => {
      mockHttpClient = {
        post: vi.fn().mockResolvedValue({})
      };
      
      analytics = new AnalyticsManager({
        batchSize: 3,
        flushInterval: 1000,
        debug: true,
        enableAutoTrack: true
      }, mockHttpClient);
    });

    afterEach(() => {
      analytics.dispose();
    });

    it('should track events and batch them', async () => {
      analytics.track('user_action', { action: 'click' });
      analytics.track('user_action', { action: 'scroll' });
      
      expect(mockHttpClient.post).not.toHaveBeenCalled();
      
      analytics.track('user_action', { action: 'hover' });
      
      // Wait a bit for async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockHttpClient.post).toHaveBeenCalledWith('/analytics/events', {
        events: expect.arrayContaining([
          expect.objectContaining({ name: 'user_action' })
        ]),
        sessionId: expect.any(String)
      });
    });

    it('should flush events manually', async () => {
      analytics.track('test_event', {});
      
      await analytics.flush();
      
      expect(mockHttpClient.post).toHaveBeenCalled();
    });
  });

  describe('Retry Manager', () => {
    let retryManager: RetryManager;

    beforeEach(() => {
      retryManager = new RetryManager({
        maxAttempts: 3,
        baseDelay: 10, // Reduced for faster tests
        maxDelay: 1000,
        exponentialBase: 2
      });
    });

    it('should retry failed operations', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('Success');

      const result = await retryManager.executeWithRetry(mockOperation);
      
      expect(result).toBe('Success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fail'));

      await expect(retryManager.executeWithRetry(mockOperation))
        .rejects.toThrow('Always fail');
      
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Circuit Breaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 100,
        monitoringPeriod: 1000
      });
    });

    it('should open circuit after threshold failures', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('Fail'));

      // First failure
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      // Second failure - should open circuit
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Third attempt should fail immediately
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(failingOperation).toHaveBeenCalledTimes(2); // Should not call the operation
    });

    it('should transition to half-open after recovery timeout', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('Fail'));

      // Trigger circuit to open
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      const successOperation = vi.fn().mockResolvedValue('Success');
      const result = await circuitBreaker.execute(successOperation);
      
      expect(result).toBe('Success');
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });
  });
});
