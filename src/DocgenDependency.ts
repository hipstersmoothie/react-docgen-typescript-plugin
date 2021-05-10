/* eslint-disable max-classes-per-file */
import * as webpack from 'webpack';

// Import for webpack4
// import NullDependency from 'webpack/lib/dependencies/NullDependency';

export default class DocgenDependency extends webpack.dependencies.NullDependency {
    docs: string;
    constructor(docs: string) {
        super()
        this.docs = docs;
    }

    updateHash: webpack.dependencies.NullDependency['updateHash'] = (hash) => {
        hash.update(this.docs);
    }
}  

type NullDependencyTemplateType = InstanceType<typeof webpack.dependencies.NullDependency.Template>
class TempDependencyTemplate extends webpack.dependencies.NullDependency.Template implements NullDependencyTemplateType {
    apply: NullDependencyTemplateType['apply'] = (dependency: DocgenDependency, source) => {
        source.insert(Infinity, dependency.docs);
    }
}

DocgenDependency.Template = TempDependencyTemplate


