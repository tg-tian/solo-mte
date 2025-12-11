import SystemPromptEditorInstallless from './src/system-prompt-editor.component';
import { propsResolver } from './src/system-prompt-editor.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const SYSTEM_PROMPT_EDITOR_NAME = 'system-prompt-editor';

const SystemPromptEditor = withInstall(SystemPromptEditorInstallless);
withRegister(SystemPromptEditor, { name: SYSTEM_PROMPT_EDITOR_NAME, propsResolver });

export { SystemPromptEditor };
export default SystemPromptEditor;
