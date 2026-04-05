const request = require('supertest');

jest.mock('../src/config/env', () => ({
  nodeEnv: 'test',
  jwtSecret: 'test-secret',
  jwtExpiresIn: '7d',
  corsOrigin: '',
}));

const app = require('../src/app');

describe('Auth guard for protected routes', () => {
  it('GET /api/v1/servers should return 401 without bearer token', async () => {
    const response = await request(app).get('/api/v1/servers');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Authorization token is required',
    });
  });
});
