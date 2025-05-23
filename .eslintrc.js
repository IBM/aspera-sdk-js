module.exports = {
  "env": {
      "browser": true
  },
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
      "project": "tsconfig.json",
      "sourceType": "module"
  },
  "plugins": [
      "@typescript-eslint",
  ],
  "ignorePatterns": [
    "example"
  ],
  "rules": {
      "@typescript-eslint/consistent-type-definitions": "error",
      "@typescript-eslint/dot-notation": "off",
      "@typescript-eslint/explicit-member-accessibility": [
          "off",
          {
              "accessibility": "explicit"
          }
      ],
      "@typescript-eslint/indent": ["error", 2],
      "@typescript-eslint/member-delimiter-style": [
          "error",
          {
              "multiline": {
                  "delimiter": "semi",
                  "requireLast": true
              },
              "singleline": {
                  "delimiter": "semi",
                  "requireLast": false
              }
          }
      ],
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-interface": "error",
      "@typescript-eslint/no-inferrable-types": [
          "error",
          {
              "ignoreParameters": true
          }
      ],
      "@typescript-eslint/no-shadow": [
          "error",
          {
              "hoist": "all"
          }
      ],
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-use-before-define": "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/quotes": [
          "error",
          "single"
      ],
      "@typescript-eslint/semi": [
          "error",
          "always"
      ],
      "@typescript-eslint/type-annotation-spacing": "error",
      "@typescript-eslint/unified-signatures": "error",
      "brace-style": [
          "error",
          "1tbs"
      ],
      "curly": "error",
      "eol-last": "error",
      "eqeqeq": [
          "error",
          "smart"
      ],
      "guard-for-in": "error",
      "id-blacklist": "off",
      "id-match": "off",
      "no-bitwise": "error",
      "no-caller": "error",
      "no-console": [
          "error",
          {
              "allow": [
                  "log",
                  "warn",
                  "dir",
                  "timeLog",
                  "assert",
                  "clear",
                  "count",
                  "countReset",
                  "group",
                  "groupEnd",
                  "table",
                  "dirxml",
                  "error",
                  "groupCollapsed",
                  "Console",
                  "profile",
                  "profileEnd",
                  "timeStamp",
                  "context"
              ]
          }
      ],
      "no-debugger": "error",
      "no-empty": "off",
      "no-eval": "error",
      "no-fallthrough": "error",
      "no-new-wrappers": "error",
      "no-restricted-imports": "error",
      "no-throw-literal": "error",
      "no-trailing-spaces": "error",
      "no-underscore-dangle": "off",
      "no-unused-labels": "error",
      "no-var": "error",
      "prefer-const": "error",
      "radix": "error",
      "spaced-comment": [
          "error",
          "always",
          {
              "markers": [
                  "/"
              ]
          }
      ]
  }
};
