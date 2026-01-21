/**
 * 预测缓存
 * 缓存最近的预测结果，提高响应速度
 */

const MAX_CAPACITY = 10;
let CUR_POS_INDEX = 0;

class CacheItem {
    // 预测的标识
    beforeCode: string = '';
    laterCode: string = '';
    // 预测结果
    predictText: string = '';
    forword: number = 0;
    backward: number = 0;

    constructor(
        fileId: string,
        beforeCode: string,
        laterCode: string,
        predictTextStr: string,
        forword: number,
        backward: number
    ) {
        this.beforeCode = beforeCode;
        this.laterCode = laterCode;
        this.predictText = predictTextStr;
        this.forword = forword;
        this.backward = backward;
    }

    clearCache() {
        this.beforeCode = '';
        this.laterCode = '';
        this.predictText = '';
    }
}

export default class PredictCache {
    fileId: string | null = null;
    cacheItemList: CacheItem[];

    constructor() {
        this.cacheItemList = new Array(MAX_CAPACITY);
    }

    checkInCacheItem(fileID: string, beforeCode: string, laterCode: string) {
        let insertText = "";
        const res = {
            insertText: insertText,
            isFull: false,
            forword: 0,
            backward: 0
        };

        if (this.fileId !== fileID) {
            this.cacheItemList = new Array(MAX_CAPACITY);
            return res;
        }

        let cacheItem: CacheItem;
        for (const ind in this.cacheItemList) {
            cacheItem = this.cacheItemList[ind];
            if (
                cacheItem &&
                cacheItem.predictText.trim() &&
                beforeCode.length >= cacheItem.beforeCode.length &&
                (cacheItem.beforeCode + cacheItem.predictText).startsWith(beforeCode) &&
                laterCode.length >= cacheItem.laterCode.length &&
                laterCode === cacheItem.laterCode
            ) {
                const startIndex = beforeCode.length - cacheItem.beforeCode.length;
                const endIndex = laterCode.length - cacheItem.laterCode.length;
                if (endIndex > 0 && cacheItem.predictText.endsWith(laterCode.substring(0, endIndex))) {
                    insertText = cacheItem.predictText.substring(
                        startIndex,
                        cacheItem.predictText.length - endIndex
                    );
                } else {
                    insertText = cacheItem.predictText.substring(startIndex);
                }
                if (insertText.trim()) {
                    if (insertText === cacheItem.predictText) {
                        res.isFull = true;
                    }
                    res.forword = cacheItem.forword;
                    res.backward = cacheItem.backward;
                    break;
                }
            }
        }
        res.insertText = insertText;
        return res;
    }

    putToCacheItem(
        fileID: string,
        beforeCode: string,
        laterCode: string,
        predictText: string,
        forword: number = 0,
        backward: number = 0
    ) {
        this.fileId = fileID;
        this.cacheItemList[CUR_POS_INDEX] = new CacheItem(
            fileID,
            beforeCode,
            laterCode,
            predictText,
            forword,
            backward
        );
        CUR_POS_INDEX = (CUR_POS_INDEX + 1) % MAX_CAPACITY;
    }
}

export const predictCache = new PredictCache();
