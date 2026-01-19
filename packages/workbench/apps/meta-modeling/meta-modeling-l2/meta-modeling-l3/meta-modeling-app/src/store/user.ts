import { defineStore } from 'pinia'
import { mockUsers } from '@/api/mock'
import { setToken, getToken, delToken } from '@/utils/auth'
import { User } from '@/types/models'

export const useUserStore = defineStore('user', {
    state: () => ({
        token: getToken() || '',
        user: null as User | null,
    }),

    getters: {
        isLoggedIn: (state) => !!state.token && !!state.user,
        userRole: (state) => state.user?.role || '',
    },

    actions: {
        async login(loginData: { username: string; password: string }) {
            // In a real app, this would call an API
            const user = mockUsers.find(
                u => u.username === loginData.username && u.password === loginData.password
            )

            if (user) {
                this.user = {
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                    role: user.role,
                    avatar: user.avatar
                }

                // In a real app, the token would come from a server
                const token = `mock-token-${user.username}-${Date.now()}`
                this.token = token
                setToken(token)
                return true
            }

            return false
        },

        logout() {
            this.token = ''
            this.user = null
            delToken()
        },

        async getUserInfo() {
            // In a real app, this would call an API to get user info based on token
            const token = getToken()
            if (!token) return false

            // For mock purposes, we'll just use the first user
            const user = mockUsers[0]
            this.user = {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                avatar: user.avatar
            }

            return true
        }
    },

    persist: true
})
