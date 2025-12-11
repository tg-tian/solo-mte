import ValueExpressionInputInstallless from './src/value-expression-input.component';
import { withInstall, withRegister } from '@farris/flow-devkit/types';
import { propsResolver } from './src/value-expression-input.props';
import { useValueExpression } from './src/composition/use-value-expression';

const COMPONENT_NAME = 'fvf-value-expression-input';

const ValueExpressionInput = withInstall(ValueExpressionInputInstallless);
withRegister(ValueExpressionInput, { name: COMPONENT_NAME, propsResolver });

export {
    ValueExpressionInput,
    useValueExpression,
};
export default ValueExpressionInput;
