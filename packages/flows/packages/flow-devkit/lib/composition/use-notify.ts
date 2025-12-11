import { inject } from 'vue';
import { type FNotifyService, F_NOTIFY_SERVICE_TOKEN } from '@farris/ui-vue';

export function useNotify() {
    const notifyService = inject<FNotifyService>(F_NOTIFY_SERVICE_TOKEN);

    const defaultOptions = {
        position: 'top-center',
        showCloseButton: true,
        timeout: 2000,
    };

    function getOptions(message: string, options?: any): any {
        return {
            ...defaultOptions,
            ...options,
            message,
        };
    }

    function success(message: string, options?: any) {
        return notifyService?.success(getOptions(message, options));
    }

    function error(message: string, options?: any) {
        return notifyService?.error(getOptions(message, options));
    }

    function warning(message: string, options?: any) {
        return notifyService?.warning(getOptions(message, options));
    }

    function info(message: string, options?: any) {
        return notifyService?.info(getOptions(message, options));
    }

    return {
        success,
        error,
        warning,
        info,
    };
}
