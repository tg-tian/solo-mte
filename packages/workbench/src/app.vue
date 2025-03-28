import { defineComponent } from "vue";

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import FAFrame from './components/frame/frame.component';

const currentPath = ref(window.location.hash);

const routes: Record<string, any> = {
    '/': FAFrame
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
