jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../utils/metamodel-request', () => ({ get: jest.fn() }));
jest.mock('../utils/current-user', () => ({ getCurrentUserId: jest.fn().mockResolvedValue('user2') }));

beforeEach(async () => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { search: '' } } });
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: jest.fn().mockReturnValue('999') } });
    const axios = (await import('axios')).default;
    const request = (await import('../utils/metamodel-request')).default;
    (axios.get as jest.Mock).mockResolvedValue({ data: {} });
    (request.get as jest.Mock).mockResolvedValue({ data: [{ sceneId: 2, sceneName: '农业园' }] });
});

test('selects a visible scene instead of an old cached scene', async () => {
    const axios = (await import('axios')).default;
    const { useAppConfig } = await import('./use-app-config');
    const options = await useAppConfig().initialize();
    expect(options.sceneId).toBe(2);
    expect(options.appTitle).toBe('农业园');
    expect(sessionStorage.getItem).toHaveBeenCalledWith('ide:user2:sceneId');
    expect(axios.get).toHaveBeenCalledWith('/assets/app-config-default.json');
});

test('rejects a requested scene absent from the user list', async () => {
    window.location.search = '?sceneId=999';
    const { useAppConfig } = await import('./use-app-config');
    await expect(useAppConfig().initialize()).rejects.toThrow('当前用户无法访问指定场景');
});
