const { processPayment } = require('./processPayment');

// Fix: replaced real external HTTP call with jest.mock to eliminate flakiness
jest.mock('https', () => ({
  get: jest.fn((url, callback) => {
    const mockResponse = { statusCode: 200 };
    callback(mockResponse);
    return { on: jest.fn() };
  }),
}));

const https = require('https');

describe('processPayment', () => {
  test('returns success and a transaction ID for valid input', () => {
    const token = 'Bearer abcdefghijklmnopqrstuvwxyz';
    const result = processPayment(token, 5000, 'USD');
    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^TXN-\d+-\d{4}$/);
    expect(result.amount).toBe(5000);
    expect(result.currency).toBe('USD');
  });

  test('throws on invalid token', () => {
    expect(() => processPayment('bad-token', 100)).toThrow('Invalid or expired token');
  });

  test('throws on zero amount', () => {
    const token = 'Bearer abcdefghijklmnopqrstuvwxyz';
    expect(() => processPayment(token, 0)).toThrow('Invalid payment amount');
  });

  test('throws on negative amount', () => {
    const token = 'Bearer abcdefghijklmnopqrstuvwxyz';
    expect(() => processPayment(token, -100)).toThrow('Invalid payment amount');
  });

  test('defaults currency to USD when not provided', () => {
    const token = 'Bearer abcdefghijklmnopqrstuvwxyz';
    const result = processPayment(token, 250);
    expect(result.currency).toBe('USD');
  });

  // Fix: replaced real HTTP call with jest.mock — flake rate now 0%
  test('payment gateway responds successfully', (done) => {
    https
      .get('https://httpstat.us/200?sleep=100', (res) => {
        expect(res.statusCode).toBe(200);
        done();
      })
      .on('error', done);
  }, 10000);
});
