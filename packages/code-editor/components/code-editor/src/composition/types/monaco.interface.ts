/**
 * 该文件向外导出一些monaco的接口信息
 */

/**
 * Options which apply for all editors.
 */
export interface IGlobalEditorOptions {
  /**
   * The number of spaces a tab is equal to.
   * This setting is overridden based on the file contents when `detectIndentation` is on.
   * Defaults to 4.
   */
  tabSize?: number;
  /**
   * Insert spaces when pressing `Tab`.
   * This setting is overridden based on the file contents when `detectIndentation` is on.
   * Defaults to true.
   */
  insertSpaces?: boolean;
  /**
   * Controls whether `tabSize` and `insertSpaces` will be automatically detected when a file is opened based on the file contents.
   * Defaults to true.
   */
  detectIndentation?: boolean;
  /**
   * Remove trailing auto inserted whitespace.
   * Defaults to true.
   */
  trimAutoWhitespace?: boolean;
  /**
   * Special handling for large files to disable certain memory intensive features.
   * Defaults to true.
   */
  largeFileOptimizations?: boolean;
  /**
   * Controls whether completions should be computed based on words in the document.
   * Defaults to true.
   */
  wordBasedSuggestions?: boolean;
  /**
   * Controls whether word based completions should be included from opened documents of the same language or any language.
   */
  wordBasedSuggestionsOnlySameLanguage?: boolean;
  /**
   * Controls whether the semanticHighlighting is shown for the languages that support it.
   * true: semanticHighlighting is enabled for all themes
   * false: semanticHighlighting is disabled for all themes
   * 'configuredByTheme': semanticHighlighting is controlled by the current color theme's semanticHighlighting setting.
   * Defaults to 'byTheme'.
   */
  'semanticHighlighting.enabled'?: true | false | 'configuredByTheme';
  /**
   * Keep peek editors open even when double clicking their content or when hitting `Escape`.
   * Defaults to false.
   */
  stablePeek?: boolean;
  /**
   * Lines above this length will not be tokenized for performance reasons.
   * Defaults to 20000.
   */
  maxTokenizationLineLength?: number;
  /**
   * Theme to be used for rendering.
   * The current out-of-the-box available themes are: 'vs' (default), 'vs-dark', 'hc-black'.
   * You can create custom themes via `monaco.editor.defineTheme`.
   * To switch a theme, use `monaco.editor.setTheme`.
   * **NOTE**: The theme might be overwritten if the OS is in high contrast mode, unless `autoDetectHighContrast` is set to false.
   */
  theme?: string;
  /**
   * If enabled, will automatically change to high contrast theme if the OS is using a high contrast theme.
   * Defaults to true.
   */
  autoDetectHighContrast?: boolean;
}

export interface IRulerOption {
  column: number;
  color: string | null;
}

export interface IGuidesOptions {
  /**
   * Enable rendering of bracket pair guides.
   * Defaults to false.
  */
  bracketPairs?: boolean | 'active';
  /**
   * Enable rendering of vertical bracket pair guides.
   * Defaults to 'active'.
   */
  bracketPairsHorizontal?: boolean | 'active';
  /**
   * Enable highlighting of the active bracket pair.
   * Defaults to true.
  */
  highlightActiveBracketPair?: boolean;
  /**
   * Enable rendering of indent guides.
   * Defaults to true.
   */
  indentation?: boolean;
  /**
   * Enable highlighting of the active indent guide.
   * Defaults to true.
   */
  highlightActiveIndentation?: boolean;
}

export type InUntrustedWorkspace = 'inUntrustedWorkspace';

/**
 * Configuration options for unicode highlighting.
 */
export interface IUnicodeHighlightOptions {
  nonBasicASCII?: boolean | InUntrustedWorkspace;
  invisibleCharacters?: boolean;
  ambiguousCharacters?: boolean;
  includeComments?: boolean | InUntrustedWorkspace;
  includeStrings?: boolean | InUntrustedWorkspace;
  /**
   * A map of allowed characters (true: allowed).
  */
  allowedCharacters?: Record<string, true>;
  allowedLocales?: Record<string | '_os' | '_vscode', true>;
}

export interface IBracketPairColorizationOptions {
  /**
   * Enable or disable bracket pair colorization.
  */
  enabled?: boolean;
}

/**
 * Configuration options for editor inlayHints
 */
export interface IEditorInlayHintsOptions {
  /**
   * Enable the inline hints.
   * Defaults to true.
   */
  enabled?: boolean;
  /**
   * Font size of inline hints.
   * Default to 90% of the editor font size.
   */
  fontSize?: number;
  /**
   * Font family of inline hints.
   * Defaults to editor font family.
   */
  fontFamily?: string;
}

/**
 * Configuration options for editor lightbulb
 */
export interface IEditorLightbulbOptions {
  /**
   * Enable the lightbulb code action.
   * Defaults to true.
   */
  enabled?: boolean;
}

export type LineNumbersType = 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string);

/**
 * Configuration options for editor scrollbars
 */
export interface IEditorScrollbarOptions {
  /**
   * The size of arrows (if displayed).
   * Defaults to 11.
   * **NOTE**: This option cannot be updated using `updateOptions()`
   */
  arrowSize?: number;
  /**
   * Render vertical scrollbar.
   * Defaults to 'auto'.
   */
  vertical?: 'auto' | 'visible' | 'hidden';
  /**
   * Render horizontal scrollbar.
   * Defaults to 'auto'.
   */
  horizontal?: 'auto' | 'visible' | 'hidden';
  /**
   * Cast horizontal and vertical shadows when the content is scrolled.
   * Defaults to true.
   * **NOTE**: This option cannot be updated using `updateOptions()`
   */
  useShadows?: boolean;
  /**
   * Render arrows at the top and bottom of the vertical scrollbar.
   * Defaults to false.
   * **NOTE**: This option cannot be updated using `updateOptions()`
   */
  verticalHasArrows?: boolean;
  /**
   * Render arrows at the left and right of the horizontal scrollbar.
   * Defaults to false.
   * **NOTE**: This option cannot be updated using `updateOptions()`
   */
  horizontalHasArrows?: boolean;
  /**
   * Listen to mouse wheel events and react to them by scrolling.
   * Defaults to true.
   */
  handleMouseWheel?: boolean;
  /**
   * Always consume mouse wheel events (always call preventDefault() and stopPropagation() on the browser events).
   * Defaults to true.
   * **NOTE**: This option cannot be updated using `updateOptions()`
   */
  alwaysConsumeMouseWheel?: boolean;
  /**
   * Height in pixels for the horizontal scrollbar.
   * Defaults to 10 (px).
   */
  horizontalScrollbarSize?: number;
  /**
   * Width in pixels for the vertical scrollbar.
   * Defaults to 10 (px).
   */
  verticalScrollbarSize?: number;
  /**
   * Width in pixels for the vertical slider.
   * Defaults to `verticalScrollbarSize`.
   * **NOTE**: This option cannot be updated using `updateOptions()`
   */
  verticalSliderSize?: number;
  /**
   * Height in pixels for the horizontal slider.
   * Defaults to `horizontalScrollbarSize`.
   * **NOTE**: This option cannot be updated using `updateOptions()`
   */
  horizontalSliderSize?: number;
  /**
   * Scroll gutter clicks move by page vs jump to position.
   * Defaults to false.
   */
  scrollByPage?: boolean;
}

/**
 * Configuration options for editor minimap
 */
export interface IEditorMinimapOptions {
  /**
   * Enable the rendering of the minimap.
   * Defaults to true.
   */
  enabled?: boolean;
  /**
   * Control the side of the minimap in editor.
   * Defaults to 'right'.
   */
  side?: 'right' | 'left';
  /**
   * Control the minimap rendering mode.
   * Defaults to 'actual'.
   */
  size?: 'proportional' | 'fill' | 'fit';
  /**
   * Control the rendering of the minimap slider.
   * Defaults to 'mouseover'.
   */
  showSlider?: 'always' | 'mouseover';
  /**
   * Render the actual text on a line (as opposed to color blocks).
   * Defaults to true.
   */
  renderCharacters?: boolean;
  /**
   * Limit the width of the minimap to render at most a certain number of columns.
   * Defaults to 120.
   */
  maxColumn?: number;
  /**
   * Relative size of the font in the minimap. Defaults to 1.
   */
  scale?: number;
}

/**
 * Configuration options for editor find widget
 */
export interface IEditorFindOptions {
  /**
  * Controls whether the cursor should move to find matches while typing.
  */
  cursorMoveOnType?: boolean;
  /**
   * Controls if we seed search string in the Find Widget with editor selection.
   */
  seedSearchStringFromSelection?: 'never' | 'always' | 'selection';
  /**
   * Controls if Find in Selection flag is turned on in the editor.
   */
  autoFindInSelection?: 'never' | 'always' | 'multiline';
  addExtraSpaceOnTop?: boolean;
  /**
   * Controls whether the search automatically restarts from the beginning (or the end) when no further matches can be found
   */
  loop?: boolean;
}

/**
 * Configuration options for editor hover
 */
export interface IEditorHoverOptions {
  /**
   * Enable the hover.
   * Defaults to true.
   */
  enabled?: boolean;
  /**
   * Delay for showing the hover.
   * Defaults to 300.
   */
  delay?: number;
  /**
   * Is the hover sticky such that it can be clicked and its contents selected?
   * Defaults to true.
   */
  sticky?: boolean;
  /**
   * Should the hover be shown above the line if possible?
   * Defaults to false.
   */
  above?: boolean;
}

/**
 * Configuration options for editor comments
 */
export interface IEditorCommentsOptions {
  /**
   * Insert a space after the line comment token and inside the block comments tokens.
   * Defaults to true.
   */
  insertSpace?: boolean;
  /**
   * Ignore empty lines when inserting line comments.
   * Defaults to true.
   */
  ignoreEmptyLines?: boolean;
}

/**
 * Configuration options for editor suggest widget
 */
export interface ISuggestOptions {
  /**
   * Overwrite word ends on accept. Default to false.
   */
  insertMode?: 'insert' | 'replace';
  /**
   * Enable graceful matching. Defaults to true.
   */
  filterGraceful?: boolean;
  /**
   * Prevent quick suggestions when a snippet is active. Defaults to true.
   */
  snippetsPreventQuickSuggestions?: boolean;
  /**
   * Favors words that appear close to the cursor.
   */
  localityBonus?: boolean;
  /**
   * Enable using global storage for remembering suggestions.
   */
  shareSuggestSelections?: boolean;
  /**
   * Enable or disable icons in suggestions. Defaults to true.
   */
  showIcons?: boolean;
  /**
   * Enable or disable the suggest status bar.
   */
  showStatusBar?: boolean;
  /**
   * Enable or disable the rendering of the suggestion preview.
   */
  preview?: boolean;
  /**
   * Configures the mode of the preview.
  */
  previewMode?: 'prefix' | 'subword' | 'subwordSmart';
  /**
   * Show details inline with the label. Defaults to true.
   */
  showInlineDetails?: boolean;
  /**
   * Show method-suggestions.
   */
  showMethods?: boolean;
  /**
   * Show function-suggestions.
   */
  showFunctions?: boolean;
  /**
   * Show constructor-suggestions.
   */
  showConstructors?: boolean;
  /**
   * Show deprecated-suggestions.
   */
  showDeprecated?: boolean;
  /**
   * Show field-suggestions.
   */
  showFields?: boolean;
  /**
   * Show variable-suggestions.
   */
  showVariables?: boolean;
  /**
   * Show class-suggestions.
   */
  showClasses?: boolean;
  /**
   * Show struct-suggestions.
   */
  showStructs?: boolean;
  /**
   * Show interface-suggestions.
   */
  showInterfaces?: boolean;
  /**
   * Show module-suggestions.
   */
  showModules?: boolean;
  /**
   * Show property-suggestions.
   */
  showProperties?: boolean;
  /**
   * Show event-suggestions.
   */
  showEvents?: boolean;
  /**
   * Show operator-suggestions.
   */
  showOperators?: boolean;
  /**
   * Show unit-suggestions.
   */
  showUnits?: boolean;
  /**
   * Show value-suggestions.
   */
  showValues?: boolean;
  /**
   * Show constant-suggestions.
   */
  showConstants?: boolean;
  /**
   * Show enum-suggestions.
   */
  showEnums?: boolean;
  /**
   * Show enumMember-suggestions.
   */
  showEnumMembers?: boolean;
  /**
   * Show keyword-suggestions.
   */
  showKeywords?: boolean;
  /**
   * Show text-suggestions.
   */
  showWords?: boolean;
  /**
   * Show color-suggestions.
   */
  showColors?: boolean;
  /**
   * Show file-suggestions.
   */
  showFiles?: boolean;
  /**
   * Show reference-suggestions.
   */
  showReferences?: boolean;
  /**
   * Show folder-suggestions.
   */
  showFolders?: boolean;
  /**
   * Show typeParameter-suggestions.
   */
  showTypeParameters?: boolean;
  /**
   * Show issue-suggestions.
   */
  showIssues?: boolean;
  /**
   * Show user-suggestions.
   */
  showUsers?: boolean;
  /**
   * Show snippet-suggestions.
   */
  showSnippets?: boolean;
}

export interface IInlineSuggestOptions {
  /**
   * Enable or disable the rendering of automatic inline completions.
  */
  enabled?: boolean;
  /**
   * Configures the mode.
   * Use `prefix` to only show ghost text if the text to replace is a prefix of the suggestion text.
   * Use `subword` to only show ghost text if the replace text is a subword of the suggestion text.
   * Use `subwordSmart` to only show ghost text if the replace text is a subword of the suggestion text, but the subword must start after the cursor position.
   * Defaults to `prefix`.
  */
  mode?: 'prefix' | 'subword' | 'subwordSmart';
}

export interface ISmartSelectOptions {
  selectLeadingAndTrailingWhitespace?: boolean;
}

export type GoToLocationValues = 'peek' | 'gotoAndPeek' | 'goto';

export interface IGotoLocationOptions {
  multiple?: GoToLocationValues;
  multipleDefinitions?: GoToLocationValues;
  multipleTypeDefinitions?: GoToLocationValues;
  multipleDeclarations?: GoToLocationValues;
  multipleImplementations?: GoToLocationValues;
  multipleReferences?: GoToLocationValues;
  alternativeDefinitionCommand?: string;
  alternativeTypeDefinitionCommand?: string;
  alternativeDeclarationCommand?: string;
  alternativeImplementationCommand?: string;
  alternativeReferenceCommand?: string;
}

export interface IQuickSuggestionsOptions {
  other?: boolean;
  comments?: boolean;
  strings?: boolean;
}

export interface IEditorPaddingOptions {
  /**
   * Spacing between top edge of editor and first line.
   */
  top?: number;
  /**
   * Spacing between bottom edge of editor and last line.
   */
  bottom?: number;
}

export interface IEditorParameterHintOptions {
  /**
   * Enable parameter hints.
   * Defaults to true.
   */
  enabled?: boolean;
  /**
   * Enable cycling of parameter hints.
   * Defaults to false.
   */
  cycle?: boolean;
}

/**
 * Configuration options for auto closing quotes and brackets
 */
export type EditorAutoClosingStrategy = 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';

/**
 * Configuration options for auto wrapping quotes and brackets
 */
export type EditorAutoSurroundStrategy = 'languageDefined' | 'quotes' | 'brackets' | 'never';

/**
 * Configuration options for typing over closing quotes or brackets
 */
export type EditorAutoClosingEditStrategy = 'always' | 'auto' | 'never';

export type BuiltinTheme = 'vs' | 'vs-dark' | 'hc-black';

export interface ITokenThemeRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

export type IColors = {
  [colorId: string]: string;
};
export interface IStandaloneThemeData {
  base: BuiltinTheme;
  inherit: boolean;
  rules: ITokenThemeRule[];
  encodedTokensColors?: string[];
  colors: IColors;
}

/**
 * Configuration options for the editor.
 */
export interface IEditorOptions {
  /**
   * This editor is used inside a diff editor.
   */
  inDiffEditor?: boolean;
  /**
   * The aria label for the editor's textarea (when it is focused).
   */
  ariaLabel?: string;
  /**
   * The `tabindex` property of the editor's textarea
   */
  tabIndex?: number;
  /**
   * Render vertical lines at the specified columns.
   * Defaults to empty array.
   */
  rulers?: (number | IRulerOption)[];
  /**
   * A string containing the word separators used when doing word navigation.
   * Defaults to `~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?
   */
  wordSeparators?: string;
  /**
   * Enable Linux primary clipboard.
   * Defaults to true.
   */
  selectionClipboard?: boolean;
  /**
   * Control the rendering of line numbers.
   * If it is a function, it will be invoked when rendering a line number and the return value will be rendered.
   * Otherwise, if it is a truthy, line numbers will be rendered normally (equivalent of using an identity function).
   * Otherwise, line numbers will not be rendered.
   * Defaults to `on`.
   */
  lineNumbers?: LineNumbersType;
  /**
   * Controls the minimal number of visible leading and trailing lines surrounding the cursor.
   * Defaults to 0.
  */
  cursorSurroundingLines?: number;
  /**
   * Controls when `cursorSurroundingLines` should be enforced
   * Defaults to `default`, `cursorSurroundingLines` is not enforced when cursor position is changed
   * by mouse.
  */
  cursorSurroundingLinesStyle?: 'default' | 'all';
  /**
   * Render last line number when the file ends with a newline.
   * Defaults to true.
  */
  renderFinalNewline?: boolean;
  /**
   * Remove unusual line terminators like LINE SEPARATOR (LS), PARAGRAPH SEPARATOR (PS).
   * Defaults to 'prompt'.
   */
  unusualLineTerminators?: 'auto' | 'off' | 'prompt';
  /**
   * Should the corresponding line be selected when clicking on the line number?
   * Defaults to true.
   */
  selectOnLineNumbers?: boolean;
  /**
   * Control the width of line numbers, by reserving horizontal space for rendering at least an amount of digits.
   * Defaults to 5.
   */
  lineNumbersMinChars?: number;
  /**
   * Enable the rendering of the glyph margin.
   * Defaults to true in vscode and to false in monaco-editor.
   */
  glyphMargin?: boolean;
  /**
   * The width reserved for line decorations (in px).
   * Line decorations are placed between line numbers and the editor content.
   * You can pass in a string in the format floating point followed by "ch". e.g. 1.3ch.
   * Defaults to 10.
   */
  lineDecorationsWidth?: number | string;
  /**
   * When revealing the cursor, a virtual padding (px) is added to the cursor, turning it into a rectangle.
   * This virtual padding ensures that the cursor gets revealed before hitting the edge of the viewport.
   * Defaults to 30 (px).
   */
  revealHorizontalRightPadding?: number;
  /**
   * Render the editor selection with rounded borders.
   * Defaults to true.
   */
  roundedSelection?: boolean;
  /**
   * Class name to be added to the editor.
   */
  extraEditorClassName?: string;
  /**
   * Should the editor be read only. See also `domReadOnly`.
   * Defaults to false.
   */
  readOnly?: boolean;
  /**
   * Should the textarea used for input use the DOM `readonly` attribute.
   * Defaults to false.
   */
  domReadOnly?: boolean;
  /**
   * Enable linked editing.
   * Defaults to false.
   */
  linkedEditing?: boolean;
  /**
   * deprecated, use linkedEditing instead
   */
  renameOnType?: boolean;
  /**
   * Should the editor render validation decorations.
   * Defaults to editable.
   */
  renderValidationDecorations?: 'editable' | 'on' | 'off';
  /**
   * Control the behavior and rendering of the scrollbars.
   */
  scrollbar?: IEditorScrollbarOptions;
  /**
   * Control the behavior and rendering of the minimap.
   */
  minimap?: IEditorMinimapOptions;
  /**
   * Control the behavior of the find widget.
   */
  find?: IEditorFindOptions;
  /**
   * Display overflow widgets as `fixed`.
   * Defaults to `false`.
   */
  fixedOverflowWidgets?: boolean;
  /**
   * The number of vertical lanes the overview ruler should render.
   * Defaults to 3.
   */
  overviewRulerLanes?: number;
  /**
   * Controls if a border should be drawn around the overview ruler.
   * Defaults to `true`.
   */
  overviewRulerBorder?: boolean;
  /**
   * Control the cursor animation style, possible values are 'blink', 'smooth', 'phase', 'expand' and 'solid'.
   * Defaults to 'blink'.
   */
  cursorBlinking?: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  /**
   * Zoom the font in the editor when using the mouse wheel in combination with holding Ctrl.
   * Defaults to false.
   */
  mouseWheelZoom?: boolean;
  /**
   * Control the mouse pointer style, either 'text' or 'default' or 'copy'
   * Defaults to 'text'
   */
  mouseStyle?: 'text' | 'default' | 'copy';
  /**
   * Enable smooth caret animation.
   * Defaults to false.
   */
  cursorSmoothCaretAnimation?: boolean;
  /**
   * Control the cursor style, either 'block' or 'line'.
   * Defaults to 'line'.
   */
  cursorStyle?: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
  /**
   * Control the width of the cursor when cursorStyle is set to 'line'
   */
  cursorWidth?: number;
  /**
   * Enable font ligatures.
   * Defaults to false.
   */
  fontLigatures?: boolean | string;
  /**
   * Disable the use of `transform: translate3d(0px, 0px, 0px)` for the editor margin and lines layers.
   * The usage of `transform: translate3d(0px, 0px, 0px)` acts as a hint for browsers to create an extra layer.
   * Defaults to false.
   */
  disableLayerHinting?: boolean;
  /**
   * Disable the optimizations for monospace fonts.
   * Defaults to false.
   */
  disableMonospaceOptimizations?: boolean;
  /**
   * Should the cursor be hidden in the overview ruler.
   * Defaults to false.
   */
  hideCursorInOverviewRuler?: boolean;
  /**
   * Enable that scrolling can go one screen size after the last line.
   * Defaults to true.
   */
  scrollBeyondLastLine?: boolean;
  /**
   * Enable that scrolling can go beyond the last column by a number of columns.
   * Defaults to 5.
   */
  scrollBeyondLastColumn?: number;
  /**
   * Enable that the editor animates scrolling to a position.
   * Defaults to false.
   */
  smoothScrolling?: boolean;
  /**
   * Enable that the editor will install an interval to check if its container dom node size has changed.
   * Enabling this might have a severe performance impact.
   * Defaults to false.
   */
  automaticLayout?: boolean;
  /**
   * Control the wrapping of the editor.
   * When `wordWrap` = "off", the lines will never wrap.
   * When `wordWrap` = "on", the lines will wrap at the viewport width.
   * When `wordWrap` = "wordWrapColumn", the lines will wrap at `wordWrapColumn`.
   * When `wordWrap` = "bounded", the lines will wrap at min(viewport width, wordWrapColumn).
   * Defaults to "off".
   */
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  /**
   * Override the `wordWrap` setting.
   */
  wordWrapOverride1?: 'off' | 'on' | 'inherit';
  /**
   * Override the `wordWrapOverride1` setting.
   */
  wordWrapOverride2?: 'off' | 'on' | 'inherit';
  /**
   * Control the wrapping of the editor.
   * When `wordWrap` = "off", the lines will never wrap.
   * When `wordWrap` = "on", the lines will wrap at the viewport width.
   * When `wordWrap` = "wordWrapColumn", the lines will wrap at `wordWrapColumn`.
   * When `wordWrap` = "bounded", the lines will wrap at min(viewport width, wordWrapColumn).
   * Defaults to 80.
   */
  wordWrapColumn?: number;
  /**
   * Control indentation of wrapped lines. Can be: 'none', 'same', 'indent' or 'deepIndent'.
   * Defaults to 'same' in vscode and to 'none' in monaco-editor.
   */
  wrappingIndent?: 'none' | 'same' | 'indent' | 'deepIndent';
  /**
   * Controls the wrapping strategy to use.
   * Defaults to 'simple'.
   */
  wrappingStrategy?: 'simple' | 'advanced';
  /**
   * Configure word wrapping characters. A break will be introduced before these characters.
   */
  wordWrapBreakBeforeCharacters?: string;
  /**
   * Configure word wrapping characters. A break will be introduced after these characters.
   */
  wordWrapBreakAfterCharacters?: string;
  /**
   * Performance guard: Stop rendering a line after x characters.
   * Defaults to 10000.
   * Use -1 to never stop rendering
   */
  stopRenderingLineAfter?: number;
  /**
   * Configure the editor's hover.
   */
  hover?: IEditorHoverOptions;
  /**
   * Enable detecting links and making them clickable.
   * Defaults to true.
   */
  links?: boolean;
  /**
   * Enable inline color decorators and color picker rendering.
   */
  colorDecorators?: boolean;
  /**
   * Control the behaviour of comments in the editor.
   */
  comments?: IEditorCommentsOptions;
  /**
   * Enable custom contextmenu.
   * Defaults to true.
   */
  contextmenu?: boolean;
  /**
   * A multiplier to be used on the `deltaX` and `deltaY` of mouse wheel scroll events.
   * Defaults to 1.
   */
  mouseWheelScrollSensitivity?: number;
  /**
   * FastScrolling mulitplier speed when pressing `Alt`
   * Defaults to 5.
   */
  fastScrollSensitivity?: number;
  /**
   * Enable that the editor scrolls only the predominant axis. Prevents horizontal drift when scrolling vertically on a trackpad.
   * Defaults to true.
   */
  scrollPredominantAxis?: boolean;
  /**
   * Enable that the selection with the mouse and keys is doing column selection.
   * Defaults to false.
   */
  columnSelection?: boolean;
  /**
   * The modifier to be used to add multiple cursors with the mouse.
   * Defaults to 'alt'
   */
  multiCursorModifier?: 'ctrlCmd' | 'alt';
  /**
   * Merge overlapping selections.
   * Defaults to true
   */
  multiCursorMergeOverlapping?: boolean;
  /**
   * Configure the behaviour when pasting a text with the line count equal to the cursor count.
   * Defaults to 'spread'.
   */
  multiCursorPaste?: 'spread' | 'full';
  /**
   * Configure the editor's accessibility support.
   * Defaults to 'auto'. It is best to leave this to 'auto'.
   */
  accessibilitySupport?: 'auto' | 'off' | 'on';
  /**
   * Controls the number of lines in the editor that can be read out by a screen reader
   */
  accessibilityPageSize?: number;
  /**
   * Suggest options.
   */
  suggest?: ISuggestOptions;
  inlineSuggest?: IInlineSuggestOptions;
  /**
   * Smart select options.
   */
  smartSelect?: ISmartSelectOptions;
  /**
   *
   */
  gotoLocation?: IGotoLocationOptions;
  /**
   * Enable quick suggestions (shadow suggestions)
   * Defaults to true.
   */
  quickSuggestions?: boolean | IQuickSuggestionsOptions;
  /**
   * Quick suggestions show delay (in ms)
   * Defaults to 10 (ms)
   */
  quickSuggestionsDelay?: number;
  /**
   * Controls the spacing around the editor.
   */
  padding?: IEditorPaddingOptions;
  /**
   * Parameter hint options.
   */
  parameterHints?: IEditorParameterHintOptions;
  /**
   * Options for auto closing brackets.
   * Defaults to language defined behavior.
   */
  autoClosingBrackets?: EditorAutoClosingStrategy;
  /**
   * Options for auto closing quotes.
   * Defaults to language defined behavior.
   */
  autoClosingQuotes?: EditorAutoClosingStrategy;
  /**
   * Options for pressing backspace near quotes or bracket pairs.
   */
  autoClosingDelete?: EditorAutoClosingEditStrategy;
  /**
   * Options for typing over closing quotes or brackets.
   */
  autoClosingOvertype?: EditorAutoClosingEditStrategy;
  /**
   * Options for auto surrounding.
   * Defaults to always allowing auto surrounding.
   */
  autoSurround?: EditorAutoSurroundStrategy;
  /**
   * Controls whether the editor should automatically adjust the indentation when users type, paste, move or indent lines.
   * Defaults to advanced.
   */
  autoIndent?: 'none' | 'keep' | 'brackets' | 'advanced' | 'full';
  /**
   * Emulate selection behaviour of tab characters when using spaces for indentation.
   * This means selection will stick to tab stops.
   */
  stickyTabStops?: boolean;
  /**
   * Enable format on type.
   * Defaults to false.
   */
  formatOnType?: boolean;
  /**
   * Enable format on paste.
   * Defaults to false.
   */
  formatOnPaste?: boolean;
  /**
   * Controls if the editor should allow to move selections via drag and drop.
   * Defaults to false.
   */
  dragAndDrop?: boolean;
  /**
   * Enable the suggestion box to pop-up on trigger characters.
   * Defaults to true.
   */
  suggestOnTriggerCharacters?: boolean;
  /**
   * Accept suggestions on ENTER.
   * Defaults to 'on'.
   */
  acceptSuggestionOnEnter?: 'on' | 'smart' | 'off';
  /**
   * Accept suggestions on provider defined characters.
   * Defaults to true.
   */
  acceptSuggestionOnCommitCharacter?: boolean;
  /**
   * Enable snippet suggestions. Default to 'true'.
   */
  snippetSuggestions?: 'top' | 'bottom' | 'inline' | 'none';
  /**
   * Copying without a selection copies the current line.
   */
  emptySelectionClipboard?: boolean;
  /**
   * Syntax highlighting is copied.
   */
  copyWithSyntaxHighlighting?: boolean;
  /**
   * The history mode for suggestions.
   */
  suggestSelection?: 'first' | 'recentlyUsed' | 'recentlyUsedByPrefix';
  /**
   * The font size for the suggest widget.
   * Defaults to the editor font size.
   */
  suggestFontSize?: number;
  /**
   * The line height for the suggest widget.
   * Defaults to the editor line height.
   */
  suggestLineHeight?: number;
  /**
   * Enable tab completion.
   */
  tabCompletion?: 'on' | 'off' | 'onlySnippets';
  /**
   * Enable selection highlight.
   * Defaults to true.
   */
  selectionHighlight?: boolean;
  /**
   * Enable semantic occurrences highlight.
   * Defaults to true.
   */
  occurrencesHighlight?: boolean;
  /**
   * Show code lens
   * Defaults to true.
   */
  codeLens?: boolean;
  /**
   * Code lens font family. Defaults to editor font family.
   */
  codeLensFontFamily?: string;
  /**
   * Code lens font size. Default to 90% of the editor font size
   */
  codeLensFontSize?: number;
  /**
   * Control the behavior and rendering of the code action lightbulb.
   */
  lightbulb?: IEditorLightbulbOptions;
  /**
   * Timeout for running code actions on save.
   */
  codeActionsOnSaveTimeout?: number;
  /**
   * Enable code folding.
   * Defaults to true.
   */
  folding?: boolean;
  /**
   * Selects the folding strategy. 'auto' uses the strategies contributed for the current document, 'indentation' uses the indentation based folding strategy.
   * Defaults to 'auto'.
   */
  foldingStrategy?: 'auto' | 'indentation';
  /**
   * Enable highlight for folded regions.
   * Defaults to true.
   */
  foldingHighlight?: boolean;
  /**
   * Auto fold imports folding regions.
   * Defaults to true.
   */
  foldingImportsByDefault?: boolean;
  /**
   * Maximum number of foldable regions.
   * Defaults to 5000.
   */
  foldingMaximumRegions?: number;
  /**
   * Controls whether the fold actions in the gutter stay always visible or hide unless the mouse is over the gutter.
   * Defaults to 'mouseover'.
   */
  showFoldingControls?: 'always' | 'mouseover';
  /**
   * Controls whether clicking on the empty content after a folded line will unfold the line.
   * Defaults to false.
   */
  unfoldOnClickAfterEndOfLine?: boolean;
  /**
   * Enable highlighting of matching brackets.
   * Defaults to 'always'.
   */
  matchBrackets?: 'never' | 'near' | 'always';
  /**
   * Enable rendering of whitespace.
   * Defaults to 'selection'.
   */
  renderWhitespace?: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  /**
   * Enable rendering of control characters.
   * Defaults to true.
   */
  renderControlCharacters?: boolean;
  /**
   * Enable rendering of current line highlight.
   * Defaults to all.
   */
  renderLineHighlight?: 'none' | 'gutter' | 'line' | 'all';
  /**
   * Control if the current line highlight should be rendered only the editor is focused.
   * Defaults to false.
   */
  renderLineHighlightOnlyWhenFocus?: boolean;
  /**
   * Inserting and deleting whitespace follows tab stops.
   */
  useTabStops?: boolean;
  /**
   * The font family
   */
  fontFamily?: string;
  /**
   * The font weight
   */
  fontWeight?: string;
  /**
   * The font size
   */
  fontSize?: number;
  /**
   * The line height
   */
  lineHeight?: number;
  /**
   * The letter spacing
   */
  letterSpacing?: number;
  /**
   * Controls fading out of unused variables.
   */
  showUnused?: boolean;
  /**
   * Controls whether to focus the inline editor in the peek widget by default.
   * Defaults to false.
   */
  peekWidgetDefaultFocus?: 'tree' | 'editor';
  /**
   * Controls whether the definition link opens element in the peek widget.
   * Defaults to false.
   */
  definitionLinkOpensInPeek?: boolean;
  /**
   * Controls strikethrough deprecated variables.
   */
  showDeprecated?: boolean;
  /**
   * Control the behavior and rendering of the inline hints.
   */
  inlayHints?: IEditorInlayHintsOptions;
  /**
   * Control if the editor should use shadow DOM.
   */
  useShadowDOM?: boolean;
  /**
   * Controls the behavior of editor guides.
  */
  guides?: IGuidesOptions;
  unicodeHighlight?: IUnicodeHighlightOptions;
  bracketPairColorization?: IBracketPairColorizationOptions;
}
