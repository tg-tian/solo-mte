import { defineComponent } from "vue";
import FScenarioManagement from './components/scenario-management';

import './style.css';

export default defineComponent({
    name: 'FAScenarioLCDP',
    setup() {

        return () => {
            return <FScenarioManagement></FScenarioManagement>;
        };
    }
});
