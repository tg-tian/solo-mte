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
import { ExtractPropTypes, PropType } from 'vue';
import { FieldOption } from '../composition/type/fields-getter';

export const fieldsGetterProps = {
    fields: { type: Object as PropType<Array<FieldOption>>, default: [] },
    /** 点击确定按钮的回调函数 */
    resolveFunc: { type: Object as PropType<(value: any) => void>, default: (value = null) => { } },
    /** 点击取消按钮的回调函数 */
    rejectFunc: { type: Object as PropType<(reason: any) => void>, default: (reason = null) => { } },

} as Record<string, any>;

export type FieldsGetterProps = ExtractPropTypes<typeof fieldsGetterProps>;

