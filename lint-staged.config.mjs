export default {
  '*.(json|md|ts)': 'prettier --write',
  '*.ts': ['eslint', () => 'tsc'],
}
