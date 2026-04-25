/** 附件文件类型 */
export interface AttachmentFile {
    /** 文件唯一标识 */
    id: string;
    /** 文件名 */
    name: string;
    /** 文件大小（字节） */
    size: number;
    /** 文件类型*/
    type: string;
    /** 文件预览 URL（图片类型可用） */
    previewUrl?: string;
    /** 原始 File 对象 */
    file: File;
    /** 上传状态：pending-待上传, uploading-上传中, done-已完成, error-上传失败 */
    status?: 'pending' | 'uploading' | 'done' | 'error';
    /** 上传进度（0-100） */
    progress?: number;
    /** 是否为图片类型 */
    isImage?: boolean;
}
export declare function useAttachmentComponent(): {
    attachments: import('vue').Ref<{
        id: string;
        name: string;
        size: number;
        type: string;
        previewUrl?: string | undefined;
        file: {
            readonly lastModified: number;
            readonly name: string;
            readonly webkitRelativePath: string;
            readonly size: number;
            readonly type: string;
            arrayBuffer: () => Promise<ArrayBuffer>;
            bytes: () => Promise<Uint8Array<ArrayBuffer>>;
            slice: (start?: number, end?: number, contentType?: string) => Blob;
            stream: () => ReadableStream<Uint8Array<ArrayBuffer>>;
            text: () => Promise<string>;
        };
        status?: "pending" | "uploading" | "done" | "error" | undefined;
        progress?: number | undefined;
        isImage?: boolean | undefined;
    }[], AttachmentFile[] | {
        id: string;
        name: string;
        size: number;
        type: string;
        previewUrl?: string | undefined;
        file: {
            readonly lastModified: number;
            readonly name: string;
            readonly webkitRelativePath: string;
            readonly size: number;
            readonly type: string;
            arrayBuffer: () => Promise<ArrayBuffer>;
            bytes: () => Promise<Uint8Array<ArrayBuffer>>;
            slice: (start?: number, end?: number, contentType?: string) => Blob;
            stream: () => ReadableStream<Uint8Array<ArrayBuffer>>;
            text: () => Promise<string>;
        };
        status?: "pending" | "uploading" | "done" | "error" | undefined;
        progress?: number | undefined;
        isImage?: boolean | undefined;
    }[]>;
    isDragging: import('vue').Ref<boolean, boolean>;
    dragCounter: import('vue').Ref<number, number>;
    triggerFileInput: () => void;
    handleFileChange: (event: Event) => void;
    handleDragEnter: (event: DragEvent) => void;
    handleDragLeave: (event: DragEvent) => void;
    handleDragOver: (event: DragEvent) => void;
    handleDrop: (event: DragEvent) => void;
    renderAttachments: () => import("vue/jsx-runtime").JSX.Element;
    renderToast: () => false | import("vue/jsx-runtime").JSX.Element;
};
