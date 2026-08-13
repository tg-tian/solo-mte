import { UseFunctionInstance, UseWorkspace, WorkspaceOptions } from "./types";
import axios from "axios";

export function useWorkspace(useFunctionInstanceComposition: UseFunctionInstance): UseWorkspace {
    const workspaceUri = '/api/dev/main/v1.0/ws';


    const options: WorkspaceOptions = {
        path: '',
        appId: '',
        appCode: '',
        appName: '',
        boId: '',
        workspaceId: '',
        version: '',
        location: ''
    };

    function initialize() {
        return new Promise<WorkspaceOptions>((resolve, reject) => {
            const queryParams = new URLSearchParams(window.location.search);
            options.path = queryParams.get('path') || '';
            options.appId = queryParams.get('boId') || '';
            options.boId = queryParams.get('boId') || '';
            options.workspaceId = queryParams.get('ws') || '';
            const resourceUri = `/api/runtime/sys/v1.0/business-objects/${options.boId}`;
            axios.get(resourceUri).then(async (response) => {
                const resourceData = response.data as Record<string, any>;
                const { code, name } = resourceData;
                options.appCode = code;
                options.appName = name;
                if(options.workspaceId) {
                    const wsResponse = await axios.get(workspaceUri);
                    const workspaces = wsResponse.data;
                    const activeWorkspace = workspaces.find((workspace: any) => workspace.id === options.workspaceId);
                    if (activeWorkspace) {
                        options.location = activeWorkspace['location'] || options.location;
                    }
                }
                resolve(options);
            });
        });
    }

    function open(path: string) {
        useFunctionInstanceComposition.openFile(path);
    }

    let _appNameChangedCallback: ((name: string) => void) | null = null;

    function onAppNameChanged(callback: (name: string) => void) {
        _appNameChangedCallback = callback;
    }

    function updateAppName(name: string) {
        options.appName = name;
        if (_appNameChangedCallback) {
            _appNameChangedCallback(name);
        }
    }

    return { options, initialize, open, updateAppName, onAppNameChanged };
}   