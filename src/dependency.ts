/* eslint-disable max-classes-per-file */

import { ReplaceSource } from "webpack-sources";

// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import ModuleDependency from "webpack/lib/dependencies/ModuleDependency.js";

// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import makeSerializable from "webpack/lib/util/makeSerializable.js";

// eslint-disable-next-line
// @ts-ignore TODO: Figure out where to find a typed version
import Dependency from "webpack/lib/Dependency.js";

// eslint-disable-next-line
// @ts-ignore TODO: Figure out where to find a typed version
// import Hash from "webpack/lib/util/Hash.js";

class DocGenDependency extends ModuleDependency {
  public static Template: ModuleDependency.Template;

  /**
   * @param {string} request request
   */
  /* constructor(request: string) {
    super(request);
  } */

  updateHash(): void {
    // TODO: See ConstDependency for reference
  }

  getReferencedExports(): [] {
    return Dependency.NO_EXPORTS_REFERENCED;
  }

  get type(): string {
    return "docgen";
  }

  get category(): string {
    return "docs";
  }

  // TODO: updateHash, serialize, deserialize
}

// TODO
makeSerializable(DocGenDependency, "src/dependency");

class DocGenTemplate extends ModuleDependency.Template {
  /**
   * @param {Dependency} dependency the dependency for which the template should be applied
   * @param {ReplaceSource} source the current replace source which can be modified
   * @param {DependencyTemplateContext} templateContext the context object
   * @returns {void}
   */
  apply(dependency: Dependency, source: ReplaceSource) {
    console.log("APPLYING template");

    // TODO: Insert type annotations here
    // source.insert(0, "hello world");
    // source.replace(0, 10, "hello world");
  }
}

DocGenDependency.Template = DocGenTemplate;

export default DocGenDependency;
