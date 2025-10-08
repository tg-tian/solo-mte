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
import { SetupContext, defineComponent, getCurrentInstance, onMounted, ref, watch } from 'vue';
import { commandCodeViewProps, CommandCodeViewProps } from './command-code-view.props';
import { FCodeEditorDesigner } from '../../code-editor-designer';
import FProcessEdit from './components/process-edit';
import FCodeLoading from './components/command-loading';
import { CommandCodeViewController } from './composition/controller/command-code-view';

export default defineComponent({
    name: 'FCommandCodeView',
    props: commandCodeViewProps,
    emits: [] as (string[] & ThisType<void>) | undefined,
    setup(props: CommandCodeViewProps, context: SetupContext) {
        const codeEditorDesigner = ref();
        const processEdit=ref();
        const loading = ref(false);
        const viewController = new CommandCodeViewController();
        // 加载后
        onMounted(() => {
            viewController.init(loading, codeEditorDesigner,processEdit);
        });
        context.expose({ loading });

        return () => {
            return (
                <div class="editor-panel--wrapper">
                    <FCodeLoading show={loading.value} size={84} delay={50}></FCodeLoading>
                    <div class="center-panel app-iframe-panel--wrapper h-100" >
                        <FCodeEditorDesigner ref={codeEditorDesigner}></FCodeEditorDesigner>
                        <FProcessEdit ref={processEdit} style="display:none;"></FProcessEdit>
                    </div >
                </div>
            );
        };
    }
});
