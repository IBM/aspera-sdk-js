# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.4](https://github.com/IBM/aspera-sdk-js/compare/v0.2.3...v0.2.4) (2024-11-07)


### Bug Fixes

* websocket port scan opt in only ([#50](https://github.com/IBM/aspera-sdk-js/issues/50)) ([18ab7e1](https://github.com/IBM/aspera-sdk-js/commit/18ab7e19a9ba7ec8109d44ff20daf109d7759ba5))

### [0.2.3](https://github.com/IBM/aspera-sdk-js/compare/v0.2.2...v0.2.3) (2024-10-31)


### Bug Fixes

* **#48:** use download site instead of cloudfront ([#49](https://github.com/IBM/aspera-sdk-js/issues/49)) ([cc44ece](https://github.com/IBM/aspera-sdk-js/commit/cc44ecec186d8ca1fdb2797ddd0704c11c6abc0d)), closes [#48](https://github.com/IBM/aspera-sdk-js/issues/48)

### [0.2.2](https://github.com/IBM/aspera-sdk-js/compare/v0.2.1...v0.2.2) (2024-10-25)


### Features

* rename to aspera SDK ([#47](https://github.com/IBM/aspera-sdk-js/issues/47)) ([680e891](https://github.com/IBM/aspera-sdk-js/commit/680e8914f04ad3edafeae54af7ab115c5fa63045))


### Bug Fixes

* ws read appid from global ([#46](https://github.com/IBM/aspera-sdk-js/issues/46)) ([576ecea](https://github.com/IBM/aspera-sdk-js/commit/576ecea5d1a050edcac188c21779267a88f335d6))

### [0.2.1](https://github.com/IBM/aspera-sdk-js/compare/v0.2.0...v0.2.1) (2024-10-25)


### Features

* initial multiple user session implementation ([#37](https://github.com/IBM/aspera-sdk-js/issues/37)) ([338f058](https://github.com/IBM/aspera-sdk-js/commit/338f058597b00f3121ff9a1d9f53b561818e8107))


### Bug Fixes

* use desktop_spec for payload ([c516649](https://github.com/IBM/aspera-sdk-js/commit/c51664904b01a4200cba6bdef665b108567123b4))

## [0.2.0](https://github.com/IBM/aspera-sdk-js/compare/v0.1.36...v0.2.0) (2024-10-23)


### ⚠ BREAKING CHANGES

* **#38:** old desktop-sdk-js is no longer used. Move to @ibm-aspera/browser-sdk-js

* fix: undo desktop specific and URL

* fix: unit tests for installer URL change

### Features

* **#38:** migrate to aspera browser naming instead of desktop ([#40](https://github.com/IBM/aspera-sdk-js/issues/40)) ([8770121](https://github.com/IBM/aspera-sdk-js/commit/87701218e6f63c034ef334059abece2402bb6e5c)), closes [#38](https://github.com/IBM/aspera-sdk-js/issues/38) [#38](https://github.com/IBM/aspera-sdk-js/issues/38)
* notify last event on callback registration ([#34](https://github.com/IBM/aspera-sdk-js/issues/34)) ([08fd161](https://github.com/IBM/aspera-sdk-js/commit/08fd1612408ae6a66dd39f597b2ee340dfa88ace))


### Bug Fixes

* **#38:** remove JS from npm name ([#41](https://github.com/IBM/aspera-sdk-js/issues/41)) ([b18a20f](https://github.com/IBM/aspera-sdk-js/commit/b18a20f9d2610d1725b237da57e345434110ff33)), closes [#38](https://github.com/IBM/aspera-sdk-js/issues/38)
* dependabot alerts ([#35](https://github.com/IBM/aspera-sdk-js/issues/35)) ([126417c](https://github.com/IBM/aspera-sdk-js/commit/126417c9665d6103cc81e409a7d128d4d28aacf0))
* safari extension status ([#33](https://github.com/IBM/aspera-sdk-js/issues/33)) ([5d7c915](https://github.com/IBM/aspera-sdk-js/commit/5d7c9156cfaf4f6d10c0d0ac741c520c0f6d7c68))

### [0.1.36](https://github.com/IBM/aspera-sdk-js/compare/v0.1.35...v0.1.36) (2024-09-26)


### Bug Fixes

* use correct callbacks for safari extension notifications ([#32](https://github.com/IBM/aspera-sdk-js/issues/32)) ([74ab8d6](https://github.com/IBM/aspera-sdk-js/commit/74ab8d67ffb4ab17354d038dbd7821ffa1815c7f))

### [0.1.35](https://github.com/IBM/aspera-sdk-js/compare/v0.1.34...v0.1.35) (2024-09-25)


### Features

* add safari extension status callback registration ([#27](https://github.com/IBM/aspera-sdk-js/issues/27)) ([41e3bbe](https://github.com/IBM/aspera-sdk-js/commit/41e3bbe289dbd07bbb164f7daa6256207b256945))

### [0.1.34](https://github.com/IBM/aspera-sdk-js/compare/v0.1.33...v0.1.34) (2024-09-24)

### [0.1.33](https://github.com/IBM/aspera-sdk-js/compare/v0.1.32...v0.1.33) (2024-09-24)


### Bug Fixes

* initial is closed status ([#30](https://github.com/IBM/aspera-sdk-js/issues/30)) ([acf1cd1](https://github.com/IBM/aspera-sdk-js/commit/acf1cd101788fb076f5a31e30413262d0260338c))

### [0.1.32](https://github.com/IBM/aspera-sdk-js/compare/v0.1.31...v0.1.32) (2024-09-24)


### Bug Fixes

* notify last event on callback registration ([#29](https://github.com/IBM/aspera-sdk-js/issues/29)) ([0558fe8](https://github.com/IBM/aspera-sdk-js/commit/0558fe8b8ba607641cf8b79e742fe151f4b6ac54))

### [0.1.31](https://github.com/IBM/aspera-sdk-js/compare/v0.1.30...v0.1.31) (2024-09-24)


### Bug Fixes

* trigger status event on init chain ([#28](https://github.com/IBM/aspera-sdk-js/issues/28)) ([c519c9d](https://github.com/IBM/aspera-sdk-js/commit/c519c9dcc33e462614a3e42e861c440120916fc6))

### [0.1.30](https://github.com/IBM/aspera-sdk-js/compare/v0.1.29...v0.1.30) (2024-09-20)


### Bug Fixes

* **#24:** prevent ws event duplication ([#26](https://github.com/IBM/aspera-sdk-js/issues/26)) ([9959b69](https://github.com/IBM/aspera-sdk-js/commit/9959b69dcb00693f79d963bad8da73caf0932192)), closes [#24](https://github.com/IBM/aspera-sdk-js/issues/24)

### [0.1.29](https://github.com/IBM/aspera-sdk-js/compare/v0.1.28...v0.1.29) (2024-09-19)


### Bug Fixes

* **#23:** reject when safari extension is not enabled ([#25](https://github.com/IBM/aspera-sdk-js/issues/25)) ([6e46a99](https://github.com/IBM/aspera-sdk-js/commit/6e46a99a3e1fdfc8e39ef8a41cc7416d2e1163c5)), closes [#23](https://github.com/IBM/aspera-sdk-js/issues/23)

### [0.1.28](https://github.com/IBM/aspera-sdk-js/compare/v0.1.26...v0.1.28) (2024-07-17)


### Features

* **#8:** get info method ([#9](https://github.com/IBM/aspera-sdk-js/issues/9)) ([84f38c4](https://github.com/IBM/aspera-sdk-js/commit/84f38c42458d942243b7d7cb375e8c2a7287f086)), closes [#8](https://github.com/IBM/aspera-sdk-js/issues/8)
* safari client implementation ([#10](https://github.com/IBM/aspera-sdk-js/issues/10)) ([35170a6](https://github.com/IBM/aspera-sdk-js/commit/35170a6a00daa25d979ae8753e8ca79329baf422))
* safari extension state detection ([#12](https://github.com/IBM/aspera-sdk-js/issues/12)) ([94b376e](https://github.com/IBM/aspera-sdk-js/commit/94b376ec3416e0fb9e8cda5bc773a3942a09881b))
* support for transfer activity on safari  ([#11](https://github.com/IBM/aspera-sdk-js/issues/11)) ([616c23b](https://github.com/IBM/aspera-sdk-js/commit/616c23bd9f58a3da8099468bbb66b10fe0c8582a))


### Bug Fixes

* main field in package.json ([#13](https://github.com/IBM/aspera-sdk-js/issues/13)) ([8d103ee](https://github.com/IBM/aspera-sdk-js/commit/8d103ee0dffa8753c0c507f38ea375b8721555db))
* scrub for open source ([#82](https://github.com/IBM/aspera-sdk-js/issues/82)) ([ec71567](https://github.com/IBM/aspera-sdk-js/commit/ec71567f9a1271c765c13fcbe9acb8cac517e595))

### [0.1.27](https://github.com/IBM/aspera-sdk-js/compare/v0.1.26...v0.1.27) (2024-06-10)


### Bug Fixes

* scrub for open source ([#82](https://github.com/IBM/aspera-sdk-js/issues/82)) ([ec71567](https://github.com/IBM/aspera-sdk-js/commit/ec71567f9a1271c765c13fcbe9acb8cac517e595))
