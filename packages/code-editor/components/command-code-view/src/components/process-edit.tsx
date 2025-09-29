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
import { SetupContext, computed, defineComponent, ref, watch } from 'vue';
import { processEditProps, ProcessEditProps } from './process-edit.props';
import { ProcessEditController } from '../composition/controller/process-edit';
import { IClass } from '../type/classes.interface';
// 暂时作为空组件处理数据逻辑

export default defineComponent({
    name: 'FProcessEdit',
    props: processEditProps,
    emits: [] as (string[] & ThisType<void>) | undefined,
    setup(props: ProcessEditProps, context: SetupContext) {
        const processController = new ProcessEditController();
        /**
         * 初始化构件编辑器
         * @param fullPath 文件路径
         */
        function init(fullPath: string): void {
            processController.init(fullPath);
        }
        /**
         * 保存
         * @remarks
         * 由于与IDE“代码视图”进行集成，本设计器组件不再持有ts代码
         * 当IDE进行保存操作时，将调用本方法
         * 如果不存在ts代码，则仅保存构件元数据
         * @param tscode ts代码
         * @param classes 类结构描述
         */
        function save(tscode?: string, classes?: IClass[]): Promise<string> {
            // 保存ts文件并重新发布构件
            return new Promise((resolve, reject) => {
                processController.getDataSource().saveTsAndRepublishAll(tscode, classes).then((data) => {
                    resolve(data);
                }).catch((data) => {
                    reject(data);
                });
            });

        }
        context.expose({ init, save });
        
        return () => {
            return <></>;
        };
    }
});
