/* eslint-disable max-classes-per-file */

import { ReplaceSource } from "webpack-sources";

// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import Hash from "webpack/lib/util/Hash.js";

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

  updateHash(hash: Hash): void {
    hash.update(this.codeBlock);
  }
}

makeSerializable(
  DocGenDependency,
  "react-docgen-typescript-plugin/dist/dependency"
);
class DocGenTemplate extends NullDependency.Template {
  apply(dependency: NullDependency, source: ReplaceSource): void {
    if (dependency.codeBlock) {
      // Insert to the end
      source.insert(Infinity, dependency.codeBlock);
    }
  }
}

DocGenDependency.Template = DocGenTemplate;

export default DocGenDependency;
