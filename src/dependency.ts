/* eslint-disable max-classes-per-file */

import { ReplaceSource } from "webpack-sources";
import * as docGen from "react-docgen-typescript";

// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import Module from "webpack/lib/Module.js";

// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import makeSerializable from "webpack/lib/util/makeSerializable.js";

// eslint-disable-next-line
// @ts-ignore TODO: Figure out where to find a typed version
import NullDependency from "webpack/lib/dependencies/NullDependency.js";

import { generateDocgenCodeBlock } from "./generateDocgenCodeBlock";
import { LoaderOptions } from "./types";

class DocGenDependency extends NullDependency {
  public static Template: NullDependency.Template;
  private componentDocs: docGen.ComponentDoc[];

  constructor(request: string, componentDocs: docGen.ComponentDoc[]) {
    super(request);

    this.componentDocs = componentDocs;
  }

  // TODO: Note if you want that modules correctly invalidate and cache you need to add updateHash to your Dependency and hash the type info (because that might change depending on outside factors (other modules)
}

makeSerializable(
  DocGenDependency,
  "react-docgen-typescript-plugin/dist/dependency"
);

type Options = {
  parser: docGen.FileParser;
  docgenOptions: LoaderOptions;
};

class DocGenTemplate extends NullDependency.Template {
  private options: Options;

  constructor(options: Options) {
    super();

    this.options = options;
  }

  apply(
    dependency: NullDependency,
    source: ReplaceSource,
    { module }: { module: Module }
  ): void {
    const { userRequest } = module;

    if (!dependency.componentDocs.length) {
      return;
    }

    source.insert(
      0,
      generateDocgenCodeBlock({
        filename: userRequest,
        source: userRequest,
        componentDocs: dependency.componentDocs,
        docgenCollectionName:
          this.options.docgenOptions.docgenCollectionName ||
          "STORYBOOK_REACT_CLASSES",
        setDisplayName: this.options.docgenOptions.setDisplayName || true,
        typePropName: this.options.docgenOptions.typePropName || "type",
      }).substring(userRequest.length)
    );
  }
}

DocGenDependency.Template = DocGenTemplate;

export default DocGenDependency;
