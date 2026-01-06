export interface AppObject {
    id: string;
    code: string;
    name: string;
    description: string;
    userId: string;
}

export interface UseProfile {
    profile: Ref<AppObject>;
    getProfile: () => Promise<AppObject>;
}
