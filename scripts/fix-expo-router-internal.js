#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const targetDir = path.join(root, "node_modules", "expo-router", "internal");
const targetFile = path.join(targetDir, "routing.js");

const shim = `"use strict";

const { getContextKey } = require('../build/matchers');
const { sortRoutes } = require('../build/sortRoutes');

module.exports = {
  getContextKey,
  sortRoutes,
};
`;

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(targetFile, shim, "utf8");
console.log(`Created ${path.relative(root, targetFile)}`);

