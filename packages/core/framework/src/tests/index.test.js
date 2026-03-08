"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bun_test_1 = require("bun:test");
var index_js_1 = require("../index.js");
(0, bun_test_1.describe)("Framework Core", function () {
    (0, bun_test_1.it)("should initialize correctly", function () {
        (0, bun_test_1.expect)((0, index_js_1.initFramework)()).toBe(true);
    });
});
