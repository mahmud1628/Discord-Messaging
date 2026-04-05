describe('Socket presence events', () => {
  const setup = () => {
    jest.resetModules();

    const fakeIo = {
      use: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };

    jest.doMock('socket.io', () => ({
      Server: jest.fn(() => fakeIo),
    }));

    jest.doMock('../src/config/env', () => ({
      corsOrigin: '',
      jwtSecret: 'test-secret',
    }));

    jest.doMock('../src/models/auth.model', () => ({
      isAccessTokenRevoked: jest.fn().mockResolvedValue({ rowCount: 0 }),
    }));

    jest.doMock('jsonwebtoken', () => ({
      verify: jest.fn(() => ({
        sub: 'user-1',
        email: 'user@example.com',
        username: 'user1',
        jti: 'jti-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        type: 'access',
      })),
    }));

    const initSocket = require('../src/socket');
    return { initSocket, fakeIo };
  };

  it('emits presence state and online update on first connection', () => {
    const { initSocket, fakeIo } = setup();

    const server = {};
    initSocket(server);

    const connectionHandler = fakeIo.on.mock.calls.find(([event]) => event === 'connection')[1];
    const socket = {
      user: { userId: 'u1', username: 'alpha' },
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };

    connectionHandler(socket);

    expect(socket.emit).toHaveBeenCalledWith('presence:state', {
      onlineUserIds: ['u1'],
    });
    expect(fakeIo.emit).toHaveBeenCalledWith('presence:update', {
      userId: 'u1',
      status: 'online',
    });
  });

  it('tracks multiple sockets per user and emits offline only when last socket disconnects', () => {
    const { initSocket, fakeIo } = setup();

    const server = {};
    initSocket(server);

    const connectionHandler = fakeIo.on.mock.calls.find(([event]) => event === 'connection')[1];

    const socketA = {
      user: { userId: 'u1', username: 'alpha' },
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };

    const socketB = {
      user: { userId: 'u1', username: 'alpha' },
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };

    connectionHandler(socketA);
    connectionHandler(socketB);

    const disconnectA = socketA.on.mock.calls.find(([event]) => event === 'disconnect')[1];
    const disconnectB = socketB.on.mock.calls.find(([event]) => event === 'disconnect')[1];

    disconnectA('transport close');

    expect(fakeIo.emit).not.toHaveBeenCalledWith('presence:update', {
      userId: 'u1',
      status: 'offline',
    });

    disconnectB('transport close');

    expect(fakeIo.emit).toHaveBeenCalledWith('presence:update', {
      userId: 'u1',
      status: 'offline',
    });
  });
});
