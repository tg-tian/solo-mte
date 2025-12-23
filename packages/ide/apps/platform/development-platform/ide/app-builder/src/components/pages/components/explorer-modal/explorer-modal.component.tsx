// import { defineComponent, onMounted, ref, computed } from "vue";
// import axios from "axios";

// declare global {
//     var gsp: any;
// }

// interface FileItem {
//     name: string;
//     path: string;
//     type: 'file' | 'directory';
//     [key: string]: any;
// }

// export default defineComponent({
//     name: 'IdeExplorerModal',
//     emits: ['openFile'],
//     setup(props, context) {
//         const path = ref('');
//         const selected = ref<FileItem | null>(null);
//         const files = ref<FileItem[]>([]);

//         const basePath = computed(() => gsp.context.getValue('path'));

//         function loadFiles(p?: string) {
//             if (!p) {
//                 p = basePath.value;
//             }
//             const url = '/api/dev/main/v1.0/project/tree' + p + '?depth=1&includeFiles=true';
//             axios.get(url).then((n: any) => {
//                 if (n.children) {
//                     path.value = p.replace(basePath.value, '');
//                     files.value = n.children.map((a: any) => a.node);
//                 }
//             });
//         }

//         function open(file: FileItem) {
//             if (file.type !== 'file') {
//                 loadFiles(file.path);
//             } else {
//                 if (selected.value === file) {
//                     selected.value = null;
//                 } else {
//                     selected.value = file;
//                 }
//             }
//         }

//         function onPathChange($event: Event) {
//             const target = $event.target as HTMLInputElement;
//             path.value = target.value;
//             loadFiles(basePath.value + path.value);
//         }

//         function ondblClick($event: MouseEvent, f: FileItem) {
//             if (f.type === 'file') {
//                 context.emit('openFile', f);
//             }
//         }

//         onMounted(() => {
//             path.value = gsp.context.getValue('path');
//             loadFiles();
//         });

//         return () => {
//             return (
//                 <div class="explorer-modal">
//                     <input
//                         type="text"
//                         value={path.value}
//                         onInput={onPathChange}
//                         class="form-control"
//                     />
//                     <ul class="list-group">
//                         {files.value.map(f => (
//                             <li
//                                 key={f.path || f.name}
//                                 class={{ 'list-group-item': true, 'list-group-item-info': selected.value === f }}
//                                 onClick={() => open(f)}
//                                 onDblclick={(e: MouseEvent) => ondblClick(e, f)}
//                             >
//                                 {f.type !== 'file' && <span class="f-icon f-icon-file-folder-close"></span>}
//                                 {f.type === 'file' && <span class="f-icon f-icon-file-txt"></span>}
//                                 {f.name}
//                             </li>
//                         ))}
//                     </ul>
//                 </div>
//             );
//         };
//     }
// });

