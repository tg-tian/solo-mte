import { UseWorkspace } from "../../../composition/types";
import { AppObject, UseProfile } from "./types"
import { inject, ref } from "vue";
import axios from "axios";

export function useProfile(): UseProfile {
    const profile = ref<AppObject>({
        id: '',
        code: '',
        name: '',
        description: '',
        userId: ''
    })

    function getProfile() {
        const useWorkspaceComposition = inject('f-admin-workspace') as UseWorkspace;
        const { options } = useWorkspaceComposition;
        const resourceUri = `/api/runtime/sys/v1.0/business-objects/${options.boId}`;
        return new Promise<AppObject>((resolve, reject) => {
            axios.get(resourceUri).then((response) => {
                const resourceData = response.data as Record<string, any>;
                const { code, name, description } = resourceData;
                profile.value = {
                    id: options.appId,
                    code: code,
                    name: name,
                    description: description,
                    userId: ''
                }
                resolve(profile.value);
            });
        });
    }



    return { profile, getProfile }
}