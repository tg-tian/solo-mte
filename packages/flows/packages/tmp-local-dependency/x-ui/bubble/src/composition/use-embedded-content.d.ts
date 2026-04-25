import { VNode } from 'vue';
import { Attachment, EmbeddedContent } from './types';

export interface EmbeddedContentRenderContext {
    onClickFile?: (attachment: Attachment) => void;
    onNavigate?: (url: string) => void;
}
export default function useEmbeddedContent(): {
    renderFileEmbeddedContent: (content: EmbeddedContent, context: EmbeddedContentRenderContext) => VNode;
    renderPageEmbeddedContent: (content: EmbeddedContent, context: EmbeddedContentRenderContext) => VNode;
};
