jest.mock('axios', () => ({ get: jest.fn() }));

let identity: typeof import('./current-user');
let get: jest.Mock;

beforeEach(async () => {
  jest.resetModules();
  get = (await import('axios')).default.get as jest.Mock;
  identity = await import('./current-user');
});

test('reads userInfo.userId once for concurrent requests', async () => {
  get.mockResolvedValue({ data: { userInfo: { id: 'other', userId: 'admin', tenantId: 10000 } } });
  await expect(Promise.all([identity.getCurrentUserId(), identity.getCurrentUserId()]))
    .resolves.toEqual(['admin', 'admin']);
  expect(get).toHaveBeenCalledTimes(1);
  expect(get).toHaveBeenCalledWith('/api/runtime/sys/v1.0/userinfos/data', {
    timeout: 15000, withCredentials: true
  });
});

test.each([undefined, '', '   ', 10000, 'a'.repeat(129)])('rejects invalid userId: %s', async (userId) => {
  get.mockResolvedValue({ data: { userInfo: { userId } } });
  await expect(identity.withCurrentUser({ params: { sceneId: 1 } } as any)).rejects.toThrow('获取当前用户失败');
});

test('preserves business parameters and uses the current user', async () => {
  get.mockResolvedValue({ data: { userInfo: { userId: 'user2' } } });
  const config = await identity.withCurrentUser({ params: { domainId: 42, userId: 'user1' } } as any);
  expect(config.params).toEqual({ domainId: 42, userId: 'user2' });
});

test('allows retry after an identity request fails', async () => {
  get.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: { userInfo: { userId: 'admin' } } });
  await expect(identity.getCurrentUserId()).rejects.toThrow('获取当前用户失败');
  await expect(identity.getCurrentUserId()).resolves.toBe('admin');
});
