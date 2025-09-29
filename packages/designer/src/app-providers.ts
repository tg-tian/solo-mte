
import { App } from "vue";
import { FLoadingService, FTooltipDirective, FMessageBoxService, F_MODAL_SERVICE_TOKEN, FModalService, LookupSchemaRepositoryToken, FieldSelectorRepositoryToken, F_NOTIFY_SERVICE_TOKEN, FNotifyService, ControllerSchemaRepositorySymbol, FormSchemaRepositorySymbol } from "@farris/ui-vue";
// import { LookupSchemaRepositoryToken as MobileLookupSchemaRepositoryToken, FieldSelectorRepositoryToken as MobileFieldSelectorRepositoryToken } from "@farris/mobile-ui-vue";
import { MetadataService } from "./components/composition/metadata.service";
import { MetadataPathToken, MetadataServiceToken } from "./components/types";
import { LookupFieldSelectorService, LookupSchemaService } from "./components/composition/schema-repository";
import { ControllerSelectorSchemaService } from "./components/composition/schema-repository/controller/controller-selector.service";
import { FormSelectorSchemaService } from "./components/composition/schema-repository/form/form-selector.service";
import { useDesignerContext } from "./components/composition/designer-context/use-designer-context";

const designerContext = useDesignerContext();

export default {
    install(app: App): void {
        app.provide('designerContext', designerContext);
        app.provide(F_MODAL_SERVICE_TOKEN, new FModalService(app));
        app.provide('FLoadingService', FLoadingService);

        const metadataService = new MetadataService();
        app.provide(MetadataServiceToken, metadataService);

        const metadataPath = metadataService.getMetadataPath();
        app.provide(MetadataPathToken, metadataPath);
        
        FMessageBoxService.app = app;
        app.provide('FMessageBoxService', FMessageBoxService);

        app.provide(LookupSchemaRepositoryToken, new LookupSchemaService(metadataService));
        app.provide(FieldSelectorRepositoryToken, new LookupFieldSelectorService(metadataService));
        // app.provide(MobileLookupSchemaRepositoryToken, new LookupSchemaService(metadataService));
        // app.provide(MobileFieldSelectorRepositoryToken, new LookupFieldSelectorService(metadataService));
        app.provide(F_NOTIFY_SERVICE_TOKEN, new FNotifyService());
        app.provide(ControllerSchemaRepositorySymbol, new ControllerSelectorSchemaService(metadataService,designerContext));
        app.provide(FormSchemaRepositorySymbol, new FormSelectorSchemaService(metadataService));

        app.directive('tooltip', FTooltipDirective);
    }
};
