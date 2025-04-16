import { defineComponent } from "vue";
import FDomainManagement from './components/domain-management';

import './style.css';

export default defineComponent({
    name: 'FADomainLCDP',
    setup() {

        return () => {
            return <FDomainManagement></FDomainManagement>;
        };
    }
});
