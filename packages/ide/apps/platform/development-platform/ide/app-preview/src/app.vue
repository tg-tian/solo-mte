<template>
    <FAPreview :menuItems="menuItems" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FAPreview from './components/preview/preview.component';

// 示例菜单数据，可以通过 props 或 API 传入
const menuItems = ref([
    {id: '1', name: '联系人', url: '/platform/common/web/renderer/index.html#/preview?metadataPath=Cases/ApplicationTemplates/Contacts/bo-contacts-front/metadata/components/Contacts.frm&projectPath=Cases/ApplicationTemplates/Contacts/bo-contacts-front/metadata/components&baseMetadataId=580a302f-513a-452b-a9dc-9816ffd02c09'},
]);
</script>
