/**
 * 将 Monaco CancellationToken 适配为类似 VSCode CancellationToken 的接口
 */

// 使用 any 类型避免类型检查错误
declare const monaco: any;

export class MonacoCancellationTokenAdapter {
    private callbacks: (() => void)[] = [];
    private _isCancellationRequested: boolean = false;

    constructor(private monacoToken: any) {
        // 监听 Monaco token 的取消事件
        if (monacoToken && typeof monacoToken.onCancellationRequested === 'function') {
            monacoToken.onCancellationRequested(() => {
                this._isCancellationRequested = true;
                this.callbacks.forEach(cb => {
                    try {
                        cb();
                    } catch (e) {
                        // 忽略回调错误
                    }
                });
            });
        }

        // 如果已经取消，立即标记
        if (monacoToken && monacoToken.isCancellationRequested) {
            this._isCancellationRequested = true;
        }
    }

    /**
     * 是否已请求取消
     */
    get isCancellationRequested(): boolean {
        return this._isCancellationRequested || (this.monacoToken && this.monacoToken.isCancellationRequested);
    }

    /**
     * 注册取消回调
     */
    onCancellationRequested(callback: () => void): void {
        if (this.isCancellationRequested) {
            // 如果已经取消，立即执行回调
            try {
                callback();
            } catch (e) {
                // 忽略回调错误
            }
        } else {
            this.callbacks.push(callback);
        }
    }

    /**
     * 手动取消
     */
    cancel(): void {
        if (!this._isCancellationRequested) {
            this._isCancellationRequested = true;
            this.callbacks.forEach(cb => {
                try {
                    cb();
                } catch (e) {
                    // 忽略回调错误
                }
            });
        }
    }
}
