/* eslint-disable max-classes-per-file */
// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import ModuleDependency from "webpack/lib/dependencies/ModuleDependency.js";

// eslint-disable-next-line
// @ts-ignore: What's the right way to refer to this one?
import makeSerializable from "webpack/lib/util/makeSerializable.js";

class DocGenDependency extends ModuleDependency {
  /**
   * @param {string} request request
   * @param {[number, number]} range range
   */
  constructor(request, range) {
    super(request);
    this.range = range;
  }

  // TODO
  /**
   * Update the hash
   * @param {Hash} hash hash to be updated
   * @param {UpdateHashContext} context context
   * @returns {void}
   */
  updateHash(hash, context) {
    // TODO: See ConstDependency for reference
    hash.update(this.range + "");
    hash.update(this.expression + "");
    // if (this.runtimeRequirements)
    //  hash.update(Array.from(this.runtimeRequirements).join() + "");
  }

  /**
   * Returns list of exports referenced by this dependency
   * @param {ModuleGraph} moduleGraph module graph
   * @param {RuntimeSpec} runtime the runtime for which the module is analysed
   * @returns {(string[] | ReferencedExport)[]} referenced exports
   */
  getReferencedExports(moduleGraph, runtime) {
    return Dependency.NO_EXPORTS_REFERENCED;
  }

  get type() {
    return ""; // new Worker()";
  }

  get category() {
    return "docs"; // "worker"
  }

  // TODO: Does this need serialize/deserialize as well?
}

// TODO: How to type this?
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
