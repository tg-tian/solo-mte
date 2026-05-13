import { Plugin } from 'vue';
import { default as FXAgentThinking } from './src/agent-thinking.component';
import { default as FXAttachmentFile } from './src/attachment-file.component';
import { default as FXErrorReminder } from './src/error-reminder.component';
import { default as FXInputRecommend } from './src/input-recommend.component';
import { default as FXLinkCard } from './src/link-card.component';
import { default as FXReferenceSources } from './src/reference-sources.component';
import { default as FXUnknownEnterprise } from './src/unknown-enterprise.component';
import { default as FXUserAuth } from './src/user-auth.component';

export { FXAgentThinking, FXAttachmentFile, FXErrorReminder, FXInputRecommend, FXLinkCard, FXReferenceSources, FXUnknownEnterprise, FXUserAuth };
export * from './src/types';
declare const _default: typeof FXAgentThinking & Plugin;
export default _default;
