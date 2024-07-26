/* eslint-disable max-len */
import type { App } from 'vue';
import SmokeDetector from './src/smoke-detector.component';
import { propsResolver } from './src/smoke-detector.props';
import FSmokeDetectorDesign from './src/designer/smoke-detector.design.component';

export * from './src/smoke-detector.props';

export { SmokeDetector };

export default {
    install(app: App): void {
        app.component(SmokeDetector.name as string, SmokeDetector);
    },
    register(componentMap: Record<string, any>, propsResolverMap: Record<string, any>, configResolverMap: Record<string, any>): void {
        componentMap['smoke-detector'] = SmokeDetector;
        propsResolverMap['smoke-detector'] = propsResolver;
    },
    registerDesigner(componentMap: Record<string, any>, propsResolverMap: Record<string, any>, configResolverMap: Record<string, any>): void {
        componentMap['smoke-detector'] = FSmokeDetectorDesign;
        propsResolverMap['smoke-detector'] = propsResolver;
    }
};
