import { TSConfig } from './ts.config';
import { VMTSConfig } from './viewmodel.config';

/**
 * 打开方式配置
 * @remarks 根据配置项处于数组中的位置下标，优先级由高到低
 */
export const OPENWITH_CONFIG_PROVIDERS = [new VMTSConfig(), new TSConfig()];
