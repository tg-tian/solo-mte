import UserPromptEditorInstallless from './src/user-prompt-editor.component';
import { propsResolver } from './src/user-prompt-editor.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const USER_PROMPT_EDITOR_NAME = 'user-prompt-editor';

const UserPromptEditor = withInstall(UserPromptEditorInstallless);
withRegister(UserPromptEditor, { name: USER_PROMPT_EDITOR_NAME, propsResolver });

export { UserPromptEditor };
export default UserPromptEditor;