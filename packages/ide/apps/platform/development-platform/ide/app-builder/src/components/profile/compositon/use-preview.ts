import { FNotifyService } from '@farris/ui-vue';
import { UseStandardPublish } from '../../../../../publish/use-standard-publish.composition';
import { WorkspaceOptions } from '../../../composition/types';

export function UsePreview(publishComposition: UseStandardPublish) {
    const notifyService: any = new FNotifyService();
    notifyService.globalConfig = { position: 'top-center' };

    /**
     * @description 预览
     * @introduction 先执行标准产品发布(编译前后端产物并部署),发布成功后才打开预览页面;
     * 发布失败则保持发布进度面板显示错误信息,不打开预览。
     */
    function preview(options: WorkspaceOptions) {
        publishComposition.startPublish(options.path).then((publishInfo) => {
            if (publishInfo.result) {
                publishComposition.closePanel();
                const appPath = options.path;
                const appId = options.appId;
                const ws = options.workspaceId;
                const previewUrl = `/apps/platform/development-platform/ide/app-preview/index.html?path=${appPath}&appId=${appId}&ws=${ws}`;
                const windowProxy = window.open(previewUrl);
                if (!windowProxy) {
                    notifyService.error('运行失败，请调整浏览器安全设置后重试！');
                }
            }
            // 发布失败:不执行任何操作,面板保持显示错误信息
        });
    }

    return { preview }
}
