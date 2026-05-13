import { Attachment } from './types';

export interface UseAttachmentOptions {
    attachments: Attachment[];
}
export default function useAttachment(options: UseAttachmentOptions): {
    hasAttachments: import('vue').ComputedRef<boolean>;
    attachmentCount: import('vue').ComputedRef<number>;
    getFileIcon: (type: string) => string;
    formatFileName: (name: string) => string;
    formatFileSize: (size: number) => string;
};
