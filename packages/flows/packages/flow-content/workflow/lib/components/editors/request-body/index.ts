import { withRegister, withInstall } from '@farris/flow-devkit';
import Component from './src/request-body.component';
import { requestBodyProps, propsResolver, type RequestBodyProps } from './src/request-body.props';

const REQUEST_BODY_NAME = 'request-body';

const RequestBodyInstallless = Component;

const RequestBody = withInstall(RequestBodyInstallless);

withRegister(RequestBody, {
  name: REQUEST_BODY_NAME,
  propsResolver
});

export { RequestBodyInstallless, RequestBody };
export default RequestBody;