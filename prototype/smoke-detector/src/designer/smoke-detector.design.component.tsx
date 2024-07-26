import { SetupContext, computed, defineComponent, ref, watch, inject, onMounted } from 'vue';
import { SmokeDetectorProps, smokeDetectorProps } from '../smoke-detector.props';
import { DesignerItemContext } from '../../../designer-canvas/src/types';
import { useDesignerComponent } from '../../../designer-canvas/src/composition/function/use-designer-component';

import '../smoke-detector.css';

export default defineComponent({
    name: 'FSmokeDetectorDesign',
    props: smokeDetectorProps,
    emits: [''],
    setup(props: SmokeDetectorProps, context: SetupContext) {
        const elementRef = ref();
        const designItemContext = inject<DesignerItemContext>('design-item-context') as DesignerItemContext;
        const componentInstance = useDesignerComponent(elementRef, designItemContext);

        onMounted(() => {
            elementRef.value.componentInstance = componentInstance;
        });

        context.expose(componentInstance.value);
        return () => {
            return (
                <div ref={elementRef} class='f-smoke-detector'>
                    <img src='/components/smoke-detector/src/image/smoke-detector-2.png'></img>
                </div>
            );
        };
    }
});
