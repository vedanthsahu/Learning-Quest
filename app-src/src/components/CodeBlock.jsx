import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-java";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-bash";

// Fenced code blocks (```java, ```python, ...) sometimes use a name Prism
// doesn't recognize directly.
const LANGUAGE_ALIASES = {
  dockerfile: "docker",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
};

// Renders a fenced code block with Prism token highlighting. Falls back to
// plain, unhighlighted text for a language Prism doesn't have a grammar for
// (or no language tag at all) rather than erroring.
export default function CodeBlock({ className, children }) {
  const raw = Array.isArray(children) ? children.join("") : String(children ?? "");
  const code = raw.replace(/\n$/, "");

  const match = /language-(\w+)/.exec(className || "");
  const requested = match ? match[1].toLowerCase() : null;
  const lang = requested ? LANGUAGE_ALIASES[requested] || requested : null;
  const grammar = lang && Prism.languages[lang];

  if (!grammar) {
    return <code>{code}</code>;
  }

  const html = Prism.highlight(code, grammar, lang);
  return <code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
