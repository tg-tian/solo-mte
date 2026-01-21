/**
 * AI 代码补全功能配置
 */
export interface CompletionConfig {
    // API 端点
    endpoint: string;
    
    // 认证信息
    auth?: {
        token?: string;
        uuid?: string;
        machineId?: string;
        userName?: string;
    };
    
    // 支持的语言列表
    supportedLanguages: string[];
    
    // 项目根目录
    projectRoot: string;
    
    // 是否启用补全
    enabled: boolean;
    
    // 防抖延迟（毫秒）
    debounceDelay: number;
    
    // 请求超时时间（毫秒）
    timeout: number;
    
    // 轮询超时时间（毫秒）
    pollingTimeout: number;
    
    // 是否启用缓存
    enableCache: boolean;
    
    // 预测模式
    predictMode?: 'short' | 'long' | 'full' | 'only_single_line';
    
    // 其他配置
    [key: string]: any;
}

/**
 * 配置管理器
 */
export class CompletionConfigManager {
    private static defaultConfig: CompletionConfig = {
        endpoint: '',
        supportedLanguages: [
            'typescript',
            'javascript',
            'python',
            'java',
            'cpp',
            'c',
            'php',
            'go',
            'csharp',
            'kotlin',
            'vue',
            'html',
            'css',
            'javascriptreact',
            'typescriptreact',
            'sql',
            'shellscript'
        ],
        projectRoot: '/',
        enabled: true,
        debounceDelay: 200,
        timeout: 5000,
        pollingTimeout: 15000,
        enableCache: true,
        predictMode: 'full'
    };

    /**
     * 创建配置对象
     */
    static create(config: Partial<CompletionConfig>): CompletionConfig {
        return {
            ...this.defaultConfig,
            ...config,
            // 深度合并 supportedLanguages
            supportedLanguages: config.supportedLanguages || this.defaultConfig.supportedLanguages
        };
    }

    /**
     * 验证配置是否有效
     */
    static validate(config: CompletionConfig): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!config.endpoint) {
            errors.push('endpoint is required');
        }

        if (!config.projectRoot) {
            errors.push('projectRoot is required');
        }

        if (config.supportedLanguages.length === 0) {
            errors.push('supportedLanguages cannot be empty');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
