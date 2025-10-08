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
import { ExtractPropTypes } from 'vue';

export const entityTreeProps = {
    /** 表单schema */
    data: { type: Object, default: [] },
    /** 拖拽框架 */
    dragula: { type: Object }

} as Record<string, any>;

export type EntityTreeProps = ExtractPropTypes<typeof entityTreeProps>;


export const createNewEntityProps = {
    useFormSchema: { type: Object },
    /** 当前已存在的实体编号 */
    existedEntityCodes: { type: Array<string> }
} as Record<string, any>;
export type CreateNewEntityProps = ExtractPropTypes<typeof createNewEntityProps>;


export const createNewFieldProps = {
    useFormSchema: { type: Object },
    /** 当前实体 */
    entityCode: { type: String },
    /** 当前实体中已有的字段 */
    existedAllFields: { type: Object },
    /** 当前实体是否为新建的子实体 */
    isNewEntity: { type: Boolean }
} as Record<string, any>;
export type CreateNewFieldProps = ExtractPropTypes<typeof createNewFieldProps>;

export const modifyFieldProps = {
    useFormSchema: { type: Object },
    /** 当前实体 */
    entityCode: { type: String },
    /** 当前编辑的字段节点 */
    fieldNode: { type: Object },
    /** 当前实体中已有的字段 */
    existedAllFields: { type: Object },
} as Record<string, any>;
export type ModifyFieldProps = ExtractPropTypes<typeof modifyFieldProps>;

