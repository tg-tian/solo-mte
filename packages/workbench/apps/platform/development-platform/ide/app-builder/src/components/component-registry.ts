import FAppAnalysis from './analysis/analysis.component';
import FAppMenu from './menu/menu.component';
import FAppVariables from './variables/variables.component';
import FAppProfile from './profile/profile.component';

const componentRegistryMap = new Map<string, any>(
    [['menu', FAppMenu], ['variables', FAppVariables], ['profile', FAppProfile], ['analysis', FAppAnalysis]]
);

export default componentRegistryMap;
