import FAppAnalysis from './analysis/analysis.component';
import FAppMenu from './menu/menu.component';
import FAppVariables from './variables/variables.component';
import FAppProfile from './profile/profile.component';
import FAppDevices from './devices/devices.component';
import FAppPages from './pages/pages.component';
import FAppPageFlows from './page-flow/page-flow.component';
import FAppLogicFlows from './logic-flow/logic-flow.component';

const componentRegistryMap = new Map<string, any>(
    [['menu', FAppMenu], ['variables', FAppVariables], ['profile', FAppProfile], ['analysis', FAppAnalysis], ['devices', FAppDevices], ['pages', FAppPages], ['page-flow', FAppPageFlows], ['logic-flow', FAppLogicFlows]]
);

export default componentRegistryMap;
