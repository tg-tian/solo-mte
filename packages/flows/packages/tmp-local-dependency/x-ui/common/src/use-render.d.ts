import { VNode } from 'vue';

export declare function renderNode(node: string | VNode | undefined): string | VNode<import('vue').RendererNode, import('vue').RendererElement, {
    [key: string]: any;
}> | null;
/**
 * 判断是否为图片 URL
 */
export declare function isImageUrl(url: string): boolean;
/**
 * 专门用于渲染图标的函数（增强版）
 */
export declare function renderIconNode(icon: string | VNode | undefined): string | VNode<import('vue').RendererNode, import('vue').RendererElement, {
    [key: string]: any;
}> | null;
