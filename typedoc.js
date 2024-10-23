module.exports = {
  mode: 'file',
  out: 'docs',
  theme: 'default',
  ignoreCompilerErrors: true,
  excludePrivate: false,
  excludeNotExported: true,
  target: 'ES6',
  moduleResolution: 'node',
  preserveConstEnums: 'true',
  stripInternal: 'true',
  suppressExcessPropertyErrors: 'true',
  suppressImplicitAnyIndexErrors: 'true',
  module: 'commonjs',
  name: 'IBM Aspera Browser JavaScript Library',
  hideGenerator: true
};
