import { InformationView } from "./informationView";

const reload = jest.fn();

describe("InformationView", () => {
  beforeEach(() => {
    reload.mockClear();

    class MockTreeView {
      reload = reload;
    }
    (global as any).TreeView = MockTreeView;
  });

  it("has no subchildren", () => {
    const iv = new InformationView();
    expect(
      iv.getChildren({
        title: "title",
        value: "value",
        identifier: "identifier",
      })
    ).toEqual([]);
  });

  it("renders tree items", () => {
    class MockTreeItem {
      // eslint-disable-next-line no-unused-vars
      constructor(readonly name: unknown, readonly state: unknown) {}
    }
    (global as any).TreeItem = MockTreeItem;
    (global as any).TreeItemCollapsibleState = {
      None: Symbol("TreeItemCollapsibleState.None"),
    };

    const iv = new InformationView();
    const item = iv.getTreeItem({
      title: "title",
      value: "value",
      identifier: "identifier",
    });
    expect(item).toMatchInlineSnapshot(`
      MockTreeItem {
        "descriptiveText": "value",
        "identifier": "identifier",
        "name": "title",
        "state": Symbol(TreeItemCollapsibleState.None),
      }
    `);
  });
});
