import typescript from '@wessberg/rollup-plugin-ts';

export default [
	{
		input: 'src/index.ts',
		external: [
			"megahash",
			"fs",
			"path",
			"util",
			"cacache"
		],
		output: [
			{ format: 'es', file: "dist/index.mjs" },
			{ format: 'cjs', file: "dist/index.js" }
    ],
    plugins: [
			typescript()
    ]
	}
];