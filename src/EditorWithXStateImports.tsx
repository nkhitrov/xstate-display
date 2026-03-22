import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { themes } from './editor-themes';
import { useEmbed } from './embedContext';
import { localCache } from './localCache';
import { prettierLoader } from './prettier';
import { SpinnerWithText } from './SpinnerWithText';
import { useEditorTheme } from './themeContext';


/**
 * CtrlCMD + Enter => format => update chart
 * Click on update chart button => update chart
 * Click on save/update => save/update to registry
 * CtrlCMD + S => format => save/update to registry
 */

interface EditorWithXStateImportsProps {
  onChange?: (text: string) => void;
  onMount?: OnMount;
  onSave?: () => void;
  onFormat?: () => void;
  value: string;
}

// Type acquisition disabled - no-op wrapper
const withTypeAcquisition = (
  editor: editor.IStandaloneCodeEditor,
  _monaco: Monaco,
): editor.IStandaloneCodeEditor => {
  return editor;
};

export const EditorWithXStateImports = (
  props: EditorWithXStateImportsProps,
) => {
  const embed = useEmbed();
  const editorTheme = useEditorTheme();
  const editorRef = useRef<typeof editor | null>(null);
  const definedEditorThemes = useRef(new Set<string>());

  useEffect(() => {
    const editor = editorRef.current;
    const definedThemes = definedEditorThemes.current;
    const theme = editorTheme.theme;

    if (!editor || !definedThemes) {
      return;
    }

    if (!definedThemes.has(theme)) {
      editor.defineTheme(theme, themes[theme]);
    }
    editor.setTheme(theme);
    localCache.saveEditorTheme(editorTheme.theme);
  }, [editorTheme.theme]);

  return (
    <Editor
      defaultPath="main.ts"
      defaultLanguage="typescript"
      value={props.value}
      options={{
        minimap: { enabled: false },
        tabSize: 2,
        glyphMargin: true,
        readOnly: embed?.isEmbedded && embed.readOnly,
      }}
      loading={<SpinnerWithText text="Preparing the editor" />}
      onChange={(text) => {
        if (typeof text === 'string') {
          props.onChange?.(text);
        }
      }}
      theme="vs-dark"
      onMount={async (editor, monaco) => {
        editorRef.current = monaco.editor;
        const theme = editorTheme.theme;
        monaco.editor.defineTheme(theme, themes[theme]);
        monaco.editor.setTheme(theme);

        monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
          customWorkerPath: `${new URL(
            window.location.origin,
          )}viz/ts-worker.js`,
        });

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
          module: monaco.languages.typescript.ModuleKind.CommonJS,
          moduleResolution:
            monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          strict: true,
        });

        // Prettier to format
        // Ctrl/CMD + Enter to visualize
        editor.addAction({
          id: 'format',
          label: 'Format',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
          run: (editor) => {
            editor.getAction('editor.action.formatDocument').run();
          },
        });

        monaco.languages.registerDocumentFormattingEditProvider('typescript', {
          provideDocumentFormattingEdits: async (model) => {
            try {
              return [
                {
                  text: await prettierLoader.format(editor.getValue()),
                  range: model.getFullModelRange(),
                },
              ];
            } catch (err) {
              console.error(err);
            } finally {
              props.onFormat?.();
            }
          },
        });

        // Ctrl/CMD + S to save/update to registry
        editor.addAction({
          id: 'save',
          label: 'Save',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
          run: () => {
            props.onSave?.();
            editor.getAction('editor.action.formatDocument').run();
          },
        });

        const wrappedEditor = withTypeAcquisition(editor, monaco);
        props.onMount?.(wrappedEditor, monaco);
      }}
    />
  );
};

export default EditorWithXStateImports;
