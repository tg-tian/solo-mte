import { defineComponent, computed, ref } from 'vue';
import { avatarUploadProps } from './avatar-upload.props';
import { useBem } from '@farris/flow-devkit/utils';

import './avatar-upload.scss';

const name = 'FvfAvatarUpload';

export default defineComponent({
  name,
  props: avatarUploadProps,
  emits: ['update:modelValue'],
  setup(props, context) {
    const { bem } = useBem(name);
    const fileInputRef = ref<HTMLInputElement | null>(null);

    // 处理头像信息（确保存在path字段，避免渲染错误）
    const avatarInfo = computed(() => {
      return props.modelValue || { path: '' };
    });

    // 允许的图片类型（覆盖所有常见图片格式）
    const fileType = 'image/jpeg, image/png, image/gif, image/bmp, image/webp, image/svg+xml';

    // 通知父组件更新数据
    const emitChange = (newInfo: { path: string; file: File }) => {
      context.emit('update:modelValue', newInfo);
    };

    // 处理文件选择逻辑
    const handleFileSelect = (event: Event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;

      // 验证是否为图片类型
      if (!file.type.startsWith('image/')) {
        console.warn('请选择图片文件（支持jpg、png、gif等格式）');
        input.value = ''; // 清空选择，允许重新选择
        return;
      }

      // 读取文件并生成预览地址
      const reader = new FileReader();
      reader.onload = (e) => {
        emitChange({
          path: e.target?.result as string,
          file: file
        });
        input.value = ''; // 允许重复选择同一文件
      };
      reader.readAsDataURL(file);
    };

    // 渲染上传区域
    const renderUploadButton = () => (
      <div
        class={bem('avatar-upload-wrapper')}
        // onClick={triggerFileSelect}
        role="button"
        aria-label="上传头像"
      >
        {/* 上传后显示图片 */}
        {avatarInfo.value.path && (
          <img
            src={avatarInfo.value.path}
            alt="头像"
            // 图片加载失败时显示默认图标
            onError={(e: Event) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        {/* 上传前显示+图标（图片不存在时显示） */}
        {!avatarInfo.value.path && (
          <div>
            <i class="f-icon f-icon-add"></i>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={fileType}
        />
      </div>
    );

    return () => (
      <div class={bem()}>
        {renderUploadButton()}
      </div>
    );
  },
});
