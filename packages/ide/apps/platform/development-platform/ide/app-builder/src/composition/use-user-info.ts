import { ref } from "vue";
import axios from "axios";
import { UserInfo, UseUserInfo } from "./types";

export function useUserInfo(): UseUserInfo {
    const userInfoUri = '/api/runtime/sys/v1.0/userinfos?infoType=user';

    const user = ref<UserInfo>({} as UserInfo);

    function initialize() {
        return axios.get(userInfoUri).then((response) => {
            user.value = response.data;
            return user.value;
        });
    }

    return { user, initialize };
}