module.exports = {
  'automock': false,
  'setupFiles': [
    './jest.setup.js'
  ],
  'moduleFileExtensions': [
    'ts',
    'js'
  ],
  'transform': {
    '^.+\\.tsx?$': 'ts-jest'
  },
  'testRegex': '/tests/.*\\.spec\\.ts$'
}
