<template>
    <div class="common-layout">
      <el-container style="width: 100%; height: 100%">
        <el-container>
          <el-aside width="auto"><Sidebar /></el-aside>
          <el-main style="padding: 0">
            <el-header style="padding: 0"><Header></Header></el-header>
            <RouterView v-slot="slotProps">
              <keep-alive>
                <component :is="slotProps.Component"></component>
              </keep-alive>
            </RouterView>
          </el-main>
        </el-container>
      </el-container>
    </div>
  </template>
  
  <script setup lang="ts">
  import Sidebar from '../Sidebar/index.vue'
  import Header from '../Header/index.vue'
  </script>
  
  <style scoped>
  .common-layout {
    width: 100%;
    height: 100%;
  }
  </style>
  
  