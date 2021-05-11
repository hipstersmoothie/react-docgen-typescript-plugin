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

class DocGenDependency extends NullDependency {
  public static Template: NullDependency.Template;
  private codeBlock: string;

  constructor(request: string, codeBlock: string) {
    super(request);

    this.codeBlock = codeBlock;
  }

  // TODO: Note if you want that modules correctly invalidate and cache you need to add updateHash to your Dependency and hash the type info (because that might change depending on outside factors (other modules)
}

makeSerializable(
  DocGenDependency,
  "react-docgen-typescript-plugin/dist/dependency"
);
class DocGenTemplate extends NullDependency.Template {
  apply(dependency: NullDependency, source: ReplaceSource): void {
    if (dependency.codeBlock) {
      source.insert(0, dependency.codeBlock);
    }
  }
}

DocGenDependency.Template = DocGenTemplate;

export default DocGenDependency;
