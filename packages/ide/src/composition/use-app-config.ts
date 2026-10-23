import axios from 'axios';
import request from '../utils/metamodel-request';
import { getCurrentUserId } from '../utils/current-user';

export interface SceneOption {
    sceneId: number;
    name: string;
}

export function useAppConfig() {
    const options = {
        appDataSourceUri: '',
        appTitle: 'SOLO - 场景低代码开发平台',
        sceneId: undefined as number | undefined,
        scenes: [] as SceneOption[]
    };

    async function initialize() {
        const userId = await getCurrentUserId();
        try {
            const { data } = await axios.get('/assets/app-config-default.json');
            options.appDataSourceUri = data.appDataSourceUri || '';
        } catch {
            // 场景数据仍从后端读取，静态菜单配置缺失时不影响用户过滤。
        }

        const { data } = await request.get('/all-scenes');
        if (!Array.isArray(data)) throw new Error('场景数据格式错误');
        options.scenes = data.map((scene: any) => ({
            sceneId: Number(scene.sceneId),
            name: scene.sceneName || scene.name || String(scene.sceneId)
        })).filter((scene) => Number.isSafeInteger(scene.sceneId) && scene.sceneId > 0);

        const requestedId = new URLSearchParams(window.location.search).get('sceneId');
        const savedId = sessionStorage.getItem(`ide:${encodeURIComponent(userId)}:sceneId`);
        const selected = options.scenes.find((scene) => scene.sceneId === Number(requestedId || savedId));
        if (requestedId && !selected) throw new Error('当前用户无法访问指定场景');
        const scene = selected || options.scenes[0];
        options.sceneId = scene?.sceneId;
        if (scene) options.appTitle = scene.name;
        return options;
    }

    return { options, initialize };
}
