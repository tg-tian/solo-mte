<template>
    <div style="display: flex;">
        <el-checkbox v-model="selected" @change="handleClick" style="margin-top: 10px;"></el-checkbox>
        <el-collapse v-model="activeNames" @change="handleChange" style="width: 90%;margin-left: 20px;">
            <el-collapse-item :title="props.template.name" :name="props.template.name">
            <div>
                <div class="template_item">
                    <div class="template_key">模板ID：</div>
                    <div class="template_value">{{ props.template.id }}</div>
                </div>
                <div class="template_item">
                    <div class="template_key">模板名：</div>
                    <div class="template_value">{{ props.template.name }}</div>
                </div>
                <div class="template_item">
                    <div class="template_key">模板描述：</div>
                    <div class="template_value">{{ props.template.description }}</div>
                </div>
                <div class="template_item">
                    <div class="template_key">模板类别：</div>
                    <div class="template_value">{{ props.template.category }}</div>
                </div>
                <div class="template_item">
                    <div class="template_key">模板标签：</div>
                    <div class="template_value">{{ props.template.tags }}</div>
                </div>
                <div class="template_item">
                    <div class="template_key">业务标签：</div>
                    <div class="template_value">{{ props.template.domain }}</div>
                </div>
                <div class="template_item">
                    <div class="template_key">DSL/平台：</div>
                    <div class="template_value">{{ props.template.describing_the_model }}</div>
                </div>
                <div class="template_item">
                <div class="template_key">描述详情：</div>
                <div class="template_value">
                  <a :href="props.template.url.substring(0, props.template.url.length-5)" target="_blank">
                    {{ props.template.url }}
                  </a>
                </div>
            </div>
                <el-image :src="props.template.image_url" />
            </div>
            </el-collapse-item>
        </el-collapse>
        
    </div>
</template>

<script setup lang="ts">
import { Template } from '@/types/models';
import type { CollapseModelValue } from 'element-plus'

const props = defineProps({
    template: {
        type: Object as ()=>Template ,
        required: true
    },
    resetSelected: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['template-click']);
const selected = ref(false)

watch(() => props.resetSelected, (newVal) => {
    if (newVal) {
        selected.value = false
    }
})

const handleClick = (value: any) => {
    emit('template-click', props.template.id ,value);
};

const activeNames = ref([])
const handleChange = (val: CollapseModelValue) => {
//   console.log(val)
}
</script>
<style>
.template_item{
    display: flex;
    margin-bottom: 10px;
}

.template_key {
    color: gray;
    width: 90px;
}

.template_value {
    color: black;
    flex: 1;
}
</style>