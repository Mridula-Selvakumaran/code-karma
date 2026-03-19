import * as vscode from 'vscode';
import { KarmaEngine } from './karmaEngine';

/**
 * Python-specific rule engine for Code Karma.
 * Uses regex-based analysis since Python cannot be parsed by acorn (a JS parser).
 * Rules are designed around PEP8, Pythonic idioms, and common anti-patterns.
 */
export class PythonRuleEngine {
    constructor(private karmaEngine: KarmaEngine) {}

    public analyzeDocument(document: vscode.TextDocument) {
        const text = document.getText();
        const fileName = document.fileName;

        // ---- Test file bonus ----
        // Python test files are typically test_*.py or *_test.py
        if (/test_.*\.py$|.*_test\.py$/.test(fileName)) {
            this.karmaEngine.addKarma(15, 'You actually wrote tests. Legendary. (+15 Karma)');
            return; // Don't penalize test files for other rules
        }

        // ================================================================
        // POSITIVE RULES
        // ================================================================

        // Docstrings on functions and classes ("""...""" immediately after def/class)
        const funcDocstrings = text.match(/def\s+\w+[^:]*:\s*\n\s*["']{3}/g) || [];
        const classDocstrings = text.match(/class\s+\w+[^:]*:\s*\n\s*["']{3}/g) || [];
        const docstringCount = funcDocstrings.length + classDocstrings.length;

        // Type hints: function params with annotations (x: int) or return hints (-> Type)
        const paramHints = text.match(/def\s+\w+\([^)]*:\s*\w[\w\[\], ]*[^)]*\)/g) || [];
        const returnHints = text.match(/->\s*\w[\w\[\], .]*/g) || [];
        const typeHintCount = paramHints.length + returnHints.length;

        // f-strings: f"..." or f'...'
        const fstringCount = (text.match(/\bf["'][^"']*\{[^}]+\}[^"']*["']/g) || []).length;

        // List comprehensions: [expr for var in iterable]
        const listCompCount = (text.match(/\[[^\]]+\s+for\s+\w+\s+in\s+[^\]]+\]/g) || []).length;

        // Dict/set comprehensions: {expr for ...} or {k: v for ...}
        const dictCompCount = (text.match(/\{[^}]+\s+for\s+\w+\s+in\s+[^}]+\}/g) || []).length;

        // Context managers (with statements — proper resource handling)
        const withCount = (text.match(/^\s*with\s+\w+/gm) || []).length;

        // Idiomatic iteration: enumerate() or zip()
        const enumZipCount = (text.match(/\b(enumerate|zip)\s*\(/g) || []).length;

        // Dataclasses / NamedTuple (modern Python patterns)
        const dataclassCount = (text.match(/@dataclass|NamedTuple/g) || []).length;

        // Generator expressions: (expr for x in iterable)
        const generatorCount = (text.match(/\([^)]+\s+for\s+\w+\s+in\s+[^)]+\)/g) || []).length;

        // ================================================================
        // NEGATIVE RULES
        // ================================================================

        // print() calls — not a substitute for logging
        const printCount = (text.match(/\bprint\s*\(/g) || []).length;

        // Bare except: (catches everything, hides errors)
        const bareExceptCount = (text.match(/^\s*except\s*:/gm) || []).length;

        // eval() or exec() — security risk
        const evalCount = (text.match(/\b(eval|exec)\s*\(/g) || []).length;

        // global keyword — mutable global state
        const globalCount = (text.match(/^\s*global\s+\w/gm) || []).length;

        // Wildcard imports: from module import *
        const wildcardImportCount = (text.match(/^\s*from\s+\S+\s+import\s+\*/gm) || []).length;

        // range(len(...)) — non-idiomatic, use enumerate()
        const rangeLenCount = (text.match(/\brange\s*\(\s*len\s*\(/g) || []).length;

        // Mutable default arguments: def func(x=[], y={})
        const mutableDefaultCount = (text.match(/def\s+\w+\([^)]*=\s*[\[\{]/g) || []).length;

        // Single-letter variable names (excluding common exceptions)
        const SINGLE_LETTER_OK = new Set(['i', 'j', 'k', 'x', 'y', 'z', 'e', '_', 'n', 'f', 'v', 'k']);
        const singleLetterAssignments = text.match(/\b([a-zA-Z])\s*=/g) || [];
        const singleLetterCount = singleLetterAssignments.filter(m => {
            const varName = m.replace(/\s*=$/, '').trim();
            return varName.length === 1 && !SINGLE_LETTER_OK.has(varName.toLowerCase());
        }).length;

        // TODO / FIXME / HACK comments
        const todoCount = (text.match(/#\s*(TODO|FIXME|HACK)/g) || []).length;

        // type() for type checking instead of isinstance()
        const typeCheckCount = (text.match(/\btype\s*\(\s*\w+\s*\)\s*==\s*/g) || []).length;

        // pass in non-empty functions (lazy placeholder)
        const passCount = (text.match(/^\s*pass\s*$/gm) || []).length;

        // Hardcoded secrets
        const tokenRegex = /(eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+|sk_live_[a-zA-Z0-9]{24}|AIza[0-9A-Za-z-_]{35})/g;
        const hasExposedSecrets = tokenRegex.test(text);

        // Hardcoded URLs in strings
        const hardcodedUrlCount = (text.match(/['"]https?:\/\/[^'"]+['"]/g) || []).length;

        // ================================================================
        // APPLY KARMA — Positives
        // ================================================================
        if (docstringCount > 0) {
            this.karmaEngine.addKarma(3 * docstringCount, `Docstrings found. Your code explains itself. (+${3 * docstringCount} Karma)`);
        }
        if (typeHintCount > 0) {
            this.karmaEngine.addKarma(2 * typeHintCount, `Type hints! Statically-typed soul in a dynamic world. (+${2 * typeHintCount} Karma)`);
        }
        if (fstringCount > 0) {
            this.karmaEngine.addKarma(1 * fstringCount, `f-strings. Clean, readable, Pythonic. (+${fstringCount} Karma)`);
        }
        if (listCompCount > 0) {
            this.karmaEngine.addKarma(2 * listCompCount, `List comprehension. Very Pythonic. (+${2 * listCompCount} Karma)`);
        }
        if (dictCompCount > 0) {
            this.karmaEngine.addKarma(2 * dictCompCount, `Dict/set comprehension. Advanced Pythonista. (+${2 * dictCompCount} Karma)`);
        }
        if (withCount > 0) {
            this.karmaEngine.addKarma(2 * withCount, `Context managers. Resources are safe with you. (+${2 * withCount} Karma)`);
        }
        if (enumZipCount > 0) {
            this.karmaEngine.addKarma(2 * enumZipCount, `enumerate()/zip() — idiomatic and elegant. (+${2 * enumZipCount} Karma)`);
        }
        if (dataclassCount > 0) {
            this.karmaEngine.addKarma(4 * dataclassCount, `Dataclass/NamedTuple. Structured thinking. (+${4 * dataclassCount} Karma)`);
        }
        if (generatorCount > 0) {
            this.karmaEngine.addKarma(2 * generatorCount, `Generator expression. Memory-efficient mind. (+${2 * generatorCount} Karma)`);
        }

        // ================================================================
        // APPLY KARMA — Negatives
        // ================================================================
        if (printCount > 0) {
            this.karmaEngine.addKarma(-2 * printCount, `print() is not logging. Use the logging module. (-${2 * printCount} Karma)`);
        }
        if (bareExceptCount > 0) {
            this.karmaEngine.addKarma(-5 * bareExceptCount, `Bare except: catches everything, explains nothing. (-${5 * bareExceptCount} Karma)`);
        }
        if (evalCount > 0) {
            this.karmaEngine.addKarma(-15 * evalCount, `eval()/exec() is a hacker's best friend. Don't. (-${15 * evalCount} Karma)`);
        }
        if (globalCount > 0) {
            this.karmaEngine.addKarma(-4 * globalCount, `global keyword. Mutable shared state is chaos. (-${4 * globalCount} Karma)`);
        }
        if (wildcardImportCount > 0) {
            this.karmaEngine.addKarma(-4 * wildcardImportCount, `import * pollutes your namespace. Be specific. (-${4 * wildcardImportCount} Karma)`);
        }
        if (rangeLenCount > 0) {
            this.karmaEngine.addKarma(-2 * rangeLenCount, `range(len(...)) — just use enumerate(). (-${2 * rangeLenCount} Karma)`);
        }
        if (mutableDefaultCount > 0) {
            this.karmaEngine.addKarma(-5 * mutableDefaultCount, `Mutable default argument! Classic Python gotcha. (-${5 * mutableDefaultCount} Karma)`);
        }
        if (singleLetterCount > 0) {
            this.karmaEngine.addKarma(-1 * singleLetterCount, `Single-letter variable. What does 'q' even mean? (-${singleLetterCount} Karma)`);
        }
        if (todoCount > 0) {
            this.karmaEngine.addKarma(-1 * todoCount, `TODO/FIXME — future you will suffer. (-${todoCount} Karma)`);
        }
        if (typeCheckCount > 0) {
            this.karmaEngine.addKarma(-3 * typeCheckCount, `Use isinstance() not type() ==. (-${3 * typeCheckCount} Karma)`);
        }
        if (passCount > 0) {
            this.karmaEngine.addKarma(-1 * passCount, `pass in your code. Leaving things unfinished? (-${passCount} Karma)`);
        }
        if (hasExposedSecrets) {
            this.karmaEngine.addKarma(-25, 'Security Alert: Credentials exposed in Python code! (-25 Karma)');
        }
        if (hardcodedUrlCount > 0) {
            this.karmaEngine.addKarma(-2 * hardcodedUrlCount, `Hardcoded URLs belong in config, not source. (-${2 * hardcodedUrlCount} Karma)`);
        }
    }
}
