/**
 * 代码存储 - 用于增量传输优化
 * 保存上一次发送的代码，只发送差异部分
 */

import { md5Hash, base64Encode } from './utils';

export default class CodeStore {
    public static getInstance(): CodeStore {
        if (this.instance == null) {
            this.instance = new CodeStore();
        }
        return this.instance;
    }

    protected static instance: CodeStore;
    private static readonly CHECK_LENGTH = 800;
    private static readonly REDUNDANCY_LENGTH = 0;

    /**
     * 上次的项目，每次打开新项目的时候清空
     */
    private project = "";

    /**
     * 当前项目各个文件的缓存情况
     */
    private store: { [fileID: string]: string } = {};

    protected constructor() {}

    /**
     * 获得即将发送内容和上次发送内容开始不同的下标
     * 只发送下标往后的部分，下标本身作为offset参数发送
     */
    public getDiffPosition(fileID: string, content: string): number {
        let i = 0;
        if (fileID in this.store) {
            const lastSent = this.store[fileID];
            const initialI = Math.min(
                lastSent.length - CodeStore.CHECK_LENGTH,
                content.length - CodeStore.CHECK_LENGTH
            );
            i = Math.max(0, initialI);
            for (; i < content.length && i < lastSent.length; i++) {
                if (lastSent.charAt(i) !== content.charAt(i)) {
                    break;
                }
            }
        }
        return Math.max(0, i - CodeStore.REDUNDANCY_LENGTH);
    }

    /**
     * 发送成功之后，保存
     */
    public saveLastSent(project: string, fileID: string, content: string) {
        if (this.project == null || this.project !== project) {
            this.project = project;
            this.store = {};
        }
        this.store[fileID] = content;
    }

    /**
     * 删除一个文件的缓存
     */
    public invalidateFile(project: string, fileID: string) {
        if (this.project != null && this.project === project) {
            delete this.store[fileID];
            delete this.store[fileID + ".later"];
        }
    }

    public static md5Hash(s: string): string {
        return md5Hash(s);
    }

    public static base64Encode(s: string): string {
        try {
            const encoded = base64Encode(s);
            const res = encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
            return res.length <= 1024 ? res : '';
        } catch (e) {
            return '';
        }
    }
}
