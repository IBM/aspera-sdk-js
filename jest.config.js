module.exports = {
  'automock': false,
  'setupFiles': [
    './jest.setup.js'
  ],
  'moduleFileExtensions': [
    'ts',
    'js'
  ],
  'testEnvironment': 'jsdom',
  'transform': {
    '^.+\\.tsx?$': 'ts-jest',
    'node_modules/@ibm-aspera/.+\\.(j|t)sx?$': 'ts-jest',
  },
  'testRegex': '/tests/.*\\.spec\\.ts$',
  'transformIgnorePatterns': [
    'node_modules/(?!@ibm-aspera/.*)'
  ],
};
