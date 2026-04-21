import { Plugin } from 'vue';
import { default as FXCarousel } from './src/carousel.component';
import { default as FXCarouselItem } from './src/components/carousel-item.component';

export * from './src/carousel.props';
export * from './src/components/carousel-item.props';
export * from './src/composition/type';
export { FXCarousel, FXCarouselItem };
declare const _default: typeof FXCarousel & Plugin;
export default _default;
