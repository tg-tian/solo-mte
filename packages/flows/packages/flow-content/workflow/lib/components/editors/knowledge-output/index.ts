import KnowledgeOutputInstallless from './src/knowledge-output.component.tsx';
import { propsResolver } from './src/knowledge-output.props.ts';
import { withInstall, withRegister } from '@farris/flow-devkit';

const KNOWLEDGE_OUTPUT_NAME = 'knowledge-output';

const KnowledgeOutput = withInstall(KnowledgeOutputInstallless);
withRegister(KnowledgeOutput, { name: KNOWLEDGE_OUTPUT_NAME, propsResolver });

export { KnowledgeOutput };
export default KnowledgeOutput;
