type Element = {
  title: string;
  value: string;
  readonly identifier: string;
};

// @ts-ignore -- type conflict between TS' and Nova's `Disposable` interface
export class InformationView implements TreeDataProvider<Element>, Disposable {
  constructor() {
    this._treeView = new TreeView("apexskier.json.sidebar.info", {
      dataProvider: this,
    });

    this.getChildren = this.getChildren.bind(this);
    this.getTreeItem = this.getTreeItem.bind(this);
  }

  private _treeView: TreeView<{ title: string; value: string }>;

  private readonly _statusElement: Element = {
    title: "Status",
    value: "Inactive",
    identifier: "status",
  };
  public set status(value: string) {
    this._statusElement.value = value;
    this._treeView.reload(this._statusElement);
  }

  reload() {
    this._treeView.reload();
  }

  getChildren(element: Element | null): Array<Element> {
    if (element == null) {
      return [this._statusElement];
    }
    return [];
  }

  getTreeItem(element: Element) {
    const item = new TreeItem(element.title, TreeItemCollapsibleState.None);
    item.descriptiveText = element.value;
    item.identifier = element.identifier;
    return item;
  }

  dispose() {
    this.status = "Disposed";
    this._treeView.dispose();
  }
}
