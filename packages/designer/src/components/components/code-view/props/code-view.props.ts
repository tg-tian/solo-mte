/**
 * Copyright (c) 2020 - present, Inspur Genersoft Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { DesignerMode } from '../../../../components/types/designer-context';
import { ExtractPropTypes } from 'vue';

export const codeViewProps = {
    entryFilePath: { type: String, default: '' },
    usePresetConfigs: { type: Boolean, default: true },
    /**
 * 保存全部时直接反馈保存结果
 * @remarks
 * 右上角的“保存”按钮即为保存全部按钮，当点击该按钮时应该同时保存代码视图和外层的表单或BE设计器
 * 默认应该由外层的设计器组件通过接收saveAll事件的参数，统一地反馈保存结果
 * 当保存全部时，不推荐通过本组件直接反馈结果，因为设计器也应该反馈结果，导致弹出多条反馈信息
 */
    directlyNotifySaveAllResults: { type: Boolean, default: false },
    /** 当前运行的设计器环境 */
    designerMode: { type: DesignerMode, default: 'PC' },
    /** 表单基础信息，包括表单路径、ID、维度等 */
    formBasicInfo: { type: Object }
} as Record<string, any>;

export type CodeViewProps = ExtractPropTypes<typeof codeViewProps>;

