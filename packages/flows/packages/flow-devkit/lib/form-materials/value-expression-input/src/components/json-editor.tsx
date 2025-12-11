import { defineComponent, ref, watch, computed, onUnmounted, type PropType } from "vue";
import { useBem } from '@farris/flow-devkit/utils';
import { createJSONEditor, Mode, createAjvValidator } from 'vanilla-jsoneditor';
import type { JsonEditor, TextContent, JSONContent, Content, JSONSchema } from 'vanilla-jsoneditor';

import './json-editor.scss';

const COMPONENT_NAME = 'FvfJsonEditor';

export default defineComponent({
  name: COMPONENT_NAME,
  props: {
    value: {
      type: String,
    },
    schema: {
      type: Object as PropType<JSONSchema>,
    },
  },
  emits: {
    'update:value': (_newValue: string) => {
      return true;
    },
  },
  setup(props, context) {
    const { bem } = useBem(COMPONENT_NAME);

    const jsonEditorContainer = ref();
    let jsonEditor: JsonEditor | undefined;

    const currentValue = computed<TextContent>(() => ({
      text: props.value || '',
    }));

    const validator = computed(() => {
      if (!props.schema) {
        return undefined;
      }
      return createAjvValidator({
        schema: props.schema,
      });
    });

    watch(currentValue, () => {
      jsonEditor?.update(currentValue.value);
    });

    function updateValue(updatedContent: TextContent): void {
      context.emit('update:value', updatedContent.text);
    }

    function getContent(): Content {
      try {
        const json = JSON.parse(currentValue.value.text);
        const jsonContent: JSONContent = { json };
        return jsonContent;
      } catch {
        return currentValue.value;
      }
    }

    function createEditor(): void {
      jsonEditor = createJSONEditor({
        target: jsonEditorContainer.value,
        props: {
          content: getContent(),
          mode: Mode.text,
          mainMenuBar: false,
          statusBar: true,
          askToFormat: false,
          validator: validator.value,
          onChange: (updatedContent: TextContent) => {
            updateValue(updatedContent);
          },
        }
      });
    }

    function destroyEditor(): void {
      jsonEditor?.destroy();
      jsonEditor = undefined;
    }

    watch(
      () => jsonEditorContainer.value,
      () => {
        if (jsonEditorContainer.value) {
          createEditor();
        } else {
          destroyEditor();
        }
      },
    );

    onUnmounted(destroyEditor);

    return () => (
      <div ref={jsonEditorContainer} class={bem()}></div>
    );
  },
});
