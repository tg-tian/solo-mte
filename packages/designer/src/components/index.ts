 
import type { App } from 'vue';
import Designer from './designer.component';

export * from './designer.props';

export default {
    install(app: App): void {
        app.component(Designer.name as string, Designer);
    }
};
