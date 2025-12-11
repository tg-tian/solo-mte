import { inject } from 'vue';

export function useMessageBox() {
    const messageBoxService = inject<any>('FMessageBoxService')!;

    function info(message: string, detail?: string): void {
        messageBoxService.info(message, detail);
    }

    function warning(message: string, detail?: string): void {
        messageBoxService.warning(message, detail);
    }

    function success(message: string, detail?: string): void {
        messageBoxService.success(message, detail);
    }

    function error(message: string, detail?: string, date?: string): void {
        messageBoxService.error(message, detail, date);
    }

    function prompt(message: string, detail?: string): void {
        messageBoxService.prompt(message, detail);
    }

    return {
        info,
        warning,
        success,
        error,
        prompt,
    };
}
