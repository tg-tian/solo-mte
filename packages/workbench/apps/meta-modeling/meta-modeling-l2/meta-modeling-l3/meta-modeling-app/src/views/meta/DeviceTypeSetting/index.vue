<template>
  <div class="device-type-setting">
    <div class="devicetype-header">
      <h2>{{ isEditMode ? '编辑设备类型——'+ deviceTypeForm.name : '创建设备类型' }}</h2>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </div>
    </div>

    <!-- 基本信息表单 - 提到最上面 -->
    <el-card class="basic-info-card">
      <el-form 
        :model="deviceTypeForm" 
        :rules="basicRules"
        ref="deviceTypeFormRef"
        label-width="120px">
        <el-form-item label="设备类型编码" prop="code">
          <el-input v-model="deviceTypeForm.code" placeholder="请输入设备类型编码"></el-input>
        </el-form-item>
        <el-form-item label="设备类型名称" prop="name">
          <el-input v-model="deviceTypeForm.name" placeholder="请输入设备类型名称"></el-input>
        </el-form-item>
        <el-form-item label="设备类型描述" prop="description">
          <el-input type="textarea" :rows="3" v-model="deviceTypeForm.description" placeholder="请输入设备类型描述"></el-input>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Tab页面：属性、服务、事件 -->
    <el-card class="setting-content">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="属性" name="property" :disabled="!isEditMode && !currentDeviceTypeId">
          <div v-if="isEditMode || currentDeviceTypeId">
            <div class="section-header">
              <h3>属性</h3>
              <div class="section-actions">
                <el-button type="primary" size="small" @click="addProperty">添加属性</el-button>
                <el-button type="primary" size="small" @click="showModelJson">查看JSON</el-button>
              </div>
            </div>
            
            <el-table :data="modelForm.properties" border style="width: 100%; margin-top: 10px;">
              <el-table-column prop="identify" label="标识符" width="180"></el-table-column>
              <el-table-column prop="name" label="名称" width="180"></el-table-column>
              <el-table-column prop="accessMode" label="读写类型" width="120">
                <template #default="scope">
                  {{ getAccessModeText(scope.row.accessMode) }}
                </template>
              </el-table-column>
              <el-table-column prop="dataType.type" label="数据类型" width="120">
                <template #default="scope">
                  {{ getDataTypeLabel(scope.row.dataType.type) }}
                </template>
              </el-table-column>
              <el-table-column prop="dataType.specs" label="规格">
                <template #default="scope">
                  {{ formatDataTypeSpecs(scope.row.dataType) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="scope">
                  <el-button type="primary" size="small" @click="editProperty(scope.row, scope.$index)">编辑</el-button>
                  <el-button type="danger" size="small" @click="removeProperty(scope.$index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="modelForm.properties.length === 0" description="暂无属性"></el-empty>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="服务" name="service" :disabled="!isEditMode && !currentDeviceTypeId">
          <div v-if="isEditMode || currentDeviceTypeId">
            <div class="section-header">
              <h3>服务</h3>
              <el-button type="primary" size="small" @click="addService">添加服务</el-button>
            </div>
            <el-table :data="modelForm.services" border style="width: 100%; margin-top: 10px;">
              <el-table-column prop="identify" label="标识符" width="180"></el-table-column>
              <el-table-column prop="name" label="名称" width="180"></el-table-column>
              <el-table-column label="输入参数" width="120">
                <template #default="scope">
                  {{ scope.row.inputData.length }} 个参数
                </template>
              </el-table-column>
              <el-table-column label="输出参数" width="120">
                <template #default="scope">
                  {{ scope.row.outputData.length }} 个参数
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="scope">
                  <el-button type="primary" size="small" @click="editService(scope.row, scope.$index)">编辑</el-button>
                  <el-button type="danger" size="small" @click="removeService(scope.$index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="modelForm.services.length === 0" description="暂无服务"></el-empty>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="事件" name="event" :disabled="!isEditMode && !currentDeviceTypeId">
          <div v-if="isEditMode || currentDeviceTypeId">
            <div class="section-header">
              <h3>事件</h3>
              <el-button type="primary" size="small" @click="addEvent">添加事件</el-button>
            </div>
            <el-table :data="modelForm.events" border style="width: 100%; margin-top: 10px;">
              <el-table-column prop="identify" label="标识符" width="180"></el-table-column>
              <el-table-column prop="name" label="名称" width="180"></el-table-column>
              <el-table-column prop="type" label="事件类型" width="120">
                <template #default="scope">
                  <el-tag :type="getEventTypeTag(scope.row.type)">{{ getEventTypeText(scope.row.type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="输出参数" width="120">
                <template #default="scope">
                  {{ scope.row.outputData.length }} 个参数
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="scope">
                  <el-button type="primary" size="small" @click="editEvent(scope.row, scope.$index)">编辑</el-button>
                  <el-button type="danger" size="small" @click="removeEvent(scope.$index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="modelForm.events.length === 0" description="暂无事件"></el-empty>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 属性对话框 -->
    <el-dialog v-model="propertyDialogVisible" :title="isPropertyEdit ? '编辑属性' : '添加属性'" width="50%">
      <el-form :model="propertyForm" :rules="propertyRules" ref="propertyFormRef" label-width="120px">
        <el-form-item label="标识符" prop="identify">
          <el-input v-model="propertyForm.identify" placeholder="请输入属性标识符"></el-input>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="propertyForm.name" placeholder="请输入属性名称"></el-input>
        </el-form-item>
        <el-form-item label="读写类型" prop="accessMode">
          <el-select v-model="propertyForm.accessMode" placeholder="请选择读写类型">
            <el-option label="读写" value="rw"></el-option>
            <el-option label="只读" value="r"></el-option>
            <el-option label="只写" value="w"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="数据类型" prop="dataType.type">
          <el-select v-model="propertyForm.dataType.type" placeholder="请选择数据类型" @change="handleDataTypeChange">
            <el-option-group label="字符串类">
              <el-option label="字符串" value="string"></el-option>
              <el-option label="邮箱" value="email"></el-option>
              <el-option label="电话" value="phone"></el-option>
              <el-option label="URL" value="url"></el-option>
              <el-option label="IP地址" value="ip"></el-option>
              <el-option label="JSON" value="json"></el-option>
              <el-option label="Base64" value="base64"></el-option>
              <el-option label="Hash" value="hash"></el-option>
              <el-option label="Markdown文本" value="markdown"></el-option>
              <el-option label="代码块" value="code"></el-option>
            </el-option-group>
            <el-option-group label="数值类">
              <el-option label="数字" value="number"></el-option>
              <el-option label="整数" value="integer"></el-option>
              <el-option label="小数" value="decimal"></el-option>
              <el-option label="浮点数" value="float"></el-option>
              <el-option label="整数(兼容)" value="int"></el-option>
            </el-option-group>
            <el-option-group label="日期类">
              <el-option label="日期" value="date"></el-option>
              <el-option label="日期时间" value="datetime"></el-option>
              <el-option label="时间" value="time"></el-option>
            </el-option-group>
            <el-option-group label="其他类型">
              <el-option label="布尔值" value="boolean"></el-option>
              <el-option label="布尔值(兼容)" value="bool"></el-option>
              <el-option label="UUID" value="uuid"></el-option>
              <el-option label="枚举" value="enum"></el-option>
              <el-option label="单选" value="singleSelect"></el-option>
              <el-option label="多选" value="multiSelect"></el-option>
              <el-option label="地址" value="address"></el-option>
              <el-option label="定位" value="location"></el-option>
              <el-option label="经纬度" value="latlng"></el-option>
              <el-option label="文件" value="file"></el-option>
              <el-option label="图片" value="image"></el-option>
              <el-option label="智能对象" value="object"></el-option>
            </el-option-group>
          </el-select>
        </el-form-item>
        <!-- 数值类型的规格 (int, integer, float, number, decimal) -->
        <template v-if="['int', 'integer', 'float', 'number', 'decimal'].includes(propertyForm.dataType.type)">
          <el-form-item label="最小值" prop="dataType.specs.min">
            <el-input-number v-model="propertyForm.dataType.specs.min" :precision="['float', 'number', 'decimal'].includes(propertyForm.dataType.type) ? 2 : 0"></el-input-number>
          </el-form-item>
          <el-form-item label="最大值" prop="dataType.specs.max">
            <el-input-number v-model="propertyForm.dataType.specs.max" :precision="['float', 'number', 'decimal'].includes(propertyForm.dataType.type) ? 2 : 0"></el-input-number>
          </el-form-item>
          <el-form-item label="步长" prop="dataType.specs.step">
            <el-input-number v-model="propertyForm.dataType.specs.step" :precision="['float', 'number', 'decimal'].includes(propertyForm.dataType.type) ? 2 : 0"></el-input-number>
          </el-form-item>
          <el-form-item label="单位" prop="dataType.specs.unit">
            <el-input v-model="propertyForm.dataType.specs.unit" placeholder="例如：℃、kg"></el-input>
          </el-form-item>
        </template>
        <!-- 字符串类型的规格 -->
        <template v-if="['string', 'email', 'phone', 'url', 'ip', 'json', 'base64', 'hash', 'markdown', 'code'].includes(propertyForm.dataType.type)">
          <el-form-item label="最大长度" prop="dataType.specs.length">
            <el-input-number v-model="propertyForm.dataType.specs['length']" :min="1"></el-input-number>
          </el-form-item>
        </template>
        <!-- 日期类型的规格 -->
        <template v-if="['date', 'datetime', 'time'].includes(propertyForm.dataType.type)">
          <el-form-item label="格式" prop="dataType.specs.format">
            <el-input v-model="propertyForm.dataType.specs['format']" :placeholder="propertyForm.dataType.type === 'date' ? '例如：YYYY-MM-DD' : propertyForm.dataType.type === 'datetime' ? '例如：YYYY-MM-DD HH:mm:ss' : '例如：HH:mm:ss'"></el-input>
          </el-form-item>
        </template>
        <!-- 布尔类型的规格 -->
        <template v-if="['bool', 'boolean'].includes(propertyForm.dataType.type)">
          <el-form-item label="真值标签" prop="dataType.specs.trueLabel">
            <el-input v-model="propertyForm.dataType.specs['trueLabel']" placeholder="例如：开"></el-input>
          </el-form-item>
          <el-form-item label="假值标签" prop="dataType.specs.falseLabel">
            <el-input v-model="propertyForm.dataType.specs['falseLabel']" placeholder="例如：关"></el-input>
          </el-form-item>
        </template>
        <!-- 经纬度类型的规格 -->
        <template v-if="propertyForm.dataType.type === 'latlng'">
          <el-form-item label="经度范围" prop="dataType.specs.lngRange">
            <el-input v-model="propertyForm.dataType.specs['lngRange']" placeholder="例如：-180,180"></el-input>
          </el-form-item>
          <el-form-item label="纬度范围" prop="dataType.specs.latRange">
            <el-input v-model="propertyForm.dataType.specs['latRange']" placeholder="例如：-90,90"></el-input>
          </el-form-item>
        </template>
        <!-- 文件/图片类型的规格 -->
        <template v-if="['file', 'image'].includes(propertyForm.dataType.type)">
          <el-form-item label="最大文件大小(MB)" prop="dataType.specs.maxSize">
            <el-input-number v-model="propertyForm.dataType.specs['maxSize']" :min="1"></el-input-number>
          </el-form-item>
          <el-form-item label="允许的扩展名" prop="dataType.specs.extensions">
            <el-input v-model="propertyForm.dataType.specs['extensions']" placeholder="例如：jpg,png,pdf (用逗号分隔)"></el-input>
          </el-form-item>
        </template>
        <!-- 枚举类型的规格 (enum, singleSelect, multiSelect) -->
        <template v-if="['enum', 'singleSelect', 'multiSelect'].includes(propertyForm.dataType.type)">
          <el-form-item label="枚举值">
            <div v-for="(item, index) in propertyForm.dataType.specs['values']" :key="index" class="enum-item">
              <el-input v-model="item.value" placeholder="值" class="enum-value"></el-input>
              <el-input v-model="item.label" placeholder="标签" class="enum-label"></el-input>
              <el-button type="danger" icon="Delete" circle @click="removeEnumValue(index)"></el-button>
            </div>
            <el-button type="primary" @click="addEnumValue">添加枚举值</el-button>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="propertyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitPropertyForm">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 服务对话框 -->
    <el-dialog v-model="serviceDialogVisible" :title="isServiceEdit ? '编辑服务' : '添加服务'" width="60%">
      <el-form :model="serviceForm" :rules="serviceRules" ref="serviceFormRef" label-width="120px">
        <el-form-item label="标识符" prop="identify">
          <el-input v-model="serviceForm.identify" placeholder="请输入服务标识符"></el-input>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="serviceForm.name" placeholder="请输入服务名称"></el-input>
        </el-form-item>
        <el-divider content-position="left">输入参数</el-divider>
        <div class="params-section">
          <el-button type="primary" size="small" @click="addServiceParam('input')">添加输入参数</el-button>
          <el-table :data="serviceForm.inputData" border style="width: 100%; margin-top: 10px;">
            <el-table-column prop="identify" label="标识符" width="150"></el-table-column>
            <el-table-column prop="name" label="名称" width="150"></el-table-column>
            <el-table-column prop="dataType.type" label="数据类型" width="100">
              <template #default="scope">
                {{ getDataTypeLabel(scope.row.dataType.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="dataType.specs" label="规格">
              <template #default="scope">
                {{ formatDataTypeSpecs(scope.row.dataType) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button type="primary" size="small" @click="editServiceParam('input', scope.row, scope.$index)">编辑</el-button>
                <el-button type="danger" size="small" @click="removeServiceParam('input', scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="serviceForm.inputData.length === 0" description="暂无输入参数"></el-empty>
        </div>
        <el-divider content-position="left">输出参数</el-divider>
        <div class="params-section">
          <el-button type="primary" size="small" @click="addServiceParam('output')">添加输出参数</el-button>
          <el-table :data="serviceForm.outputData" border style="width: 100%; margin-top: 10px;">
            <el-table-column prop="identify" label="标识符" width="150"></el-table-column>
            <el-table-column prop="name" label="名称" width="150"></el-table-column>
            <el-table-column prop="dataType.type" label="数据类型" width="100">
              <template #default="scope">
                {{ getDataTypeLabel(scope.row.dataType.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="dataType.specs" label="规格">
              <template #default="scope">
                {{ formatDataTypeSpecs(scope.row.dataType) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button type="primary" size="small" @click="editServiceParam('output', scope.row, scope.$index)">编辑</el-button>
                <el-button type="danger" size="small" @click="removeServiceParam('output', scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="serviceForm.outputData.length === 0" description="暂无输出参数"></el-empty>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="serviceDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitServiceForm">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 事件对话框 -->
    <el-dialog v-model="eventDialogVisible" :title="isEventEdit ? '编辑事件' : '添加事件'" width="60%">
      <el-form :model="eventForm" :rules="eventRules" ref="eventFormRef" label-width="120px">
        <el-form-item label="标识符" prop="identify">
          <el-input v-model="eventForm.identify" placeholder="请输入事件标识符"></el-input>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="eventForm.name" placeholder="请输入事件名称"></el-input>
        </el-form-item>
        <el-form-item label="事件类型" prop="type">
          <el-select v-model="eventForm.type" placeholder="请选择事件类型">
            <el-option label="信息" value="info"></el-option>
            <el-option label="告警" value="warning"></el-option>
            <el-option label="故障" value="error"></el-option>
          </el-select>
        </el-form-item>
        <el-divider content-position="left">输出参数</el-divider>
        <div class="params-section">
          <el-button type="primary" size="small" @click="addEventParam">添加输出参数</el-button>
          <el-table :data="eventForm.outputData" border style="width: 100%; margin-top: 10px;">
            <el-table-column prop="identify" label="标识符" width="150"></el-table-column>
            <el-table-column prop="name" label="名称" width="150"></el-table-column>
            <el-table-column prop="dataType.type" label="数据类型" width="100">
              <template #default="scope">
                {{ getDataTypeLabel(scope.row.dataType.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="dataType.specs" label="规格">
              <template #default="scope">
                {{ formatDataTypeSpecs(scope.row.dataType) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button type="primary" size="small" @click="editEventParam(scope.row, scope.$index)">编辑</el-button>
                <el-button type="danger" size="small" @click="removeEventParam(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="eventForm.outputData.length === 0" description="暂无输出参数"></el-empty>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="eventDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEventForm">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 参数编辑对话框 (用于服务和事件的参数) -->
    <el-dialog v-model="paramDialogVisible" :title="isParamEdit ? '编辑参数' : '添加参数'" width="50%">
      <el-form :model="paramForm" :rules="paramRules" ref="paramFormRef" label-width="120px">
        <el-form-item label="标识符" prop="identify">
          <el-input v-model="paramForm.identify" placeholder="请输入参数标识符"></el-input>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="paramForm.name" placeholder="请输入参数名称"></el-input>
        </el-form-item>
        <el-form-item label="数据类型" prop="dataType.type">
          <el-select v-model="paramForm.dataType.type" placeholder="请选择数据类型" @change="handleParamDataTypeChange">
            <el-option-group label="字符串类">
              <el-option label="字符串" value="string"></el-option>
              <el-option label="邮箱" value="email"></el-option>
              <el-option label="电话" value="phone"></el-option>
              <el-option label="URL" value="url"></el-option>
              <el-option label="IP地址" value="ip"></el-option>
              <el-option label="JSON" value="json"></el-option>
              <el-option label="Base64" value="base64"></el-option>
              <el-option label="Hash" value="hash"></el-option>
              <el-option label="Markdown文本" value="markdown"></el-option>
              <el-option label="代码块" value="code"></el-option>
            </el-option-group>
            <el-option-group label="数值类">
              <el-option label="数字" value="number"></el-option>
              <el-option label="整数" value="integer"></el-option>
              <el-option label="小数" value="decimal"></el-option>
              <el-option label="浮点数" value="float"></el-option>
              <el-option label="整数(兼容)" value="int"></el-option>
            </el-option-group>
            <el-option-group label="日期类">
              <el-option label="日期" value="date"></el-option>
              <el-option label="日期时间" value="datetime"></el-option>
              <el-option label="时间" value="time"></el-option>
            </el-option-group>
            <el-option-group label="其他类型">
              <el-option label="布尔值" value="boolean"></el-option>
              <el-option label="布尔值(兼容)" value="bool"></el-option>
              <el-option label="UUID" value="uuid"></el-option>
              <el-option label="枚举" value="enum"></el-option>
              <el-option label="单选" value="singleSelect"></el-option>
              <el-option label="多选" value="multiSelect"></el-option>
              <el-option label="地址" value="address"></el-option>
              <el-option label="定位" value="location"></el-option>
              <el-option label="经纬度" value="latlng"></el-option>
              <el-option label="文件" value="file"></el-option>
              <el-option label="图片" value="image"></el-option>
            </el-option-group>
          </el-select>
        </el-form-item>
        <!-- 数值类型的规格 -->
        <template v-if="['int', 'integer', 'float', 'number', 'decimal'].includes(paramForm.dataType.type)">
          <el-form-item label="最小值" prop="dataType.specs.min">
            <el-input-number v-model="paramForm.dataType.specs.min" :precision="['float', 'number', 'decimal'].includes(paramForm.dataType.type) ? 2 : 0"></el-input-number>
          </el-form-item>
          <el-form-item label="最大值" prop="dataType.specs.max">
            <el-input-number v-model="paramForm.dataType.specs.max" :precision="['float', 'number', 'decimal'].includes(paramForm.dataType.type) ? 2 : 0"></el-input-number>
          </el-form-item>
          <el-form-item label="步长" prop="dataType.specs.step">
            <el-input-number v-model="paramForm.dataType.specs.step" :precision="['float', 'number', 'decimal'].includes(paramForm.dataType.type) ? 2 : 0"></el-input-number>
          </el-form-item>
          <el-form-item label="单位" prop="dataType.specs.unit">
            <el-input v-model="paramForm.dataType.specs.unit" placeholder="例如：℃、kg"></el-input>
          </el-form-item>
        </template>
        <!-- 字符串类型的规格 -->
        <template v-if="['string', 'email', 'phone', 'url', 'ip', 'json', 'base64', 'hash', 'markdown', 'code'].includes(paramForm.dataType.type)">
          <el-form-item label="最大长度" prop="dataType.specs.length">
            <el-input-number v-model="paramForm.dataType.specs['length']" :min="1"></el-input-number>
          </el-form-item>
        </template>
        <!-- 日期类型的规格 -->
        <template v-if="['date', 'datetime', 'time'].includes(paramForm.dataType.type)">
          <el-form-item label="格式" prop="dataType.specs.format">
            <el-input v-model="paramForm.dataType.specs['format']" :placeholder="paramForm.dataType.type === 'date' ? '例如：YYYY-MM-DD' : paramForm.dataType.type === 'datetime' ? '例如：YYYY-MM-DD HH:mm:ss' : '例如：HH:mm:ss'"></el-input>
          </el-form-item>
        </template>
        <!-- 布尔类型的规格 -->
        <template v-if="['bool', 'boolean'].includes(paramForm.dataType.type)">
          <el-form-item label="真值标签" prop="dataType.specs.trueLabel">
            <el-input v-model="paramForm.dataType.specs['trueLabel']" placeholder="例如：开"></el-input>
          </el-form-item>
          <el-form-item label="假值标签" prop="dataType.specs.falseLabel">
            <el-input v-model="paramForm.dataType.specs['falseLabel']" placeholder="例如：关"></el-input>
          </el-form-item>
        </template>
        <!-- 经纬度类型的规格 -->
        <template v-if="paramForm.dataType.type === 'latlng'">
          <el-form-item label="经度范围" prop="dataType.specs.lngRange">
            <el-input v-model="paramForm.dataType.specs['lngRange']" placeholder="例如：-180,180"></el-input>
          </el-form-item>
          <el-form-item label="纬度范围" prop="dataType.specs.latRange">
            <el-input v-model="paramForm.dataType.specs['latRange']" placeholder="例如：-90,90"></el-input>
          </el-form-item>
        </template>
        <!-- 文件/图片类型的规格 -->
        <template v-if="['file', 'image'].includes(paramForm.dataType.type)">
          <el-form-item label="最大文件大小(MB)" prop="dataType.specs.maxSize">
            <el-input-number v-model="paramForm.dataType.specs['maxSize']" :min="1"></el-input-number>
          </el-form-item>
          <el-form-item label="允许的扩展名" prop="dataType.specs.extensions">
            <el-input v-model="paramForm.dataType.specs['extensions']" placeholder="例如：jpg,png,pdf (用逗号分隔)"></el-input>
          </el-form-item>
        </template>
        <!-- 枚举类型的规格 -->
        <template v-if="['enum', 'singleSelect', 'multiSelect'].includes(paramForm.dataType.type)">
          <el-form-item label="枚举值">
            <div v-for="(item, index) in paramForm.dataType.specs['values']" :key="index" class="enum-item">
              <el-input v-model="item.value" placeholder="值" class="enum-value"></el-input>
              <el-input v-model="item.label" placeholder="标签" class="enum-label"></el-input>
              <el-button type="danger" icon="Delete" circle @click="removeParamEnumValue(index)"></el-button>
            </div>
            <el-button type="primary" @click="addParamEnumValue">添加枚举值</el-button>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="paramDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitParamForm">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- JSON查看对话框 -->
    <el-dialog v-model="jsonDialogVisible" title="模型JSON" width="60%">
      <pre class="json-viewer">{{ formattedModelJson }}</pre>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="copyModelJson">复制</el-button>
          <el-button @click="jsonDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRefs } from 'vue'
import { useDeviceTypeStore } from '@/store/deviceType'
import { ElMessage, type FormInstance } from 'element-plus'
import { getDeviceTypeById, updateDeviceTypeModel } from '@/api/deviceType'
import type { DeviceType, Model, Property, Service, Event, DataType } from '@/types/models'

const deviceTypeStore = useDeviceTypeStore()

// 从URL参数中获取数据（workbench环境中没有vue-router）
const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search)
  return {
    mode: params.get('mode') || 'create',
    deviceTypeId: params.get('deviceTypeId') ? parseInt(params.get('deviceTypeId')!) : null
  }
}

const urlParams = ref(getUrlParams())

// 数据类型配置
const dataTypeOptions = [
  // 字符串类
  { label: '字符串', value: 'string' },
  { label: '邮箱', value: 'email' },
  { label: '电话', value: 'phone' },
  { label: 'URL', value: 'url' },
  { label: 'IP地址', value: 'ip' },
  { label: 'JSON', value: 'json' },
  { label: 'Base64', value: 'base64' },
  { label: 'Hash', value: 'hash' },
  { label: 'Markdown文本', value: 'markdown' },
  { label: '代码块', value: 'code' },
  // 数值类
  { label: '数字', value: 'number' },
  { label: '整数', value: 'integer' },
  { label: '小数', value: 'decimal' },
  { label: '浮点数', value: 'float' },
  // 日期类
  { label: '日期', value: 'date' },
  { label: '日期时间', value: 'datetime' },
  { label: '时间', value: 'time' },
  // 布尔类
  { label: '布尔值', value: 'boolean' },
  // 标识符类
  { label: 'UUID', value: 'uuid' },
  // 枚举类
  { label: '枚举', value: 'enum' },
  { label: '单选', value: 'singleSelect' },
  { label: '多选', value: 'multiSelect' },
  // 地理/地址类
  { label: '地址', value: 'address' },
  { label: '定位', value: 'location' },
  { label: '经纬度', value: 'latlng' },
  // 文件/媒体类
  { label: '文件', value: 'file' },
  { label: '图片', value: 'image' },
  // 智能对象（保留原有的）
  { label: '智能对象', value: 'object' },
  // 兼容旧版本
  { label: '整数', value: 'int' },
  { label: '布尔值', value: 'bool' },
]

// 表单引用
const deviceTypeFormRef = ref<FormInstance>()
const propertyFormRef = ref<FormInstance>()
const serviceFormRef = ref<FormInstance>()
const eventFormRef = ref<FormInstance>()
const paramFormRef = ref<FormInstance>()

// 状态
const state = reactive({
  activeTab: 'property',
  deviceTypeForm: {
    code: '',
    name: '',
    description: ''
  },
  modelForm: {
    properties: [] as Property[],
    services: [] as Service[],
    events: [] as Event[]
  },
  propertyForm: {
    identify: '',
    name: '',
    accessMode: 'rw',
    dataType: {
      type: 'int',
      specs: {
        min: 0,
        max: 100,
        step: 1,
        unit: ''
      } as Record<string, any>
    }
  },
  serviceForm: {
    identify: '',
    name: '',
    inputData: [] as Property[],
    outputData: [] as Property[]
  },
  eventForm: {
    identify: '',
    name: '',
    type: 'info',
    outputData: [] as Property[]
  },
  paramForm: {
    identify: '',
    name: '',
    dataType: {
      type: 'int',
      specs: {
        min: 0,
        max: 100,
        step: 1,
        unit: ''
      } as Record<string, any>
    }
  },
  submitting: false,
  propertyDialogVisible: false,
  serviceDialogVisible: false,
  eventDialogVisible: false,
  paramDialogVisible: false,
  isPropertyEdit: false,
  isServiceEdit: false,
  isEventEdit: false,
  isParamEdit: false,
  editingPropertyIndex: -1,
  editingServiceIndex: -1,
  editingEventIndex: -1,
  editingParamIndex: -1,
  editingParamType: '' as 'input' | 'output' | 'event',
  currentDeviceTypeId: null as number | null  // 创建设备类型后获得的ID，用于保存模型
})

// 计算属性
const {
  activeTab, deviceTypeForm, modelForm, propertyForm, serviceForm, eventForm, paramForm,
  submitting, propertyDialogVisible, serviceDialogVisible, eventDialogVisible, paramDialogVisible,
  isPropertyEdit, isServiceEdit, isEventEdit, isParamEdit, editingPropertyIndex, editingServiceIndex,
  editingEventIndex, editingParamIndex, editingParamType, currentDeviceTypeId
} = toRefs(state)

// 确定是否是编辑模式
const isEditMode = computed(() => {
  return urlParams.value.mode === 'edit'
})

// 获取设备类型ID
const deviceTypeId = computed(() => {
  return urlParams.value.deviceTypeId
})

// 验证规则
const basicRules = {
  code: [
    { required: true, message: '请输入设备类型编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入设备类型名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入设备类型描述', trigger: 'blur' }
  ]
}

// 验证规则
const propertyRules = {
  identify: [
    { required: true, message: '请输入属性标识符', trigger: 'blur' },
    { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入属性名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  'dataType.type': [
    { required: true, message: '请选择数据类型', trigger: 'change' }
  ]
}

const serviceRules = {
  identify: [
    { required: true, message: '请输入服务标识符', trigger: 'blur' },
    { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入服务名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
}

const eventRules = {
  identify: [
    { required: true, message: '请输入事件标识符', trigger: 'blur' },
    { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入事件名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择事件类型', trigger: 'change' }
  ]
}

const paramRules = {
  identify: [
    { required: true, message: '请输入参数标识符', trigger: 'blur' },
    { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入参数名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  'dataType.type': [
    { required: true, message: '请选择数据类型', trigger: 'change' }
  ]
}

// 处理数据类型变化
const handleDataTypeChange = (type: string) => {
  // 数值类型
  if (['int', 'integer', 'number'].includes(type)) {
    propertyForm.value.dataType.specs = { min: 0, max: 100, step: 1, unit: '' }
  } else if (['float', 'decimal'].includes(type)) {
    propertyForm.value.dataType.specs = { min: 0.0, max: 100.0, step: 0.1, unit: '' }
  }
  // 字符串类型
  else if (['string', 'email', 'phone', 'url', 'ip', 'json', 'base64', 'hash', 'markdown', 'code'].includes(type)) {
    propertyForm.value.dataType.specs = { length: 255 }
  }
  // 布尔类型
  else if (['bool', 'boolean'].includes(type)) {
    propertyForm.value.dataType.specs = { trueLabel: '开', falseLabel: '关' }
  }
  // 枚举类型
  else if (['enum', 'singleSelect', 'multiSelect'].includes(type)) {
    propertyForm.value.dataType.specs = { values: [{ value: '0', label: '选项1' }] }
  }
  // 日期类型
  else if (type === 'date') {
    propertyForm.value.dataType.specs = { format: 'YYYY-MM-DD' }
  } else if (type === 'datetime') {
    propertyForm.value.dataType.specs = { format: 'YYYY-MM-DD HH:mm:ss' }
  } else if (type === 'time') {
    propertyForm.value.dataType.specs = { format: 'HH:mm:ss' }
  }
  // 经纬度类型
  else if (type === 'latlng') {
    propertyForm.value.dataType.specs = { lngRange: '-180,180', latRange: '-90,90' }
  }
  // 文件/图片类型
  else if (['file', 'image'].includes(type)) {
    propertyForm.value.dataType.specs = { maxSize: 10, extensions: '' }
  }
  // UUID、地址、定位、对象等类型不需要特殊规格
  else if (['uuid', 'address', 'location', 'object'].includes(type)) {
    propertyForm.value.dataType.specs = {}
  }
  // 默认值
  else {
    propertyForm.value.dataType.specs = {}
  }
}

// 处理数据类型变化
const handleParamDataTypeChange = (type: string) => {
  // 数值类型
  if (['int', 'integer', 'number'].includes(type)) {
    paramForm.value.dataType.specs = { min: 0, max: 100, step: 1, unit: '' }
  } else if (['float', 'decimal'].includes(type)) {
    paramForm.value.dataType.specs = { min: 0.0, max: 100.0, step: 0.1, unit: '' }
  }
  // 字符串类型
  else if (['string', 'email', 'phone', 'url', 'ip', 'json', 'base64', 'hash', 'markdown', 'code'].includes(type)) {
    paramForm.value.dataType.specs = { length: 255 }
  }
  // 布尔类型
  else if (['bool', 'boolean'].includes(type)) {
    paramForm.value.dataType.specs = { trueLabel: '开', falseLabel: '关' }
  }
  // 枚举类型
  else if (['enum', 'singleSelect', 'multiSelect'].includes(type)) {
    paramForm.value.dataType.specs = { values: [{ value: '0', label: '选项1' }] }
  }
  // 日期类型
  else if (type === 'date') {
    paramForm.value.dataType.specs = { format: 'YYYY-MM-DD' }
  } else if (type === 'datetime') {
    paramForm.value.dataType.specs = { format: 'YYYY-MM-DD HH:mm:ss' }
  } else if (type === 'time') {
    paramForm.value.dataType.specs = { format: 'HH:mm:ss' }
  }
  // 经纬度类型
  else if (type === 'latlng') {
    paramForm.value.dataType.specs = { lngRange: '-180,180', latRange: '-90,90' }
  }
  // 文件/图片类型
  else if (['file', 'image'].includes(type)) {
    paramForm.value.dataType.specs = { maxSize: 10, extensions: '' }
  }
  // UUID、地址、定位等类型不需要特殊规格
  else if (['uuid', 'address', 'location'].includes(type)) {
    paramForm.value.dataType.specs = {}
  }
  // 默认值
  else {
    paramForm.value.dataType.specs = {}
  }
}

// 添加和删除枚举值
const addEnumValue = () => {
  if (!propertyForm.value.dataType.specs.values) {
    propertyForm.value.dataType.specs.values = []
  }
  propertyForm.value.dataType.specs.values.push({ value: '', label: '' })
}

const removeEnumValue = (index: number) => {
  propertyForm.value.dataType.specs.values.splice(index, 1)
}

const addParamEnumValue = () => {
  if (!paramForm.value.dataType.specs.values) {
    paramForm.value.dataType.specs.values = []
  }
  paramForm.value.dataType.specs.values.push({ value: '', label: '' })
}

const removeParamEnumValue = (index: number) => {
  paramForm.value.dataType.specs.values.splice(index, 1)
}

// 格式化数据类型规格
const formatDataTypeSpecs = (dataType: DataType) => {
  if (!dataType || !dataType.specs) return ''
  const specs = dataType.specs
  const type = dataType.type
  
  // 数值类型
  if (['int', 'integer', 'number', 'float', 'decimal'].includes(type)) {
    if (specs.min !== undefined && specs.max !== undefined) {
      return `范围: ${specs.min} - ${specs.max}${specs.unit ? ', 单位: ' + specs.unit : ''}${specs.step ? ', 步长: ' + specs.step : ''}`
    }
  }
  // 字符串类型
  else if (['string', 'email', 'phone', 'url', 'ip', 'json', 'base64', 'hash', 'markdown', 'code'].includes(type)) {
    if (specs.length !== undefined) {
      return `最大长度: ${specs.length}`
    }
  }
  // 布尔类型 (兼容旧格式)
  else if (['bool', 'boolean'].includes(type)) {
    // 兼容旧格式 { '0': '关', '1': '开' }
    if (specs['0'] && specs['1']) {
      return `${specs['0']} / ${specs['1']}`
    }
    // 新格式 { trueLabel: '开', falseLabel: '关' }
    else if (specs.trueLabel && specs.falseLabel) {
      return `${specs.falseLabel} / ${specs.trueLabel}`
    }
  }
  // 枚举类型
  else if (['enum', 'singleSelect', 'multiSelect'].includes(type)) {
    if (specs.values && Array.isArray(specs.values)) {
      return specs.values.map((v: any) => `${v.label}(${v.value})`).join(', ')
    }
  }
  // 日期类型
  else if (['date', 'datetime', 'time'].includes(type)) {
    if (specs.format) {
      return `格式: ${specs.format}`
    }
  }
  // 经纬度类型
  else if (type === 'latlng') {
    const parts = []
    if (specs.lngRange) parts.push(`经度: ${specs.lngRange}`)
    if (specs.latRange) parts.push(`纬度: ${specs.latRange}`)
    return parts.join(', ')
  }
  // 文件/图片类型
  else if (['file', 'image'].includes(type)) {
    const parts = []
    if (specs.maxSize) parts.push(`最大: ${specs.maxSize}MB`)
    if (specs.extensions) parts.push(`扩展名: ${specs.extensions}`)
    return parts.join(', ')
  }
  // UUID、地址、定位、对象等类型
  else if (['uuid', 'address', 'location', 'object'].includes(type)) {
    return '无额外约束'
  }
  
  return ''
}

// 获取事件类型文本和标签类型
const getEventTypeText = (type: string) => {
  switch(type) {
    case 'info': return '信息'
    case 'warning': return '告警'
    case 'error': return '故障'
    default: return type
  }
}

const getEventTypeTag = (type: string) => {
  switch(type) {
    case 'info': return 'info'
    case 'warning': return 'warning'
    case 'error': return 'danger'
    default: return 'info'
  }
}

// 获取访问模式文本
const getAccessModeText = (mode: string) => {
  switch(mode) {
    case 'rw': return '读写'
    case 'r': return '只读'
    case 'w': return '只写'
    default: return mode
  }
}

// 获取数据类型中文标签
const getDataTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    // 字符串类
    'string': '字符串',
    'email': '邮箱',
    'phone': '电话',
    'url': 'URL',
    'ip': 'IP地址',
    'json': 'JSON',
    'base64': 'Base64',
    'hash': 'Hash',
    'markdown': 'Markdown文本',
    'code': '代码块',
    // 数值类
    'number': '数字',
    'integer': '整数',
    'decimal': '小数',
    'float': '浮点数',
    'int': '整数',
    // 日期类
    'date': '日期',
    'datetime': '日期时间',
    'time': '时间',
    // 布尔类
    'boolean': '布尔值',
    'bool': '布尔值',
    // 标识符类
    'uuid': 'UUID',
    // 枚举类
    'enum': '枚举',
    'singleSelect': '单选',
    'multiSelect': '多选',
    // 地理/地址类
    'address': '地址',
    'location': '定位',
    'latlng': '经纬度',
    // 文件/媒体类
    'file': '文件',
    'image': '图片',
    // 其他
    'object': '智能对象',
  }
  return typeMap[type] || type
}

// 初始化表单数据
const resetDeviceTypeForm = () => {
  deviceTypeForm.value = {
    code: '',
    name: '',
    description: ''
  }
}

// 初始化表单数据
const resetModelForm = () => {
  modelForm.value = {
    properties: [],
    services: [],
    events: []
  }
}

// 初始化属性表单
const initPropertyForm = () => {
  propertyForm.value = {
    identify: '',
    name: '',
    accessMode: 'rw',
    dataType: {
      type: 'int',
      specs: {
        min: 0,
        max: 100,
        step: 1,
        unit: ''
      } as Record<string, any>
    }
  }
}

// 初始化服务表单
const initServiceForm = () => {
  serviceForm.value = {
    identify: '',
    name: '',
    inputData: [],
    outputData: []
  }
}

// 初始化事件表单
const initEventForm = () => {
  eventForm.value = {
    identify: '',
    name: '',
    type: 'info',
    outputData: []
  }
}

// 初始化参数表单
const initParamForm = () => {
  paramForm.value = {
    identify: '',
    name: '',
    dataType: {
      type: 'int',
      specs: {
        min: 0,
        max: 100,
        step: 1,
        unit: ''
      } as Record<string, any>
    }
  }
}

// 加载设备类型数据
const loadDeviceTypeData = async (id: number) => {
  try {
    // 从API获取设备类型数据
    const res: any = await getDeviceTypeById(id)
    if (res.data) {
      const deviceType = res.data
      // 加载基本信息'
      deviceTypeForm.value.code = deviceType.code || ''
      deviceTypeForm.value.name = deviceType.name || ''
      deviceTypeForm.value.description = deviceType.description || ''
      
      // 加载模型数据（如果有）
      if (deviceType.model) {
        modelForm.value = deviceType.model
      } else {
        resetModelForm()
      }
    }
  } catch (error) {
    console.error('加载设备类型数据失败:', error)
    ElMessage.error('加载设备类型数据失败')
  }
}

// 监听URL参数变化，加载对应的设备类型数据
watch(() => urlParams.value, async (newParams) => {
  if (newParams.mode === 'edit' && newParams.deviceTypeId) {
    await loadDeviceTypeData(newParams.deviceTypeId)
  } else {
    resetDeviceTypeForm()
    resetModelForm()
  }
}, { immediate: true })

onMounted(async () => {
  if (isEditMode.value && deviceTypeId.value) {
    await loadDeviceTypeData(deviceTypeId.value)
  } else {
    resetDeviceTypeForm()
    resetModelForm()
  }
})

// 返回列表
const navigateBack = () => {
  // 在workbench的iframe环境中，使用postMessage通知父窗口打开新URL
  const url = '/apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-type-list/index.html'
  
  // 使用workbench的postMessage机制
  if (window.top && window.top !== window) {
    window.top.postMessage({
      eventType: 'invoke',
      method: 'openUrl',
      params: [
        'device-type-list',
        'device-type-list',
        '设备类型列表',
        url
      ]
    }, '*')
  } else {
    // 如果不在iframe中，直接跳转
    window.location.href = url
  }
}

// 保存模型到数据库
const saveModel = async (deviceTypeId: number) => {
  try {
    const modelData = {
      properties: modelForm.value.properties || [],
      services: modelForm.value.services || [],
      events: modelForm.value.events || []
    }
    await updateDeviceTypeModel(deviceTypeId, modelData)
    return true
  } catch (error) {
    console.error('保存模型失败:', error)
    throw error
  }
}

// 提交表单
const submitForm = async () => {
  if (!deviceTypeFormRef.value) return
  await deviceTypeFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEditMode.value && deviceTypeId.value) {
          // 更新设备类型
          await deviceTypeStore.updateDeviceType(deviceTypeId.value, deviceTypeForm.value)
          // 更新设备类型模型
          await saveModel(deviceTypeId.value)
          ElMessage.success('更新成功')
        } else if (currentDeviceTypeId.value) {
          // 如果已经有设备类型ID，说明是在编辑模型，只保存模型
          await saveModel(currentDeviceTypeId.value)
          ElMessage.success('模型已保存')
        } else {
          // 创建设备类型 - 符合接口文档格式
          const createData = {
            code: deviceTypeForm.value.code,
            name: deviceTypeForm.value.name,
            description: deviceTypeForm.value.description
          }
          
          const result = await deviceTypeStore.createDeviceType(createData)
          if (result && result.id) {
            currentDeviceTypeId.value = result.id
            // 如果有模型数据，立即保存
            if (modelForm.value.properties.length > 0 || modelForm.value.services.length > 0 || modelForm.value.events.length > 0) {
              await saveModel(result.id)
            }
            // 激活属性选项卡
            activeTab.value = 'property'
            ElMessage.success('创建成功，请继续定义设备类型模型')
          } else {
            throw new Error('创建设备类型失败，未返回有效ID')
          }
        }
      } catch (error) {
        console.error(error)
        ElMessage.error(isEditMode.value ? '更新失败' : '创建失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

// 属性相关方法
const addProperty = () => {
  initPropertyForm()
  isPropertyEdit.value = false
  propertyDialogVisible.value = true
}

const editProperty = (property: Property, index: number) => {
  propertyForm.value = JSON.parse(JSON.stringify(property))
  isPropertyEdit.value = true
  editingPropertyIndex.value = index
  propertyDialogVisible.value = true
}

const removeProperty = async (index: number) => {
  modelForm.value.properties.splice(index, 1)
  // 如果有设备类型ID，自动保存模型
  if (currentDeviceTypeId.value || deviceTypeId.value) {
    try {
      await saveModel(currentDeviceTypeId.value || deviceTypeId.value!)
      ElMessage.success('属性已删除')
    } catch (error) {
      ElMessage.error('删除属性失败')
    }
  }
}

const submitPropertyForm = async () => {
  if (!propertyFormRef.value) return
  
  await propertyFormRef.value.validate(async (valid) => {
    if (valid) {
      const property = JSON.parse(JSON.stringify(propertyForm.value))
      if (isPropertyEdit.value) {
        // 更新现有属性
        modelForm.value.properties[editingPropertyIndex.value] = JSON.parse(JSON.stringify(propertyForm.value))
      } else {
        // 添加新属性
        modelForm.value.properties.push(JSON.parse(JSON.stringify(propertyForm.value)))
      }
      propertyDialogVisible.value = false
      
      // 如果有设备类型ID，自动保存模型
      if (currentDeviceTypeId.value || deviceTypeId.value) {
        try {
          await saveModel(currentDeviceTypeId.value || deviceTypeId.value!)
          ElMessage.success('属性已保存')
        } catch (error) {
          ElMessage.error('保存属性失败')
        }
      }
    }
  })
}

// 服务相关方法
const addService = () => {
  initServiceForm()
  isServiceEdit.value = false
  serviceDialogVisible.value = true
}

const editService = (service: Service, index: number) => {
  serviceForm.value = JSON.parse(JSON.stringify(service))
  isServiceEdit.value = true
  editingServiceIndex.value = index
  serviceDialogVisible.value = true
}

const removeService = async (index: number) => {
  modelForm.value.services.splice(index, 1)
  // 如果有设备类型ID，自动保存模型
  if (currentDeviceTypeId.value || deviceTypeId.value) {
    try {
      await saveModel(currentDeviceTypeId.value || deviceTypeId.value!)
      ElMessage.success('服务已删除')
    } catch (error) {
      ElMessage.error('删除服务失败')
    }
  }
}

const submitServiceForm = async () => {
  if (!serviceFormRef.value) return
  
  await serviceFormRef.value.validate(async (valid) => {
    if (valid) {
      const service = JSON.parse(JSON.stringify(serviceForm.value))
      if (isServiceEdit.value) {
        // 更新现有服务
        modelForm.value.services[editingServiceIndex.value] = JSON.parse(JSON.stringify(serviceForm.value))
      } else {
        // 添加新服务
        modelForm.value.services.push(JSON.parse(JSON.stringify(serviceForm.value)))
      }
      serviceDialogVisible.value = false
      
      // 如果有设备类型ID，自动保存模型
      if (currentDeviceTypeId.value || deviceTypeId.value) {
        try {
          await saveModel(currentDeviceTypeId.value || deviceTypeId.value!)
          ElMessage.success('服务已保存')
        } catch (error) {
          ElMessage.error('保存服务失败')
        }
      }
    }
  })
}

// 添加服务参数
const addServiceParam = (type: 'input' | 'output') => {
  initParamForm()
  isParamEdit.value = false
  editingParamType.value = type
  serviceDialogVisible.value = true
  paramDialogVisible.value = true
}

const editServiceParam = (type: 'input' | 'output', param: Property, index: number) => {
  paramForm.value = JSON.parse(JSON.stringify(param))
  isParamEdit.value = true
  editingParamType.value = type
  editingParamIndex.value = index
  paramDialogVisible.value = true
}

const removeServiceParam = (type: 'input' | 'output', index: number) => {
  if (type === 'input') {
    serviceForm.value.inputData.splice(index, 1)
  } else {
    serviceForm.value.outputData.splice(index, 1)
  }
}

// 事件相关方法
const addEvent = () => {
  initEventForm()
  isEventEdit.value = false
  eventDialogVisible.value = true
}

const editEvent = (event: Event, index: number) => {
  eventForm.value = JSON.parse(JSON.stringify(event))
  isEventEdit.value = true
  editingEventIndex.value = index
  eventDialogVisible.value = true
}

const removeEvent = async (index: number) => {
  modelForm.value.events.splice(index, 1)
  // 如果有设备类型ID，自动保存模型
  if (currentDeviceTypeId.value || deviceTypeId.value) {
    try {
      await saveModel(currentDeviceTypeId.value || deviceTypeId.value!)
      ElMessage.success('事件已删除')
    } catch (error) {
      ElMessage.error('删除事件失败')
    }
  }
}

const submitEventForm = async () => {
  if (!eventFormRef.value) return
  
  await eventFormRef.value.validate(async (valid) => {
    if (valid) {
      const event = JSON.parse(JSON.stringify(eventForm.value))
      if (isEventEdit.value) {
        // 更新现有事件
        modelForm.value.events[editingEventIndex.value] = JSON.parse(JSON.stringify(eventForm.value))
      } else {
        // 添加新事件
        modelForm.value.events.push(JSON.parse(JSON.stringify(eventForm.value)))
      }
      eventDialogVisible.value = false
      
      // 如果有设备类型ID，自动保存模型
      if (currentDeviceTypeId.value || deviceTypeId.value) {
        try {
          await saveModel(currentDeviceTypeId.value || deviceTypeId.value!)
          ElMessage.success('事件已保存')
        } catch (error) {
          ElMessage.error('保存事件失败')
        }
      }
    }
  })
}

// 添加事件参数
const addEventParam = () => {
  initParamForm()
  isParamEdit.value = false
  editingParamType.value = 'event'
  eventDialogVisible.value = true
  paramDialogVisible.value = true
}

const editEventParam = (param: Property, index: number) => {
  paramForm.value = JSON.parse(JSON.stringify(param))
  isParamEdit.value = true
  editingParamType.value = 'event'
  editingParamIndex.value = index
  paramDialogVisible.value = true
}

const removeEventParam = (index: number) => {
  eventForm.value.outputData.splice(index, 1)
}

// 提交参数表单
const submitParamForm = async () => {
  if (!paramFormRef.value) return
  await paramFormRef.value.validate(async (valid) => {
    if (valid) {
      const param = JSON.parse(JSON.stringify(paramForm.value))
      if (editingParamType.value === 'input') {
        if (isParamEdit.value) {
          serviceForm.value.inputData[editingParamIndex.value] = param
        } else {
          serviceForm.value.inputData.push(param)
        }
      } else if (editingParamType.value === 'output') {
        if (isParamEdit.value) {
          serviceForm.value.outputData[editingParamIndex.value] = param
        } else {
          serviceForm.value.outputData.push(param)
        }
      } else if (editingParamType.value === 'event') {
        if (isParamEdit.value) {
          eventForm.value.outputData[editingParamIndex.value] = param
        } else {
          eventForm.value.outputData.push(param)
        }
      }
      paramDialogVisible.value = false
    }
  })
}

// 移除旧的watch，改为在操作时直接保存

// JSON对话框相关状态
const jsonDialogVisible = ref(false)

// 格式化JSON
const formattedModelJson = computed(() => {
  return JSON.stringify(modelForm.value, null, 2)
})

// 显示模型JSON
const showModelJson = () => {
  jsonDialogVisible.value = true
}

// 复制JSON内容
const copyModelJson = () => {
  navigator.clipboard.writeText(formattedModelJson.value)
    .then(() => {
      ElMessage.success('JSON已复制到剪贴板')
    })
    .catch(err => {
      console.error('复制失败:', err)
      ElMessage.error('复制失败')
    })
}
</script>

<style scoped>
.device-type-setting {
  padding: 20px;
}

.devicetype-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.basic-info-card {
  margin-bottom: 20px;
}

.model-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
}

.section-actions {
  display: flex;
  gap: 10px;
}

.enum-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.enum-value, .enum-label {
  flex: 1;
}

.params-section {
  margin-bottom: 20px;
}

.json-viewer {
  background-color: #f5f7fa;
  color: #606266;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow: auto;
  max-height: 60vh;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
