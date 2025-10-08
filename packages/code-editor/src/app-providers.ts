
import { FLoadingService } from "@farris/ui-vue";
import { FMessageBoxService } from "@farris/ui-vue";
import { App } from "vue";
import { F_MODAL_SERVICE_TOKEN, FModalService } from "@farris/ui-vue";
import { FTooltipDirective } from "@farris/ui-vue";
import { F_NOTIFY_SERVICE_TOKEN, FNotifyService } from "@farris/ui-vue";

export default {
    install(app: App): void {
        app.provide(F_MODAL_SERVICE_TOKEN, new FModalService(app));
        app.provide('FLoadingService', FLoadingService);
        app.provide('FMessageBoxService', FMessageBoxService);
        app.provide(F_NOTIFY_SERVICE_TOKEN, new FNotifyService());
        app.directive('tooltip', FTooltipDirective);
    }
};
