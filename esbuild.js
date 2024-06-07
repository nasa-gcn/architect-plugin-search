import { build } from 'esbuild'

const entrypoints = ['index', 'launchSearch']

entrypoints.map(async (fileName)=>{
  await build({
    entryPoints: [`${fileName}.ts`],
    bundle: true,
    packages: 'external',
    outfile: `${fileName}.js`,
    platform: 'node',
    format: 'esm',
    treeShaking: true
  }).catch(() => process.exit(1));
})