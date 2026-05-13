import { Attachment } from '../../composition/types';

export interface BubbleAttachmentOptions {
    attachments: Attachment[];
    onItemClick?: (attachment: Attachment) => void;
}
export default function (options: BubbleAttachmentOptions): {
    renderAttachments: () => import("vue/jsx-runtime").JSX.Element | null;
    getFileIcon: (type: string) => string;
    formatFileSize: (size: number) => string;
};
