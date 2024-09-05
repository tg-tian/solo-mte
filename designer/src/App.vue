import { defineComponent } from "vue";

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import FDesigner from './components/designer.component';
import FPreview from './components/preview.component';

const currentPath = ref(window.location.hash);

const routes: Record<string, any> = {
    '/': FDesigner,
    '/dynamic-view/preview-local': FPreview
};

const currentView = computed(() => {
    const routePath: string = `/${currentPath.value.slice(1)}` || '/';
    return routes[routePath] || FDesigner;
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
