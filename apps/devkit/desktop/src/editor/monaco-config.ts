import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/rust/rust.contribution";
import "monaco-editor/esm/vs/language/css/monaco.contribution";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import "monaco-editor/esm/vs/language/html/monaco.contribution";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import TypeScriptWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

type MonacoWorker = new () => Worker;

const workers: Record<string, MonacoWorker> = {
  css: CssWorker,
  handlebars: HtmlWorker,
  html: HtmlWorker,
  javascript: TypeScriptWorker,
  json: JsonWorker,
  less: CssWorker,
  scss: CssWorker,
  typescript: TypeScriptWorker
};

const workerHost = self as typeof self & {
  MonacoEnvironment?: { getWorker: (_moduleId: string, label: string) => Worker };
};

workerHost.MonacoEnvironment = {
  getWorker: (_moduleId, label) => {
    const WorkerConstructor = workers[label] ?? EditorWorker;
    return new WorkerConstructor();
  }
};

loader.config({ monaco });
