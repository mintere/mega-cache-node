import typescript from '@wessberg/rollup-plugin-ts';

export default [
	{
		input: 'src/index.ts',
		external: [
			"megahash",
			"fs"
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