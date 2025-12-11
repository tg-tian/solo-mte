import RpcFormEditorInstallless from './src/rpc-form-editor.component';
import { propsResolver } from './src/rpc-form-editor.props';
import { withInstall, withRegister } from '@farris/flow-devkit';

const COMPONENT_NAME = 'fvf-rpc-form-editor';

const RpcFormEditor = withInstall(RpcFormEditorInstallless);
withRegister(RpcFormEditor, { name: COMPONENT_NAME, propsResolver });

export { RpcFormEditor };
export default RpcFormEditor;