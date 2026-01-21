/**
 * 预测缓存管理器 - 简化适配版本
 * 管理预测请求和结果的获取
 */

import axios, { AxiosResponse } from 'axios';
import { PredictContext } from './PredictContext';
import { predictCache } from './PredictCache';
import PredictResultHolder, { ResultType, PredictMode, predictResultHolder } from './PredictResultHolder';
import CodeStore from './CodeStore';
import { reverseString, isCreateAfterEnter } from './utils';
import { CompletionConfig } from '../config/completion-config';
import { getCompletionHeaders } from '../utils/header-utils';

// 请求状态枚举
enum RequestStatus {
    NORMAL = 'NORMAL',
    INTERRUPTED = 'INTERRUPTED',
    ERROR = 'ERROR',
    TIMEOUT = 'TIMEOUT',
    BUSY = 'BUSY',
    EXCEPTION = 'EXCEPTION',
    EMPTY_RESULT = 'EMPTY_RESULT'
}

const TIME_THRESHOLD = 15000; // 15秒超时
let CURRENT_PREDICT_QID = '';

export default class PredictCacheManager {
    public lastPredictResult = "";
    private config: CompletionConfig | null = null;
    // **任务 1**：添加轮询管理机制
    private currentPollingAbortController: AbortController | null = null;

    constructor() {}

    setConfig(config: CompletionConfig): void {
        this.config = config;
    }

    async startPredict(endpoint: string, predictContext: PredictContext, isRetry: boolean = false) {
        if (!this.config) {
            return;
        }

        // **任务 3**：在发起新请求前，取消之前的请求
        const oldQid = CURRENT_PREDICT_QID;
        if (oldQid) {
            // 停止当前的轮询
            this.stopCurrentPolling();
            
            // 取消服务器端的预测任务
            try {
                await this.cancelPredictRequest(oldQid);
            } catch (error) {
                // 即使取消失败，也继续发起新请求
            }
            
            // **关键修复**：清除 CodeStore 缓存，确保服务器端缓存也被清除
            // 错误码 5 表示缓存问题，清除缓存可以避免这个问题
            CodeStore.getInstance().invalidateFile(predictContext.projectRoot, predictContext.fileID);
        }

        // 转换代码格式
        const newBeforeCode = this.convertTextToPredictFormat(predictContext.beforeCode);
        predictContext.beforeCode = newBeforeCode;
        predictContext.laterCode = this.convertTextToPredictFormat(predictContext.laterCode);
        
        // 重置之前的状态，确保这是一个全新的预测
        predictResultHolder.reset();
        CURRENT_PREDICT_QID = ''; // 重置 QID，确保不会与之前的请求混淆
        this.currentPollingAbortController = null; // 清理轮询控制器
        
        // 直接发起新请求，不进行任何缓存检查或条件判断
        try {

                // 获取文件路径
                let file_relative_path = '';
                if (predictContext.fileID.startsWith(predictContext.projectRoot)) {
                    file_relative_path = predictContext.fileID.substring(predictContext.projectRoot.length);
                } else {
                    const pathParts = predictContext.fileID.split('/');
                    file_relative_path = pathParts[pathParts.length - 1];
                }

                // 计算增量位置
                let code_string_offset = CodeStore.getInstance().getDiffPosition(
                    predictContext.fileID,
                    predictContext.beforeCode
                );
                let laterCodeReverse = reverseString(predictContext.laterCode);
                let later_code_offset = CodeStore.getInstance().getDiffPosition(
                    predictContext.fileID + ".later",
                    laterCodeReverse
                );

                // 构建请求体
                let reqBody: Record<string, any> = {
                    code_string_offset: code_string_offset,
                    code_string: predictContext.beforeCode.substring(code_string_offset),
                    code_string_md5: CodeStore.md5Hash(
                        predictContext.beforeCode.substring(0, code_string_offset)
                    ),
                    ngen: predictContext.ngen,
                    ext: predictContext.ext,
                    later_code_offset: later_code_offset,
                    later_code: reverseString(laterCodeReverse.substring(later_code_offset)),
                    later_code_md5: CodeStore.md5Hash(laterCodeReverse.substring(0, later_code_offset)),
                    file_path: file_relative_path,
                    abs_file_path: predictContext.fileID,
                    reference_files_v2: [], // 简化版本，可以后续扩展
                    single_line: predictContext.single_line, // **修复**：回车后 single_line: false，可以预测多行
                    is_create_after_enter: isCreateAfterEnter(
                        JSON.parse(predictContext.positionStr),
                        predictContext.beforeCode
                    ),
                    change_context_type: 2,
                    change_context_version: 1,
                };

                // 获取补全请求所需的 header 参数
                const completionHeaders = getCompletionHeaders();
                
                // 构建请求头
                const encodedProjectRoot = CodeStore.base64Encode(completionHeaders.projectRoot);
                
                let reqHeaders: Record<string, string> = {
                    "content-type": "application/json",
                    uuid1: completionHeaders.uuid1,
                    udid1: completionHeaders.udid1,
                    projectRoot: encodedProjectRoot,
                    ext: completionHeaders.ext,
                };

                // 添加认证头（如果提供）
                if (this.config.auth?.token) {
                    reqHeaders['Authorization'] = `Bearer ${this.config.auth.token}`;
                }

                // 发送请求（使用代理路径 /api/predict）
                const resp: AxiosResponse = await axios.post(`/api/predict`, reqBody, {
                    headers: reqHeaders,
                    timeout: this.config.timeout || 5000,
                });

                // **关键修复**：处理错误码 5（缓存问题）
                // 根据 aixcoder 的实现，错误码 5 表示缓存问题，需要清除缓存并重试
                if (resp.data.err === '5' && !isRetry) {
                    // 清除 CodeStore 缓存
                    CodeStore.getInstance().invalidateFile(predictContext.projectRoot, predictContext.fileID);
                    
                    // 等待一小段时间，确保服务器端缓存已清除
                    await this.sleep(200);
                    
                    // 重试预测请求（递归调用，但只重试一次）
                    return this.startPredict(endpoint, predictContext, true);
                } else if (resp.data.err === '5' && isRetry) {
                    // 如果重试后仍然返回错误码 5，不再重试，直接报错
                    predictResultHolder.setResult(ResultType.ERROR, '', predictContext.positionStr);
                    return;
                }

                CURRENT_PREDICT_QID = resp.data.qid;

                if (resp.data.err === '0') {
                    // 保存请求成功后的上下文
                    CodeStore.getInstance().saveLastSent(
                        predictContext.projectRoot,
                        predictContext.fileID,
                        predictContext.beforeCode
                    );
                    CodeStore.getInstance().saveLastSent(
                        predictContext.projectRoot,
                        predictContext.fileID + ".later",
                        reverseString(predictContext.laterCode)
                    );
                    predictResultHolder.setResult(ResultType.PREDICTING, '', predictContext.positionStr);

                    // 开始轮询获取结果
                    this.getResultsByContinuous(endpoint, predictContext, resp.data.qid);
                } else {
                    // 错误处理
                    // 如果是其他错误码，也尝试清除缓存（某些错误可能与缓存相关）
                    if (resp.data.err && resp.data.err !== '0' && resp.data.err !== '5') {
                        CodeStore.getInstance().invalidateFile(predictContext.projectRoot, predictContext.fileID);
                    }
                    
                    predictResultHolder.setResult(ResultType.ERROR, '', predictContext.positionStr);
                }
            } catch (err: any) {
                predictResultHolder.setResult(ResultType.ERROR, '', predictContext.positionStr);
            }
    }

    async getPredictResult(predictMode: PredictMode = 'full') {
        let predictResultStr = '';
        let autoPredictMode2: PredictMode = predictMode;
        let maxWaitTime = 30000; // 最大等待时间 30 秒
        const startTime = Date.now();

        // 如果已经有结果（CACHE 或 PREDICTED），直接返回
        if (predictResultHolder.resultType === ResultType.PREDICTED) {
            predictResultStr = predictResultHolder.getMaxFragmentToShow('full');
            return {
                text: predictResultStr,
                type: predictResultHolder.resultType,
                forword: predictResultHolder.forword,
                backward: predictResultHolder.backward
            };
        }

        if (predictResultHolder.resultType === ResultType.CACHE) {
            return {
                text: predictResultHolder.resultStr,
                type: predictResultHolder.resultType,
                forword: predictResultHolder.forword,
                backward: predictResultHolder.backward
            };
        }

        // 等待预测结果（支持流式输出）
        while (predictResultHolder.resultType === ResultType.PREDICTING || predictResultHolder.resultType === ResultType.NONE) {
            // 检查超时
            if (Date.now() - startTime > maxWaitTime) {
                break;
            }

            // 如果有足够的内容可以显示，立即返回（支持流式显示）
            const currentResultType = predictResultHolder.resultType;
            if (currentResultType === ResultType.PREDICTING) {
                // 如果有部分结果，立即返回（用于流式显示）
                const currentText = predictResultHolder.resultStr;
                if (currentText && currentText.length > 0) {
                    // 立即返回当前结果，不等待更多内容
                    predictResultStr = currentText;
                    return {
                        text: predictResultStr,
                        type: predictResultHolder.resultType,
                        forword: predictResultHolder.forword,
                        backward: predictResultHolder.backward
                    };
                }
                
                // 如果内容足够显示，也返回
                if (autoPredictMode2 !== "only_single_line" && predictResultHolder.isEnoughToShow(autoPredictMode2)) {
                    predictResultStr = predictResultHolder.getMaxFragmentToShow(autoPredictMode2);
                    return {
                        text: predictResultStr,
                        type: predictResultHolder.resultType,
                        forword: predictResultHolder.forword,
                        backward: predictResultHolder.backward
                    };
                }
            }

            await this.sleep(200);
        }

        // 最终结果（循环结束后，resultType 可能是 PREDICTED、CACHE 或其他类型）
        // 使用类型断言，因为循环结束后类型可能已经改变
        const finalResultType = predictResultHolder.resultType as ResultType;
        if (finalResultType === ResultType.PREDICTED) {
            predictResultStr = predictResultHolder.getMaxFragmentToShow('full');
        } else if (finalResultType === ResultType.CACHE) {
            predictResultStr = predictResultHolder.resultStr;
        }

        return {
            text: predictResultStr,
            type: predictResultHolder.resultType,
            forword: predictResultHolder.forword,
            backward: predictResultHolder.backward
        };
    }

    async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * **任务 1**：停止当前的轮询
     */
    private stopCurrentPolling(): void {
        if (this.currentPollingAbortController) {
            this.currentPollingAbortController.abort();
            this.currentPollingAbortController = null;
        }
    }

    /**
     * **任务 2**：取消服务器端的预测请求
     */
    private async cancelPredictRequest(qid: string): Promise<void> {
        if (!qid) {
            return;
        }

        try {
            // 获取补全请求所需的 header 参数
            const completionHeaders = getCompletionHeaders();
            const encodedProjectRoot = CodeStore.base64Encode(completionHeaders.projectRoot);
            
            let reqHeaders: Record<string, string> = {
                "content-type": "application/json",
                uuid1: completionHeaders.uuid1,
                udid1: completionHeaders.udid1,
                projectRoot: encodedProjectRoot,
                ext: completionHeaders.ext
            };

            if (this.config?.auth?.token) {
                reqHeaders['Authorization'] = `Bearer ${this.config.auth.token}`;
            }

            // 构建取消请求体
            const cancelBody = {
                qid: qid,
                cancel: "true"
            };

            // 发送取消请求（使用代理路径）
            await axios.post(`/api/get_results`, cancelBody, {
                headers: reqHeaders,
                timeout: 3000, // 取消请求使用较短的超时时间
            });
        } catch (error: any) {
            // 取消请求失败不应该阻止新请求的发起，静默处理
        }
    }

    /**
     * 获取预测结果（轮询）
     * 使用 get_results 接口替代 cont_predict
     */
    async getResultsByContinuous(
        endpoint: string,
        predictContext: PredictContext,
        qid: string
    ) {
        // **任务 1 & 4**：创建新的 AbortController 来管理此轮询
        this.currentPollingAbortController = new AbortController();
        const abortSignal = this.currentPollingAbortController.signal;
        
        let rtime: number = 0;
        let text_length: number = 0;
        const startTime = Date.now();

        // **任务 4**：增强循环条件，检查 AbortController 和 CancellationToken
        while (
            !predictContext.cancellationToken.isCancellationRequested &&
            !abortSignal.aborted &&
            qid === CURRENT_PREDICT_QID
        ) {
            rtime++;
            const stTime = Date.now();

            // 获取补全请求所需的 header 参数
            const completionHeaders = getCompletionHeaders();
            
            // 构建请求头（get_results 使用相同的 header）
            const encodedProjectRoot = CodeStore.base64Encode(completionHeaders.projectRoot);
            
            let reqHeaders: Record<string, string> = {
                "content-type": "application/json",
                uuid1: completionHeaders.uuid1,
                udid1: completionHeaders.udid1,
                projectRoot: encodedProjectRoot,
                ext: completionHeaders.ext
            };

            if (this.config?.auth?.token) {
                reqHeaders['Authorization'] = `Bearer ${this.config.auth.token}`;
            }

            // 构建请求体（根据 get_results 接口规范）
            let json: Record<string, any> = {
                qid: qid  // 必需：标记请求
            };
            
            // send_no: 请求顺序标识（可选，不传和0等价，最低服务版本限制 v6.12）
            if (rtime > 1) {
                json.send_no = rtime;
            }
            
            // **任务 4**：cancel: 取消任务（可选，如果需要取消则设置为 "true"）
            // 如果 AbortController 已取消或 CancellationToken 已取消，发送取消请求
            if (abortSignal.aborted || predictContext.cancellationToken.isCancellationRequested) {
                json.cancel = "true";
            }

            try {
                // 使用代理路径 /api/get_results
                const resp: AxiosResponse = await axios.post(`/api/get_results`, json, {
                    headers: reqHeaders,
                    timeout: this.config?.timeout || 5000,
                });

                if (rtime === 1) {
                    // 记录首次响应时间
                }

                let forword = 0,
                    backward = 0;
                if (resp.data.replacements && resp.data.replacements.length > 0) {
                    forword = resp.data.replacements[0].old[0];
                    const skips = resp.data.replacements.filter(
                        (item: any) => item.old[1] - item.old[0] === item.new[1] - item.new[0]
                    );
                    if (skips.length > 0) {
                        backward = skips[skips.length - 1].old[1];
                    }
                }

                // **任务 4**：检查 AbortController 是否已取消
                if (abortSignal.aborted) {
                    break;
                }

                // **任务 4**：检查 CancellationToken 是否已取消
                if (predictContext.cancellationToken.isCancellationRequested) {
                    // 如果取消，向服务器发送取消请求
                    try {
                        const cancelBody = {
                            qid: qid,
                            cancel: "true"
                        };
                        const completionHeaders = getCompletionHeaders();
                        const encodedProjectRoot = CodeStore.base64Encode(completionHeaders.projectRoot);
                        await axios.post(`/api/get_results`, cancelBody, {
                            headers: {
                                "content-type": "application/json",
                                uuid1: completionHeaders.uuid1,
                                udid1: completionHeaders.udid1,
                                projectRoot: encodedProjectRoot,
                                ext: completionHeaders.ext,
                                ...(this.config?.auth?.token ? { 'Authorization': `Bearer ${this.config.auth.token}` } : {})
                            },
                            timeout: 2000
                        });
                    } catch (error) {
                        // 忽略取消请求的错误
                    }
                    break;
                }

                // **任务 5**：增强 QID 不匹配检查
                if (qid !== CURRENT_PREDICT_QID) {
                    predictResultHolder.setResult(ResultType.ERROR, "", predictContext.positionStr);
                    break;
                }

                // 检查是否有错误
                if (resp.data.err_id) {
                    predictResultHolder.setResult(ResultType.ERROR, "", predictContext.positionStr);
                    break;
                }

                // 检查超时
                if (Date.now() - startTime > TIME_THRESHOLD) {
                    predictResultHolder.setResult(ResultType.ERROR, "", predictContext.positionStr);
                    break;
                }

                // 处理响应数据
                const predictions = resp.data.predictions || '';
                const isFinal = resp.data.status === 'true' || resp.data.status === true;

                if (isFinal) {
                    // 最终结果
                    if (predictions) {
                        predictResultHolder.setResult(
                            ResultType.PREDICTED,
                            predictions,
                            predictContext.positionStr,
                            resp.data.end_by,
                            forword,
                            backward
                        );
                        predictCache.putToCacheItem(
                            predictContext.fileID,
                            predictContext.beforeCode,
                            predictContext.laterCode,
                            predictions,
                            forword,
                            backward
                        );
                    }
                    break;
                } else {
                    // 中间结果（流式输出）- 持续更新
                    predictResultHolder.setResult(
                        ResultType.PREDICTING,
                        predictions,
                        predictContext.positionStr,
                        undefined,
                        forword,
                        backward
                    );
                    
                    // 继续轮询（不 break，继续 while 循环）
                    // 控制请求频率，避免请求过快
                    const endTime = Date.now();
                    const elapsed = endTime - stTime;
                    if (elapsed < 200) {
                        await this.sleep(200 - elapsed);
                    }
                    // 继续 while 循环，进行下一次轮询
                }
            } catch (err: any) {
                predictResultHolder.setResult(ResultType.ERROR, "", predictContext.positionStr);
                break;
            }

            // 控制请求频率
            const endTime = Date.now();
            if (endTime - stTime < 100) {
                await this.sleep(100 - (endTime - stTime));
            }
        }

        if (predictResultHolder.resultType === ResultType.PREDICTING) {
            predictResultHolder.setResult(ResultType.PREDICTED, '', predictContext.positionStr);
        }

        // **任务 4**：清理 AbortController
        if (this.currentPollingAbortController && qid === CURRENT_PREDICT_QID) {
            // 只有当前轮询对应的 QID 仍然是当前 QID 时才清理
            // 如果 QID 已经改变，说明新的请求已经开始，不应该清理新的 AbortController
            this.currentPollingAbortController = null;
        }
    }

    private convertTextToPredictFormat(beforeCode: string): string {
        let newBeforeCode = beforeCode;
        newBeforeCode = newBeforeCode.replace(/\r\n/g, '\n');
        newBeforeCode = newBeforeCode.replace(/\r/g, '\n');
        return newBeforeCode;
    }
}

// 导出类和单例
export { PredictCacheManager };
export const predictCacheManager = new PredictCacheManager();
