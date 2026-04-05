const request = require('supertest');

jest.mock('../src/middlewares/authenticate', () => ({
  authenticateAccessToken: jest.fn((req, _res, next) => {
    req.auth = {
      userId: 101,
      username: 'tester',
      tokenId: 'token-id',
      tokenExpiresAtEpochSeconds: 9999999999,
    };
    next();
  }),
}));

jest.mock('../src/services/server.service', () => ({
  listServers: jest.fn(),
}));

jest.mock('../src/services/channel.service', () => ({
  listChannels: jest.fn(),
}));

jest.mock('../src/services/message.service', () => ({
  sendMessage: jest.fn(),
  sendMessageWithAttachment: jest.fn(),
  listMessages: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
  pinMessage: jest.fn(),
  unpinMessage: jest.fn(),
  getPinnedMessages: jest.fn(),
  updateMessage: jest.fn(),
  deleteMessage: jest.fn(),
  getAttachmentDownloadUrlForAuthenticatedUser: jest.fn(),
}));

const serverService = require('../src/services/server.service');
const channelService = require('../src/services/channel.service');
const messageService = require('../src/services/message.service');
const app = require('../src/app');

describe('Servers, channels, and messages endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/servers should return server list', async () => {
    serverService.listServers.mockResolvedValue({
      rows: [{ id: 1, name: 'General Server' }],
    });

    const response = await request(app).get('/api/v1/servers');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      servers: [{ id: 1, name: 'General Server' }],
      count: 1,
    });
  });

  it('GET /api/v1/servers/:serverId/channels should return channel list', async () => {
    channelService.listChannels.mockResolvedValue({
      rows: [{ id: 12, name: 'general', server_id: 1 }],
    });

    const response = await request(app).get('/api/v1/servers/1/channels');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      channels: [{ id: 12, name: 'general', server_id: 1 }],
      count: 1,
    });
    expect(channelService.listChannels).toHaveBeenCalledWith({ serverId: '1' });
  });

  it('GET /api/v1/servers/:serverId/channels/:channelId/messages should return messages', async () => {
    messageService.listMessages.mockResolvedValue({
      rows: [{ id: 44, content: 'hello', channel_id: 12 }],
    });

    const response = await request(app).get('/api/v1/servers/1/channels/12/messages?limit=20');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      messages: [{ id: 44, content: 'hello', channel_id: 12 }],
      count: 1,
    });
    expect(messageService.listMessages).toHaveBeenCalledWith({
      serverId: '1',
      channelId: '12',
      before: undefined,
      after: undefined,
      limit: '20',
    });
  });

  it('POST /api/v1/servers/:serverId/channels/:channelId/messages should send a message', async () => {
    messageService.sendMessage.mockResolvedValue({
      rows: [{ id: 50, content: 'new message', channel_id: 12, created_at: '2026-01-01T00:00:00.000Z' }],
    });

    const response = await request(app)
      .post('/api/v1/servers/1/channels/12/messages')
      .send({ content: 'new message' });

    expect(response.status).toBe(201);
    expect(response.body.message).toMatchObject({
      id: 50,
      content: 'new message',
      channel_id: 12,
    });
    expect(messageService.sendMessage).toHaveBeenCalledWith({
      serverId: '1',
      channelId: '12',
      authorId: 101,
      content: 'new message',
    });
  });

  it('PUT /api/v1/servers/:serverId/channels/:channelId/messages/:messageId/reactions/:emoji should add reaction', async () => {
    messageService.addReaction.mockResolvedValue({ rowCount: 1 });

    const response = await request(app)
      .put('/api/v1/servers/1/channels/12/messages/50/reactions/%F0%9F%91%8D');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Reaction added',
    });
  });

  it('PUT /api/v1/servers/:serverId/channels/:channelId/messages/:messageId/pin should pin message', async () => {
    messageService.pinMessage.mockResolvedValue({
      rowCount: 1,
      rows: [{ message_id: 50, pinned_at: '2026-01-01T00:00:00.000Z' }],
    });

    const response = await request(app).put('/api/v1/servers/1/channels/12/messages/50/pin');

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Message pinned',
    });
  });

  it('GET /api/v1/servers/:serverId/channels/:channelId/messages/pinned should return pinned messages', async () => {
    messageService.getPinnedMessages.mockResolvedValue({
      rows: [{ message_id: 50, content: 'important' }],
    });

    const response = await request(app).get('/api/v1/servers/1/channels/12/messages/pinned');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      pinnedMessages: [{ message_id: 50, content: 'important' }],
      count: 1,
    });
  });

  it('PUT /api/v1/servers/:serverId/channels/:channelId/messages/:messageId should validate empty update payload', async () => {
    const response = await request(app)
      .put('/api/v1/servers/1/channels/12/messages/50')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'Nothing to update' });
  });

  it('DELETE /api/v1/servers/:serverId/channels/:channelId/messages/:messageId should return deleted payload', async () => {
    messageService.deleteMessage.mockResolvedValue({ id: 50, deleted: true });

    const response = await request(app).delete('/api/v1/servers/1/channels/12/messages/50');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      deleted: true,
      message: { id: 50, deleted: true },
    });
  });

  it('GET /api/v1/servers/:serverId/channels/:channelId/messages/attachments/:attachmentId/download-url should return signed url', async () => {
    messageService.getAttachmentDownloadUrlForAuthenticatedUser.mockResolvedValue({
      signedUrl: 'https://example.com/signed-url',
    });

    const response = await request(app).get(
      '/api/v1/servers/1/channels/12/messages/attachments/abc123/download-url'
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      downloadUrl: 'https://example.com/signed-url',
    });
  });
});
