/**
 * 工具函数
 */

/**
 * 反转字符串
 */
export function reverseString(str: string): string {
    let newString = "";
    for (let i = str.length - 1; i >= 0; i--) {
        newString += str[i];
    }
    return newString;
}

/**
 * 检查是否在回车后创建
 */
export function isCreateAfterEnter(
    position: { line: number; character: number },
    beforeCode: string
): boolean {
    const offset = beforeCode.length - position.character;
    if (offset <= 0) {
        return false;
    }
    const charBefore = beforeCode[offset - 1];
    return charBefore === '\n' || charBefore === '\r';
}

/**
 * Base64 编码
 */
export function base64Encode(str: string): string {
    if (typeof btoa !== 'undefined') {
        return btoa(unescape(encodeURIComponent(str)));
    }
    // Node.js 环境
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'utf-8').toString('base64');
    }
    // 降级方案
    return str;
}

/**
 * MD5 哈希（使用 crypto-js）
 */
export function md5Hash(str: string): string {
    try {
        // 尝试使用 crypto-js
        if (typeof window !== 'undefined' && (window as any).CryptoJS) {
            return (window as any).CryptoJS.MD5(str).toString();
        }
        // Node.js 环境
        if (typeof require !== 'undefined') {
            const CryptoJS = require('crypto-js');
            return CryptoJS.MD5(str).toString();
        }
        // ES6 import (如果支持)
        // import CryptoJS from 'crypto-js';
        // return CryptoJS.MD5(str).toString();
    } catch (e) {
        // 静默处理，使用降级方案
    }
    
    // 降级方案：使用简单的哈希（仅用于开发环境）
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}
