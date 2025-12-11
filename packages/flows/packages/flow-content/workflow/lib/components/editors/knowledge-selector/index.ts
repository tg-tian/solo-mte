import KnowledgeSelectorInstallless from './src/knowledge-selector.component.tsx';
import { propsResolver } from './src/knowledge-selector.props.ts';
import { withInstall, withRegister } from '@farris/flow-devkit';

const KNOWLEDGE_SELECTOR_NAME = 'knowledge-selector';

const KnowledgeSelector = withInstall(KnowledgeSelectorInstallless);
withRegister(KnowledgeSelector, { name: KNOWLEDGE_SELECTOR_NAME, propsResolver });

export { KnowledgeSelector };
export default KnowledgeSelector;
