jest.mock('axios', () => ({ get: jest.fn() }));

test('uses userInfo.userId and preserves existing query parameters', async () => {
    const axios = (await import('axios')).default;
    (axios.get as jest.Mock).mockResolvedValue({ data: { userInfo: { id: 'other', userId: 'admin', tenantId: 10000 } } });
    const { getCurrentUserId, withCurrentUser } = await import('./current-user');
    await expect(getCurrentUserId()).resolves.toBe('admin');
    const config = await withCurrentUser({ params: { sceneId: 1, userId: 'other' } } as any);
    expect(config.params).toEqual({ sceneId: 1, userId: 'admin' });
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith('/api/runtime/sys/v1.0/userinfos/data', expect.any(Object));
});

test('blocks requests when the runtime does not return a userId', async () => {
    jest.resetModules();
    const axios = (await import('axios')).default;
    (axios.get as jest.Mock).mockResolvedValue({ data: { userInfo: { id: 'admin' } } });
    const { withCurrentUser } = await import('./current-user');
    await expect(withCurrentUser({} as any)).rejects.toThrow('获取当前用户失败');
});
