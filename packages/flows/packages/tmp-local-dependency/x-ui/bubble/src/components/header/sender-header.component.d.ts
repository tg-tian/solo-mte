import { SetupContext } from 'vue';
import { BubbleProps } from '../../bubble.props';

export default function (props: BubbleProps, context: SetupContext): {
    renderHeader: () => import("vue/jsx-runtime").JSX.Element;
};
