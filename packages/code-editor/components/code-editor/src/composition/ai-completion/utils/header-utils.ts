/**
 * AI 补全请求头工具函数
 */

const DEVICE_ID_KEY = 'AI_COMPLETION_DEVICE_ID';

/**
 * 生成设备 ID（UUID v4 格式）
 */
function generateDeviceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 获取或生成设备 ID
 * 如果 localStorage 中已存在，则使用已有的；否则生成新的并保存
 */
export function getDeviceId(): string {
    try {
        let deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (!deviceId) {
            deviceId = generateDeviceId();
            localStorage.setItem(DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
    } catch (error) {
        // 如果 localStorage 不可用，生成一个临时 ID（但不会持久化）
        return generateDeviceId();
    }
}

/**
 * 从 localStorage 的 APPS_REC 中获取 userId
 * 如果没有找到，返回默认值 'aixcoder_test'
 */
export function getUserId(): string {
    try {
        const appsRecStr = localStorage.getItem('APPS_REC');
        if (appsRecStr) {
            try {
                const appsRec = JSON.parse(appsRecStr);
                if (appsRec && typeof appsRec.userId === 'string' && appsRec.userId.trim()) {
                    return appsRec.userId;
                }
            } catch (parseError) {
                // 静默处理解析错误
            }
        }
        return 'aixcoder_test';
    } catch (error) {
        return 'aixcoder_test';
    }
}

/**
 * 从 URL 参数中获取项目根目录
 * 从 URL 的 `id` 参数中提取目录部分（去掉文件名）
 * 
 * 规则：
 * 1. 如果 id 是目录路径（以 / 结尾），直接返回（确保以 / 结尾）
 * 2. 如果 id 是文件路径，去掉文件名，返回目录部分，并确保以 / 结尾
 * 
 * 根据规范，projectRoot 必须以 / 开头和结尾
 * 
 * 例如：
 *   ?id=/ingpt/aim/aixcoder1001/bo-aixcoder1001-front/metadata/components/file.ts
 *   -> /ingpt/aim/aixcoder1001/bo-aixcoder1001-front/metadata/components/
 * 
 *   ?id=/path/to/directory/
 *   -> /path/to/directory/
 */
export function getProjectRootFromUrl(): string {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');
        
        if (!idParam) {
            return '/';
        }
        
        // 如果以 / 结尾，说明是目录路径，直接返回（确保以 / 结尾）
        if (idParam.endsWith('/')) {
            const projectRoot = idParam || '/';
            return projectRoot;
        }
        
        // 解析路径部分
        const pathParts = idParam.split('/').filter(part => part.length > 0);
        
        if (pathParts.length === 0) {
            return '/';
        }
        
        // 去掉最后一个部分（文件名），返回目录部分
        // 根据规范，projectRoot 必须以 / 开头和结尾
        // 例如：/ingpt/aim/aixcoder1001/bo-aixcoder1001-front/metadata/components/file.ts
        // -> /ingpt/aim/aixcoder1001/bo-aixcoder1001-front/metadata/components/
        if (pathParts.length > 1) {
            const projectRoot = '/' + pathParts.slice(0, -1).join('/') + '/';
            return projectRoot;
        }
        
        // 如果只有一层（只有文件名，没有路径），返回 '/'
        return '/';
    } catch (error) {
        return '/';
    }
}

/**
 * 获取补全请求所需的 header 参数
 */
export function getCompletionHeaders(): {
    uuid1: string;
    udid1: string;
    projectRoot: string;
    ext: string;
} {
    return {
        uuid1: getUserId(),
        udid1: getDeviceId(),
        projectRoot: getProjectRootFromUrl(),
        ext: 'aix2_completion'
    };
}
