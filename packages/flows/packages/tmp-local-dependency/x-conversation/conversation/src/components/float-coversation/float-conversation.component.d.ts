import { Message } from '../../conversation.props';

declare const _default: import('vue').DefineComponent<{
    messages: Message[];
    preview?: ((config: import('node_modules/@farris/x-ui/components').PreviewConfig) => void) | undefined;
    loadThink?: ((control: import('node_modules/@farris/x-ui/components').ThinkControl, messageId: string) => void) | undefined;
    loadThoughtChain?: ((control: import('node_modules/@farris/x-ui/components').ThoughtChainControl, messageId: string) => void) | undefined;
    confirmUserAuth?: ((optionId: string, name: string, message: string, messageId: string) => void) | undefined;
}, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<{
    messages: Message[];
    preview?: ((config: import('node_modules/@farris/x-ui/components').PreviewConfig) => void) | undefined;
    loadThink?: ((control: import('node_modules/@farris/x-ui/components').ThinkControl, messageId: string) => void) | undefined;
    loadThoughtChain?: ((control: import('node_modules/@farris/x-ui/components').ThoughtChainControl, messageId: string) => void) | undefined;
    confirmUserAuth?: ((optionId: string, name: string, message: string, messageId: string) => void) | undefined;
}> & Readonly<{}>, {
    messages: Message[];
    preview: (config: import('node_modules/@farris/x-ui/components').PreviewConfig) => void;
    loadThink: (control: import('node_modules/@farris/x-ui/components').ThinkControl, messageId: string) => void;
    loadThoughtChain: (control: import('node_modules/@farris/x-ui/components').ThoughtChainControl, messageId: string) => void;
    confirmUserAuth: (optionId: string, name: string, message: string, messageId: string) => void;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
export default _default;
