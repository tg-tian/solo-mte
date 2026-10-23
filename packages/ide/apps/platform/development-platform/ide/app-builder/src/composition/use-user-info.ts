import { ref } from "vue";
import { getCurrentUser } from '../../../../../../../src/utils/current-user';
import { UserInfo, UseUserInfo } from "./types";

export function useUserInfo(): UseUserInfo {

    const user = ref<UserInfo>({} as UserInfo);

    function initialize() {
        return getCurrentUser().then((info) => {
            user.value = info as UserInfo;
            return user.value;
        });
    }

    return { user, initialize };
}