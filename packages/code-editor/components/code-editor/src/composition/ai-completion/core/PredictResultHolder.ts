/**
 * 预测结果持有者
 * 管理预测结果的状态和展示
 */

export enum ResultType {
    CACHE,
    PREDICTING,
    PREDICTED,
    NONE,
    ERROR
}

export enum ResultStatus {
    NONE,
    CACHE,
    PREDICTING,
    PREDICTED
}

export type PredictMode = "short" | "long" | "full" | "only_single_line";

export default class PredictResultHolder {
    resultType: ResultType = ResultType.NONE;
    resultStr: string = "";
    lastPos: number = 0;
    end_by: string = "";
    position: string = "";
    hasPredictingError: boolean = false;
    forword: number = 0;
    backward: number = 0;
    private modeLength: Record<PredictMode, number> = {
        "short": 96,
        "long": 192,
        "full": 96,
        "only_single_line": 96
    };

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.lastPos = 0;
        this.resultStr = '';
        this.resultType = ResultType.NONE;
        this.end_by = '';
        this.hasPredictingError = false;
        this.forword = 0;
        this.backward = 0;
    }

    public setResult(
        resultType: ResultType,
        resultStr: string,
        position: string = "",
        end_by: string | undefined = undefined,
        forword: number = 0,
        backward: number = 0
    ): void {
        this.resultType = resultType;
        this.resultStr = resultStr;
        this.position = position;
        this.end_by = end_by ?? "";
        this.forword = forword;
        this.backward = backward;
    }

    public getHasAppliedFragment(): string {
        return this.resultStr.substring(0, this.lastPos);
    }

    /**
     * 返回自上次补全之后生成的内容
     */
    public getFragmentFromLastPos(): string {
        if (this.resultStr.length > this.lastPos) {
            return this.resultStr.substring(this.lastPos);
        } else {
            return "";
        }
    }

    /**
     * 是否生成的内容已足够可以展示给用户
     */
    public isEnoughToShow(mode: PredictMode): boolean {
        if (this.resultType === ResultType.PREDICTED) {
            return true;
        } else {
            const newGen = this.getFragmentFromLastPos();
            const showLen = this.modeLength[mode];
            if (
                newGen.length > showLen &&
                (newGen.lastIndexOf('\n') > showLen || newGen.lastIndexOf('\r') > showLen)
            ) {
                return true;
            }
        }
        return false;
    }

    public getMaxFragmentToShow(mode: PredictMode): string {
        let newGen = this.getFragmentFromLastPos();
        if (this.resultType === ResultType.PREDICTING) {
            let endIndex = newGen.indexOf('\n');
            while (endIndex < this.modeLength[mode] && endIndex >= 0) {
                endIndex = newGen.indexOf('\n', endIndex + 1);
            }
            if (endIndex < 0) {
                endIndex = newGen.length;
            }
            if (endIndex > 0) {
                newGen = newGen.substring(0, endIndex);
                this.lastPos += endIndex;
            }
        } else if (this.resultType === ResultType.PREDICTED) {
            this.lastPos = this.resultStr.length;
        }
        return newGen;
    }
}

export const predictResultHolder = new PredictResultHolder();
