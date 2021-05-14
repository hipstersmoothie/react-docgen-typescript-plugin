/* eslint-disable max-classes-per-file */
// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import makeSerializable from "webpack/lib/util/makeSerializable.js";

// This import is compatible with both webpack 4 and 5
// eslint-disable-next-line
// @ts-ignore: Webpack 4 type
import NullDependency from "webpack/lib/dependencies/NullDependency";

// It would be better to extend from webpack.dependencies but that works
// only with webpack 5, not 4
// class DocGenDependency extends webpack.dependencies.NullDependency
class DocGenDependency extends NullDependency {
  public codeBlock: string;

  constructor(codeBlock: string) {
    super();

    this.codeBlock = codeBlock;
  }

  updateHash: NullDependency["updateHash"] = (hash: {
    update: (str: string) => void;
  }) => {
    hash.update(this.codeBlock);
  };
}

makeSerializable(
  DocGenDependency,
  "react-docgen-typescript-plugin/dist/dependency"
);

type NullDependencyTemplateType = InstanceType<typeof NullDependency.Template>;
class DocGenTemplate extends NullDependency.Template
  implements NullDependencyTemplateType {
  // eslint-disable-next-line
  // @ts-ignore: Webpack 4 type
  apply: NullDependencyTemplateType["apply"] = (
    dependency: DocGenDependency,
    source: { insert: (a: number, b: string) => void }
  ) => {
    if (dependency.codeBlock) {
      // Insert to the end
      source.insert(Infinity, dependency.codeBlock);
    }
  };
}

// eslint-disable-next-line
// @ts-ignore: Webpack 4 type
DocGenDependency.Template = DocGenTemplate;

export default DocGenDependency;
