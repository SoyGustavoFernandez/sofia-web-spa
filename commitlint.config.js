/**
 * Commitlint configuration (Conventional Commits sin validación estricta de Jira)
 */

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "footer-leading-blank": [2, "always"],
    "scope-case": [2, "always", "kebab-case"],
    "header-max-length": [2, "always", 100],
    // Flexible: prohibe Sentence Case o UPPERCASE completos, permitiendo minúsculas y términos como 'API' u 'OAuth'
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
  },
};
