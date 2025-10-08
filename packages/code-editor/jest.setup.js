import { config } from '@vue/test-utils';

import ButtonEdit from './components/button-edit/src/button-edit.component';

config.global.components = {
    'f-button-edit': ButtonEdit
};
