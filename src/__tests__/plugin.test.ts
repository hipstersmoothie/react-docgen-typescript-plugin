import webpack, { Configuration } from 'webpack';
import { createFsFromVolume, Volume } from 'memfs';
import ReactDocgenTypeScriptPlugin from '..';

function compile(config: Configuration, filenames = ['index.html']) : Promise<Record<string, string>> {
	return new Promise((resolve, reject) => {
		const compiler = webpack(config);

		// eslint-disable-next-line
		// @ts-ignore: There's a type mismatch but this should work based on webpack source
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		const memfs = compiler.outputFileSystem;

		compiler.run((err, stats) => {
			if (err) {
				return reject(err);
			}

			if (stats?.hasErrors()) {
				return reject(stats.toString('errors-only'));
			}

			const ret = {};

			filenames.forEach((filename) => {
				// eslint-disable-next-line
				// @ts-ignore: The type is wrong here
				ret[filename] = memfs.readFileSync(`./dist/${filename}`, {
					encoding: 'utf-8',
				});
			});

			return resolve(ret);
		});
	});
}

const getConfig = (
	options = {},
	config: { title?: string } = {}
): Configuration =>
	({
		entry: { main: './src/__tests__/__fixtures__/index.js' },
		plugins: [new ReactDocgenTypeScriptPlugin(options)],
		...config	
	})


test('default options', async () => {
	const result = await compile(getConfig({}));

	expect(result['index.html']).toMatchSnapshot();
});
