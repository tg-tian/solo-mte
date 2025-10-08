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
import { commandLoadingProps, CommandLoadingProps } from './command-loading.props';

export default defineComponent({
    name: 'FCommandLoading',
    props: commandLoadingProps,
    emits: [] as (string[] & ThisType<void>) | undefined,
    setup(props: CommandLoadingProps, context: SetupContext) {

        const circularStyle = computed(() => {
            return {
                width: `${props.size}px`,
                height: `${props.size}px`,
                animationDelay: `${props.delay}ms`
            };
        });

        return () => {
            return (
                <div class="ide-loading-overlay" style={{ display: props.show ? null : 'none' }}>
                    <svg viewBox="25 25 50 50" class="circular" style={circularStyle.value} >
                        <circle cx="50" cy="50" r="20" fill="none" class="path"></circle>
                    </svg >
                </div>
            );
        };
    }
});
