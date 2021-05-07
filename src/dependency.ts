/* eslint-disable max-classes-per-file */
// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import ModuleDependency from "webpack/lib/dependencies/ModuleDependency.js";

// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import makeSerializable from "webpack/lib/util/makeSerializable.js";
import Dependency from "webpack/lib/Dependency.js";
import Hash from "webpack/lib/util/Hash.js";

class DocGenDependency extends ModuleDependency {
  public static Template: ModuleDependency.Template;

  /**
   * @param {string} request request
   */
  /* constructor(request: string) {
    super(request);
  } */

  updateHash(hash: Hash, context): void {
    // TODO: See ConstDependency for reference
  }

  getReferencedExports(): [] {
    return Dependency.NO_EXPORTS_REFERENCED;
  }

  get type(): string {
    return "__react_docgen__";
  }

  get category(): string {
    return "docs";
  }
}

// eslint-disable-next-line
DocGenDependency.Template = class DocGenTemplate extends ModuleDependency.Template {
  /**
   * @param {Dependency} dependency the dependency for which the template should be applied
   * @param {ReplaceSource} source the current replace source which can be modified
   * @param {DependencyTemplateContext} templateContext the context object
   * @returns {void}
   */
  apply(dependency, source, templateContext) {
    // TODO: Write source here - See WorkerDependency.js for reference
  }
};

makeSerializable(DocGenDependency, "src/dependency");

export default DocGenDependency;
