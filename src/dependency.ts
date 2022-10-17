/* eslint-disable max-classes-per-file */
import * as webpack from "webpack";

// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import makeSerializable from "webpack/lib/util/makeSerializable.js";

// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import NullDependency from "webpack/lib/dependencies/NullDependency.js";

class DocGenDependency extends NullDependency {
  public codeBlock: string;

  constructor(codeBlock: string) {
    super();

    this.codeBlock = codeBlock;
  }

  updateHash: webpack.dependencies.NullDependency["updateHash"] = (hash) => {
    hash.update(this.codeBlock);
  };
}

makeSerializable(
  DocGenDependency,
  "react-docgen-typescript-plugin/dist/dependency"
);

type NullDependencyTemplateType = InstanceType<
  typeof webpack.dependencies.NullDependency.Template
>;
class DocGenTemplate extends NullDependency.Template
  implements NullDependencyTemplateType {
  // eslint-disable-next-line
  // @ts-ignore: Webpack 4 type
  apply: NullDependencyTemplateType["apply"] = (
    dependency: DocGenDependency,
    source
  ) => {
    if (dependency.codeBlock) {
      // Insert to the end
      source.insert(Infinity, dependency.codeBlock);
    }
  };
}

// @ts-expect-error TODO: How to type this correctly?
DocGenDependency.Template = DocGenTemplate;

// Default imports are tricky with CommonJS
// eslint-disable-next-line
export { DocGenDependency };
