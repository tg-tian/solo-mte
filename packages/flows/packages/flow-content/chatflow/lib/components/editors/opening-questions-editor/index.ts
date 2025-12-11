import OpeningQuestionsEditorInstallless from './src/opening-questions-editor.component';
import { withInstall, withRegister } from '@farris/flow-devkit';

export * from './src/opening-questions-editor.props';

const OPENING_QUESTIONS_EDITOR_NAME = 'opening-questions-editor';

const propsResolver = (props: any) => {
  return {
    ...props,
    placeholder: props.placeholder || '请输入问题内容',
    maxLength: props.maxLength || 500,
    maxQuestions: props.maxQuestions || 10
  };
};

const OpeningQuestionsEditor = withInstall(OpeningQuestionsEditorInstallless);
withRegister(OpeningQuestionsEditor, { name: OPENING_QUESTIONS_EDITOR_NAME, propsResolver });

export { OpeningQuestionsEditor };
export default OpeningQuestionsEditor;
