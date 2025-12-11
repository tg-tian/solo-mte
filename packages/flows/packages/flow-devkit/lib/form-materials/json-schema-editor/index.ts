import JsonSchemaEditorInstallless from './src/json-schema-editor.component';
import { propsResolver } from './src/json-schema-editor.props';
import { withInstall, withRegister } from '@farris/flow-devkit/types';

const COMPONENT_NAME = 'fvf-json-schema-editor';

const JsonSchemaEditor = withInstall(JsonSchemaEditorInstallless);
withRegister(JsonSchemaEditor, { name: COMPONENT_NAME, propsResolver });

export { JsonSchemaEditor };
export default JsonSchemaEditor;
