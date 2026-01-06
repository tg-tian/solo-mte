import { UseFunctionInstance, UseWorkspace, WorkspaceOptions } from "./types";
import axios from "axios";

export function useWorkspace(useFunctionInstanceComposition: UseFunctionInstance): UseWorkspace {
    const options: WorkspaceOptions = {
        path: '',
        appId: '',
        appCode: '',
        appName: '',
        boId: '',
        workspaceId: '',
        version: '',
    };

    function initialize() {
        return new Promise<WorkspaceOptions>((resolve, reject) => {
            const queryParams = new URLSearchParams(window.location.search);
            options.path = queryParams.get('path') || '';
            options.appId = queryParams.get('boId') || '';
            options.boId = queryParams.get('boId') || '';
            options.workspaceId = queryParams.get('ws') || '';
            const resourceUri = `/api/runtime/sys/v1.0/business-objects/${options.boId}`;
            axios.get(resourceUri).then((response) => {
                const resourceData = response.data as Record<string, any>;
                const { code, name } = resourceData;
                options.appCode = code;
                options.appName = name;
                resolve(options);
            });
        });
    }

    function open(path: string) {
        useFunctionInstanceComposition.openFile(path);
    }

    return { options, initialize, open };
}   