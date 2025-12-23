import { UseWorkspace, WorkspaceOptions } from "./types";

export function useWorkspace(): UseWorkspace {
    const options: WorkspaceOptions = {
        path: '',
        appId: '',
        workspaceId: '',
        version: '',
    };

    function initialize() {
        return new Promise<WorkspaceOptions>((resolve, reject) => {
            const queryParams = new URLSearchParams(window.location.search);
            options.path = queryParams.get('path') || '';
            options.appId = queryParams.get('appId') || '';
            options.workspaceId = queryParams.get('ws') || '';
            resolve(options);
        });
    }

    return { options, initialize };
}