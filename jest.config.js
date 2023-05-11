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
    '^.+\\.tsx?$': 'ts-jest'
  },
  'testRegex': '/tests/.*\\.spec\\.ts$'
}
