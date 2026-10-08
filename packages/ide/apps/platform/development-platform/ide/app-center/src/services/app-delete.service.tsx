import axios from 'axios';

export class AppDeleteService {
    public notifyService: any;

    constructor(notifyService: any) {
        this.notifyService = notifyService;
    }

    async deleteBusinessObject(boId: string): Promise<boolean> {
        try {
            await axios.delete(`/api/runtime/sys/v1.0/business-objects/${boId}`);
            this.notifyService.success({ message: '删除成功' });
            return true;
        } catch (e: any) {
            const errMsg = e?.response?.data?.Message || e?.response?.data?.error || '删除失败';
            this.notifyService.error({ message: errMsg });
            return false;
        }
    }

    async deleteApp(path: string, boId: string): Promise<boolean> {
        try {
            const res = await axios.post('/solo-mte-publish/delete-app',
                { path, boId },
                { withCredentials: true }
            );
            if (res.data?.ok) {
                this.notifyService.success({ message: '应用已删除' });
                return true;
            } else {
                this.notifyService.error({ message: res.data?.error || '删除应用失败' });
                return false;
            }
        } catch (e: any) {
            const errMsg = e?.response?.data?.error || '删除应用失败';
            this.notifyService.error({ message: errMsg });
            return false;
        }
    }
}
