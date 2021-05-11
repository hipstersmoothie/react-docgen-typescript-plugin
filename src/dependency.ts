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

    // Since parsing fails with a path including !, remove it.
    // The problem is that webpack injects that and there doesn't
    // seem to be a good way to get only the path itself from
    // a dependency.
    const modulePath = userRequest.includes("!")
      ? userRequest.split("!")[1]
      : userRequest;
    const componentDocs = this.options.parser.parse(modulePath);

    if (!componentDocs.length) {
      return;
    }

    const docgenBlock = generateDocgenCodeBlock({
      filename: userRequest,
      source: userRequest,
      componentDocs,
      docgenCollectionName:
        this.options.docgenOptions.docgenCollectionName ||
        "STORYBOOK_REACT_CLASSES",
      setDisplayName: this.options.docgenOptions.setDisplayName || true,
      typePropName: this.options.docgenOptions.typePropName || "type",
    }).substring(userRequest.length);

    source.insert(0, docgenBlock);
  }
}

DocGenDependency.Template = DocGenTemplate;

export default DocGenDependency;
