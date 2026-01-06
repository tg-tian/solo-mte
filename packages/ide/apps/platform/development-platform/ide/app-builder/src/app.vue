import { defineComponent } from "vue";

<script setup lang="ts">
import { computed, onMounted, ref, provide } from 'vue';
import FAFrame from './components/workspace/workspace.component';
import FAAppInfo from './components/profile/profile.component';
import FAAppEntries from './components/menu/menu.component';
import FAAppEnvironment from './components/variables/variables.component';
import { useIde } from "./composition/use-ide";

const currentPath = ref(window.location.hash);

const routes: Record<string, any> = {
    '/': FAFrame,
    '/app-info': FAAppInfo,
    '/app-entries': FAAppEntries,
    '/app-environment': FAAppEnvironment
};

const currentView = computed(() => {
    // eslint-disable-next-line no-constant-binary-expression
    const routePath: string = `/${currentPath.value.slice(1)}` || '/';
    return routes[routePath] || FAFrame;
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
