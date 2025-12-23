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
                const config = response.data;
                if (config) {
                    options.id = config['id'] || options.id;
                    options.code = config['code'] || options.code;
                    options.name = config['name'] || options.name;
                    options.productId = config['productId'] || options.productId;
                    options.paas = config['paas'] || options.paas;
                    options.location = config['location'] || options.location;
                    options.activated = config['activated'] || options.activated;
                    options.role = config['role'] || options.role;
                    options.creator = config['creator'] || options.creator;
                    options.createdTime = config['createdTime'] || options.createdTime;
                    options.lastModifier = config['lastModifier'] || options.lastModifier;
                    options.lastModifiedTime = config['lastModifiedTime'] || options.lastModifiedTime;
                }
                resolve(options);
            });
        });
    }

    return { options, initialize };
}
