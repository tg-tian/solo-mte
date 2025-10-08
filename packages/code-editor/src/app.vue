<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { computed, ref, onMounted } from 'vue';
import { FCommandCodeView } from '../components/command-code-view';

const routes: Record<string, any> = {
    '/': FCommandCodeView
};

const currentPath = ref(window.location.hash);

const currentView = computed(() => {
    // eslint-disable-next-line no-constant-binary-expression
    const routePath: string = `/${currentPath.value.slice(1)}` || '/';
    return routes[routePath] || FCommandCodeView;
});

onMounted(() => {
    window.addEventListener('hashchange', () => {
        currentPath.value = window.location.hash;
    });
});
</script>
<template>
    <component :is="currentView" />
</template>
