/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    env: { node: true },
    plugins: ["@typescript-eslint"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    parserOptions: {
        sourceType: "module",
    },
    rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
        "@typescript-eslint/ban-ts-comment": "off",
        "no-prototype-builtins": "off",
        "@typescript-eslint/no-empty-function": "off",
    },
    ignorePatterns: ["mode_modules/", "main.js"],
};
