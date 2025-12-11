import AvatarUploadInstallless from './src/avatar-upload.component';
import { propsResolver } from './src/avatar-upload.props';
import { withInstall, withRegister } from '@farris/flow-devkit/types';

const COMPONENT_NAME = 'fvf-avatar-upload';

const AvatarUpload = withInstall(AvatarUploadInstallless);
withRegister(AvatarUpload, { name: COMPONENT_NAME, propsResolver });

export { AvatarUpload };
export default AvatarUpload;
