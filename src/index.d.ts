declare interface TextEditor {
    onDidDestroy<T>(
        callback: (this: T, textEditor: TextEditor) => void,
        thisValue?: T
    ): Disposable;
}

declare interface Workspace {
    onDidAddTextEditor<T>(
        callback: (this: T, editor: TextEditor) => void,
        thisValue?: T
    ): Disposable;
}
