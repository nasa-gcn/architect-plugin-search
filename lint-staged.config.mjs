export default {
  '*.(json|md|ts|mjs)': 'prettier --write',
  '*.(md|ts|mjs)': 'eslint --max-warnings 0 .',
  '*.ts': () => 'tsc',
}
