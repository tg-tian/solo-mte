import axios from "axios";
import { UseWorkspace, WorkspaceOptions } from "./type";

export function useWorkspace(): UseWorkspace {

    const workspaceUri = '/api/dev/main/v1.0/ws';

    const options: WorkspaceOptions = {
        id: '',
        code: '',
        name: '',
        productId: null,
        paas: false,
        location: '',
        activated: false,
        role: '',
        creator: '',
        createdTime: '',
        lastModifier: '',
        lastModifiedTime: '',
    };

    function initialize() {
        return new Promise<WorkspaceOptions>((resolve, reject) => {
            axios.get(workspaceUri).then((response) => {
                const workspaces = response.data;
                if (workspaces.length > 0) {
                    const activeWorkspace = workspaces.find((workspace: any) => workspace.activated);
                    if (activeWorkspace) {
                        options.id = activeWorkspace['id'] || options.id;
                        options.code = activeWorkspace['code'] || options.code;
                        options.name = activeWorkspace['name'] || options.name;
                        options.productId = activeWorkspace['productId'] || options.productId;
                        options.paas = activeWorkspace['paas'] || options.paas;
                        options.location = activeWorkspace['location'] || options.location;
                        options.activated = activeWorkspace['activated'] || options.activated;
                        options.role = activeWorkspace['role'] || options.role;
                        options.creator = activeWorkspace['creator'] || options.creator;
                        options.createdTime = activeWorkspace['createdTime'] || options.createdTime;
                        options.lastModifier = activeWorkspace['lastModifier'] || options.lastModifier;
                        options.lastModifiedTime = activeWorkspace['lastModifiedTime'] || options.lastModifiedTime;
                    }
                }
                resolve(options);
            });
        });
    }

    return { options, initialize };
}
