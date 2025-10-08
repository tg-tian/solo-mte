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
import { defineComponent, ref, SetupContext, onMounted, onBeforeUnmount } from 'vue';
import './code-view.scss';
import { ViewIframeProps, viewIframeProps } from '../props/view-iframe.props';

export default defineComponent({
    name: 'FViewIframeDesign',
    props: viewIframeProps,
    emits: ['iframeClick'] as (string[] & ThisType<void>) | undefined,
    setup(props: ViewIframeProps, context: SetupContext) {
        const iframeInstance = ref();
        function handleLoadEvent(): void {
            props.handleLoad && props.handleLoad(iframeInstance.value);
        }
        function init() {
            const iframeEl: HTMLIFrameElement = iframeInstance.value;
            iframeEl.addEventListener('load', () => {

                if (!iframeEl.contentDocument) {
                    return;
                }

                // 向外传递click事件
                iframeEl.contentDocument.addEventListener('click', (e) => {
                    // 当前元素
                    // el.nativeElement.click();
                    context.emit('iframeClick', e);
                });

                // 向外传递按键事件，实现全局支持快捷键操作
                iframeEl.contentDocument.addEventListener('keydown', (e) => {
                    // 全局按键事件
                    // controller.keydownEmitter.next(e);
                });

                /*  代码编辑器，拖滚动条时出现跳动现象，暂时屏蔽
                // 向外传递mouseup事件，防止滚动条粘到光标上
                iframeEl.contentDocument.addEventListener('mouseup', (e) => {
                    if (!e.isTrusted) {
                        return;
                    }
                    const el: HTMLIFrameElement = iframeInstance.value;
                    const boundingClientRect = el.getBoundingClientRect();
                    const xOffset = boundingClientRect.left;
                    const yOffset = boundingClientRect.top;
                    try {
                        const upEvt = new MouseEvent("mouseup", {
                            "bubbles": true,
                            "cancelable": false,
                            "screenX": e.screenX,
                            "screenY": e.screenY,
                            "clientX": e.clientX + xOffset,
                            "clientY": e.clientY + yOffset,
                            "ctrlKey": e.ctrlKey,
                            "shiftKey": e.shiftKey,
                            "altKey": e.altKey,
                            "metaKey": e.metaKey,
                            "button": e.button,
                            "buttons": e.buttons,
                            "relatedTarget": e.relatedTarget
                        });
                        document.dispatchEvent(upEvt);
                    } catch (err) {
                        console.error(err);
                    }
                });

                // 向外传递mousemove事件，让滚动条可以拖动
                iframeEl.contentDocument.addEventListener('mousemove', (e) => {
                    if (!e.isTrusted) {
                        return;
                    }
                    const el: HTMLIFrameElement = iframeInstance.value;
                    const boundingClientRect = el.getBoundingClientRect();
                    const xOffset = boundingClientRect.left;
                    const yOffset = boundingClientRect.top;
                    try {
                        const moveEvt = new MouseEvent("mousemove", {
                            "bubbles": true,
                            "cancelable": false,
                            "screenX": e.screenX,
                            "screenY": e.screenY,
                            "clientX": e.clientX + xOffset,
                            "clientY": e.clientY + yOffset,
                            "ctrlKey": e.ctrlKey,
                            "shiftKey": e.shiftKey,
                            "altKey": e.altKey,
                            "metaKey": e.metaKey,
                            "button": e.button,
                            "buttons": e.buttons,
                            "relatedTarget": e.relatedTarget
                        });
                        document.dispatchEvent(moveEvt);
                    } catch (err) {
                        console.error(err);
                    }
                }); */
            });
        }
        onMounted(() => {
            init();
        });

        onBeforeUnmount(() => {
            iframeInstance.value.src = 'about:blank';
            iframeInstance.value.contentWindow.document.write('');
            iframeInstance.value.contentWindow.document.clear && iframeInstance.value.contentWindow.document.clear();
            iframeInstance.value.parentNode.removeChild(iframeInstance.value);
            iframeInstance.value = null;
        });

        return () => {
            return (
                <iframe class="h-100 w-100 border-0" ref={iframeInstance} src={props.url} frameborder="0" onLoad={(event) => handleLoadEvent()} allowtransparency="true"></iframe>
            );
        };
    }
});
