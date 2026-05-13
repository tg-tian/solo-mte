import { CarouselItemType } from './type';

export interface UseCarouselOptions {
    items: CarouselItemType[];
    autoplay?: boolean;
    interval?: number;
    loop?: boolean;
    direction?: 'horizontal' | 'vertical';
}
export default function useCarousel(options: UseCarouselOptions): {
    currentIndex: import('vue').Ref<number, number>;
    totalItems: import('vue').ComputedRef<number>;
    isSingleItem: import('vue').ComputedRef<boolean>;
    trackStyle: import('vue').ComputedRef<{
        transform: string;
        transition: string;
    }>;
    goTo: (index: number) => void;
    next: () => void;
    prev: () => void;
    handleMouseEnter: () => void;
    handleMouseLeave: () => void;
};
