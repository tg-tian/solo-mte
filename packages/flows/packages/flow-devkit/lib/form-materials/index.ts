import { registerCustomComponents } from '@farris/flow-devkit/utils';
import { NodeHeader } from './node-header';
import { JsonSchemaEditor } from './json-schema-editor';
import { InputParams } from './input-params';
import { AvatarUpload } from './avatar-upload';
import { BranchEditor } from './branch-editor';
import { ValueExpressionInput, useValueExpression } from './value-expression-input';
import { VariableAssignEditor } from './variable-assign-editor';

/**
 * @description
 * 对于需要在属性面板中作为属性编辑器使用的组件，需要在此处注册
 */
registerCustomComponents([
    NodeHeader,
    JsonSchemaEditor,
    InputParams,
    AvatarUpload,
    BranchEditor,
    ValueExpressionInput,
    VariableAssignEditor,
]);

export {
    NodeHeader,
    JsonSchemaEditor,
    InputParams,
    AvatarUpload,
    BranchEditor,
    ValueExpressionInput,
    VariableAssignEditor,

    useValueExpression,
};

export * from './node-wrapper';
export * from './type-selector';
export * from './param-tag-list';
export * from './node-content-wrapper';
export * from './node-field';
export * from './condition-row';
export * from './condition-editor';
export * from './selector-branches';
export * from './single-param-value-tag';
export * from './variable-assign-list';
