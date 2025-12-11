import { ref } from 'vue';

const shouldShowCanvasMask = ref<boolean>(false);
const maskOpacity = ref<number>(1);

export function useCanvasMask() {

    function show(opacity: number = 0.5): void {
        opacity = opacity ?? 1;
        maskOpacity.value = opacity;
        shouldShowCanvasMask.value = true;
    }

    function hide(): void {
        maskOpacity.value = 1;
        shouldShowCanvasMask.value = false;
    }

    return {
        shouldShowCanvasMask,
        maskOpacity,
        show,
        hide,
    };
}
