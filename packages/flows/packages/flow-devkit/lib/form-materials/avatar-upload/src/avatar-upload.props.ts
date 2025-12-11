import type { ExtractPropTypes } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import avatarUploadSchema from './schema/avatar-upload.schema.json';

export const avatarUploadProps = {

    /** 绑定值，头像信息 */
    modelValue: { type: Object },
};

export type AvatarUploadProps = ExtractPropTypes<typeof avatarUploadProps>;

export const propsResolver = createPropsResolver(avatarUploadProps, avatarUploadSchema);
