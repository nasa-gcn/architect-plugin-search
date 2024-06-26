export default {
  '*.(json|md|ts|mjs)': ['prettier --write', 'eslint --max-warnings 0 .'],
  '*.ts': () => 'tsc',
}
