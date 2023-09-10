// eslint-disable-next-line no-unused-vars
import type * as lspTypes from "vscode-languageserver-protocol";
import { dependencyManagement } from "nova-extension-utils";
import { registerAutoSuggest } from "./commands/autoSuggest";
import { registerApplyEdit } from "./requests/applyEdit";

const { getDependencyDirectory } = dependencyManagement;

nova.commands.register("apexskier.json.reload", reload);

let client: LanguageClient | null = null;
const compositeDisposable = new CompositeDisposable();

dependencyManagement.registerDependencyUnlockCommand(
  "apexskier.json.command.forceUnlock"
);

async function reload() {
  deactivate();
  console.log("reloading...");
  await asyncActivate();
}

async function asyncActivate() {
  await dependencyManagement
    .installWrappedDependencies(compositeDisposable)
    .catch(e => {
      console.log(`Failed to install dependencies\n${e}`);
      throw e;
    });

  const exec = nova.path.normalize(nova.path.join(
    getDependencyDirectory(),
    "node_modules",
    "vscode-json-languageserver",
    "bin",
    "vscode-json-languageserver"
  ));

  const serverOptions: ServerOptions = {
    path: exec,
    args: ["--stdio"],
    type: "stdio"
  };

  if (nova.inDevMode()) {
    const logDir = nova.path.join(nova.extension.workspaceStoragePath, "logs");
    await new Promise<void>((resolve, reject) => {
      const p = new Process("/usr/bin/env", {
        args: ["mkdir", "-p", logDir],
      });
      p.onDidExit((status) => (status === 0 ? resolve() : reject()));
      p.start();
    });
    console.log("logging to", logDir);
    // passing inLog breaks some requests for an unknown reason
    // const inLog = nova.path.join(logDir, "languageServer-in.log");
    const outLog = nova.path.join(logDir, "languageServer-out.log");
    serverOptions.args = ["bash", "-c", `"${serverOptions.path}" --stdio | tee -a "${outLog}"`],
    serverOptions.path = "/usr/bin/env";
  }

  client = new LanguageClient(
    "apexskier.json",
    "JSON Language Server",
    serverOptions,
    { syntaxes: ["json", "jsonc"] }
  );

  // register nova commands
  compositeDisposable.add(registerAutoSuggest(client));

  const manifestSchemaUrl = `file://${nova.path.join(
    nova.extension.path,
    "nova-extension-schema.json"
  )}`;

  interface JSONSchema {
    name: string,
    description: string,
    fileMatch: string[],
    url?: string,
    schema?: any
  }

  const extensionManifestSchema: JSONSchema = {
    name: "Nova Extension",
    description: "Nova extension manifest file",
    fileMatch: [
      "*.novaextension/extension.json",
    ],
    url: manifestSchemaUrl,
  };

  const extensionManifestConfigSchema: JSONSchema = {
    name: "Nova Extension Config",
    description: "Nova extension manifest config",
    fileMatch: [
      "*.novaextension/config.json",
      "*.novaextension/*.config.json",
      "*.novaextension/config.*.json",
    ],
    schema: {
      type: "array",
      items: {
        "$ref": manifestSchemaUrl + "#/definitions/configItem"
      }
    }
};

  void (async () => {
    const response = await fetch(
      "https://schemastore.azurewebsites.net/api/json/catalog.json"
    );
    const schemas: JSONSchema[] = await response.json()
      .then(catalog => catalog.schemas)
      .then((schemas: JSONSchema[]) => schemas.map(s => {
        s.fileMatch?.includes("config.json") && s.fileMatch.push("!*.novaextension/*");
        return s;
      }));

    const params: lspTypes.DidChangeConfigurationParams = {
      settings: {
        json: {
          schemas: [
            extensionManifestConfigSchema,
            extensionManifestSchema,
            ...schemas,
          ],
        },
      },
    };
    client.sendNotification("workspace/didChangeConfiguration", params);
    console.log("registered schemas");
  })();

  // register server-pushed commands
  registerApplyEdit(client);

  client.onNotification("window/showMessage", (params) => {
    console.log("window/showMessage", JSON.stringify(params));
  });
  client.onRequest("vscode/content", (params) => {
    console.log("vscode/content", JSON.stringify(params));
  });
  client.onNotification("json/schemaAssociations", (params) => {
    console.log("json/schemaAssociations", JSON.stringify(params));
  });
  client.onNotification("json/resultLimitReached", (params) => {
    console.log("json/resultLimitReached", JSON.stringify(params));
  });

  client.start();
}

let napCheck: any;
let wakeCheck: Disposable | null = null;
const isJson = (doc: TextDocument) => !! doc.syntax?.match(/^jsonc?$/i);

export async function activate() {
  console.log("activating...");

  if (nova.inDevMode()) {
    const notification = new NotificationRequest("activated");
    notification.body = "JSON extension is loading";
    nova.notifications.add(notification);
  }

  napCheck = setInterval(() => {
    if ( client?.running && ! nova.workspace.textDocuments.some(isJson) ) {
      nova.inDevMode() && console.log("nap time")
      client.stop();
    }
  }, 300e3) // 5 mins;

  wakeCheck = nova.workspace.onDidOpenTextDocument(doc => {
    if ( client && ! client.running && isJson(doc) ) {
      nova.inDevMode() && console.log("wakey wakey");
      client.start();
    }
  })

  await asyncActivate()
    .then(() => console.log("activated"))
    .catch(err => {
      console.error(`Failed to activate\n${err}`);
      nova.workspace.showErrorMessage(err);
    });
}

export function deactivate() {
  clearInterval(napCheck);
  wakeCheck?.dispose();
  client?.stop();
  compositeDisposable.dispose();
}
