import ts from "typescript";
import * as docGen from "react-docgen-typescript";

import { generateDocgenCodeBlock } from "./generateDocgenCodeBlock";
import { LoaderOptions, Module } from "./types";

/** Run the docgen parser and return the result */
function generateDocs(
  parser: docGen.FileParser,
  webpackModule: Module,
  tsProgram: ts.Program,
  loaderOptions: Required<LoaderOptions>
): string {
  if (!webpackModule) {
    return "";
  }

  const componentDocs = parser.parseWithProgramProvider(
    webpackModule.userRequest,
    () => tsProgram
  );

  if (!componentDocs.length) {
    return "";
  }

  return generateDocgenCodeBlock({
    filename: webpackModule.userRequest,
    source: webpackModule.userRequest,
    componentDocs,
    ...loaderOptions,
  }).substring(webpackModule.userRequest.length);
}

export default generateDocs;
