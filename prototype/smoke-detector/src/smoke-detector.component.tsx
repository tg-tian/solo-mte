import { SetupContext, computed, defineComponent, ref, watch } from 'vue';
import { SmokeDetectorProps, smokeDetectorProps } from './smoke-detector.props';
import './smoke-detector.css';

export default defineComponent({
    name: 'FSmokeDetector',
    props: smokeDetectorProps,
    emits: [''],
    setup(props: SmokeDetectorProps, context: SetupContext) {

        return () => {
            return (
                <div class='f-smoke-detector'>
                    <img src='/components/smoke-detector/src/image/smoke-detector-2.png'></img>
                </div>
            );
        };
    }
});
