#!/usr/bin/env node
/**
 * CTRL-APP-CI-01 - deterministic ESLint "no new debt" ratchet.
 *
 * The repository carries historical ESLint debt that this task is not
 * authorized to clean up. Rather than gate CI on a green `npm run lint`, or on
 * a totals-only ceiling (which would let a new violation hide behind a fixed
 * old one), CI compares normalized diagnostic fingerprints against a committed
 * baseline.
 *
 * A fingerprint is the tuple:
 *
 *   repository-relative file path
 *   severity ("error" | "warning")
 *   rule id, or a stable synthetic identity when ESLint reports none
 *   diagnostic message
 *
 * plus the number of times that tuple occurs. Line and column are deliberately
 * excluded so that moving unchanged code does not register as new debt.
 *
 * Verdict:
 *
 *   - a fingerprint absent from the baseline            -> FAIL
 *   - a fingerprint whose count exceeds the baseline    -> FAIL
 *   - a fingerprint whose count decreased               -> PASS (improvement)
 *   - a baseline fingerprint no longer reported         -> PASS (improvement)
 *
 * Usage:
 *
 *   node scripts/ci/eslint-ratchet.mjs check --report <eslint-json>
 *   node scripts/ci/eslint-ratchet.mjs write --report <eslint-json> [--base-sha <sha>] [--base-tree <tree>] [--note <text>]
 *
 * `check` is the default and is the only mode GitHub CI runs. `write` exists
 * for deliberate, separately authorized baseline maintenance; ordinary product
 * tasks must not raise the committed baseline.
 *
 * The report is produced by ESLint itself, e.g.
 *
 *   npx eslint --format json --output-file "$RUNNER_TEMP/eslint-report.json"
 *
 * Generate that report before tests and before the production build: `coverage/`
 * output is inside current ESLint discovery and would otherwise contribute
 * environment-generated diagnostics that are not repository debt.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');
const DEFAULT_BASELINE = resolve(SCRIPT_DIR, 'eslint-baseline.json');

/** Identity used when ESLint reports a diagnostic with no rule id. */
const SYNTHETIC_FATAL = '__eslint_fatal__';
const SYNTHETIC_UNASSIGNED = '__eslint_no_rule__';

const SEVERITY_NAMES = { 1: 'warning', 2: 'error' };

/** Maximum number of individual violations printed before truncating. */
const MAX_LISTED = 25;

class RatchetError extends Error {}

function parseArgs(argv) {
  const options = {
    command: 'check',
    report: null,
    baseline: DEFAULT_BASELINE,
    baseSha: null,
    baseTree: null,
    note: null,
  };

  const rest = [...argv];
  if (rest.length > 0 && !rest[0].startsWith('--')) {
    options.command = rest.shift();
  }

  while (rest.length > 0) {
    const flag = rest.shift();
    const value = () => {
      const next = rest.shift();
      if (next === undefined) {
        throw new RatchetError(`Missing value for ${flag}`);
      }
      return next;
    };

    switch (flag) {
      case '--report':
        options.report = value();
        break;
      case '--baseline':
        options.baseline = value();
        break;
      case '--base-sha':
        options.baseSha = value();
        break;
      case '--base-tree':
        options.baseTree = value();
        break;
      case '--note':
        options.note = value();
        break;
      default:
        throw new RatchetError(`Unknown argument: ${flag}`);
    }
  }

  if (!['check', 'write'].includes(options.command)) {
    throw new RatchetError(`Unknown command: ${options.command}`);
  }
  if (!options.report) {
    throw new RatchetError('A --report <eslint-json> path is required');
  }

  return options;
}

function readJson(path, label) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (cause) {
    throw new RatchetError(`Unable to read ${label} at ${path}: ${cause.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new RatchetError(`${label} at ${path} is not valid JSON: ${cause.message}`);
  }
}

function toRepoRelative(filePath) {
  return relative(REPO_ROOT, filePath).split(sep).join('/');
}

/** Keep messages portable between machines by stripping the absolute root. */
function normaliseMessage(message) {
  return String(message ?? '')
    .split(REPO_ROOT)
    .join('<repo>')
    .trim();
}

function ruleIdentity(message) {
  if (message.ruleId) {
    return message.ruleId;
  }
  return message.fatal ? SYNTHETIC_FATAL : SYNTHETIC_UNASSIGNED;
}

function fingerprintKey(fingerprint) {
  return JSON.stringify([
    fingerprint.file,
    fingerprint.severity,
    fingerprint.ruleId,
    fingerprint.message,
  ]);
}

function compareFingerprints(a, b) {
  return (
    a.file.localeCompare(b.file) ||
    a.severity.localeCompare(b.severity) ||
    a.ruleId.localeCompare(b.ruleId) ||
    a.message.localeCompare(b.message)
  );
}

/** Reduce an ESLint JSON report to sorted fingerprints plus reconciled totals. */
function collectFingerprints(report) {
  if (!Array.isArray(report)) {
    throw new RatchetError('ESLint report must be a JSON array (use --format json)');
  }

  const counts = new Map();
  const affectedFiles = new Set();
  let errors = 0;
  let warnings = 0;

  for (const result of report) {
    const file = toRepoRelative(result.filePath);
    for (const message of result.messages ?? []) {
      const severity = SEVERITY_NAMES[message.severity];
      if (!severity) {
        throw new RatchetError(
          `Unexpected ESLint severity ${message.severity} in ${file}`,
        );
      }

      if (severity === 'error') {
        errors += 1;
      } else {
        warnings += 1;
      }
      affectedFiles.add(file);

      const fingerprint = {
        file,
        severity,
        ruleId: ruleIdentity(message),
        message: normaliseMessage(message.message),
      };
      const key = fingerprintKey(fingerprint);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { ...fingerprint, count: 1 });
      }
    }
  }

  return {
    fingerprints: [...counts.values()].sort(compareFingerprints),
    totals: {
      errors,
      warnings,
      total: errors + warnings,
      affectedFiles: affectedFiles.size,
    },
  };
}

function indexByKey(fingerprints) {
  const index = new Map();
  for (const fingerprint of fingerprints) {
    index.set(fingerprintKey(fingerprint), fingerprint);
  }
  return index;
}

function describe(fingerprint) {
  return `${fingerprint.severity} ${fingerprint.ruleId} - ${fingerprint.file}\n      ${fingerprint.message}`;
}

function printList(heading, entries) {
  if (entries.length === 0) {
    return;
  }
  process.stdout.write(`\n${heading} (${entries.length}):\n`);
  for (const entry of entries.slice(0, MAX_LISTED)) {
    process.stdout.write(`  - ${entry}\n`);
  }
  if (entries.length > MAX_LISTED) {
    process.stdout.write(`  ... and ${entries.length - MAX_LISTED} more\n`);
  }
}

function assertBaselineIntegrity(baseline) {
  if (!Array.isArray(baseline.fingerprints) || !baseline.totals) {
    throw new RatchetError('Baseline is missing "fingerprints" or "totals"');
  }

  let errors = 0;
  let warnings = 0;
  const files = new Set();
  for (const fingerprint of baseline.fingerprints) {
    const count = fingerprint.count ?? 0;
    if (!Number.isInteger(count) || count < 1) {
      throw new RatchetError(`Baseline fingerprint has an invalid count: ${fingerprint.file}`);
    }
    if (fingerprint.severity === 'error') {
      errors += count;
    } else {
      warnings += count;
    }
    files.add(fingerprint.file);
  }

  const derived = { errors, warnings, total: errors + warnings, affectedFiles: files.size };
  for (const key of Object.keys(derived)) {
    if (baseline.totals[key] !== derived[key]) {
      throw new RatchetError(
        `Baseline is internally inconsistent: totals.${key} is ${baseline.totals[key]} but its fingerprints sum to ${derived[key]}`,
      );
    }
  }
}

function formatTotals(totals) {
  return `${totals.errors} errors / ${totals.warnings} warnings / ${totals.total} total across ${totals.affectedFiles} files`;
}

function runCheck(options) {
  const baseline = readJson(options.baseline, 'ESLint baseline');
  assertBaselineIntegrity(baseline);

  const report = readJson(options.report, 'ESLint report');
  const current = collectFingerprints(report);

  const baselineIndex = indexByKey(baseline.fingerprints);
  const currentIndex = indexByKey(current.fingerprints);

  const added = [];
  const increased = [];
  const decreased = [];

  for (const [key, fingerprint] of currentIndex) {
    const previous = baselineIndex.get(key);
    if (!previous) {
      added.push(`${describe(fingerprint)}\n      new (x${fingerprint.count})`);
    } else if (fingerprint.count > previous.count) {
      increased.push(
        `${describe(fingerprint)}\n      ${previous.count} -> ${fingerprint.count}`,
      );
    } else if (fingerprint.count < previous.count) {
      decreased.push(`${describe(fingerprint)}\n      ${previous.count} -> ${fingerprint.count}`);
    }
  }

  const removed = [];
  for (const [key, fingerprint] of baselineIndex) {
    if (!currentIndex.has(key)) {
      removed.push(describe(fingerprint));
    }
  }

  process.stdout.write('ESLint no-new-debt ratchet\n');
  process.stdout.write(`  baseline: ${formatTotals(baseline.totals)}\n`);
  process.stdout.write(`  current:  ${formatTotals(current.totals)}\n`);
  if (baseline.provenance?.baseSha) {
    process.stdout.write(`  baseline provenance: ${baseline.provenance.baseSha}\n`);
  }

  printList('New diagnostics', added);
  printList('Increased diagnostics', increased);

  if (added.length > 0 || increased.length > 0) {
    process.stdout.write(
      '\nFAIL: new lint debt was introduced.\n' +
        'Fix the diagnostics above. Raising the committed baseline requires separate authorization.\n',
    );
    return 1;
  }

  if (decreased.length > 0 || removed.length > 0) {
    process.stdout.write(
      `\nImprovement: ${removed.length} fingerprint(s) removed, ${decreased.length} reduced.\n` +
        'The baseline is intentionally not lowered automatically.\n',
    );
  }

  process.stdout.write('\nPASS: no new lint debt.\n');
  return 0;
}

function runWrite(options) {
  const report = readJson(options.report, 'ESLint report');
  const current = collectFingerprints(report);

  const baseline = {
    task: 'CTRL-APP-CI-01',
    description:
      'Deterministic ESLint no-new-debt baseline. Historical debt only; must not be raised by ordinary product tasks.',
    provenance: {
      repository: 'thoth-pub/thoth-app',
      baseBranch: 'dev',
      baseSha: options.baseSha,
      baseTree: options.baseTree,
      command: 'npx eslint --format json',
      note: options.note,
    },
    totals: current.totals,
    fingerprints: current.fingerprints,
  };

  writeFileSync(options.baseline, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${options.baseline}\n  ${formatTotals(current.totals)}\n`);
  return 0;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
    return options.command === 'write' ? runWrite(options) : runCheck(options);
  } catch (error) {
    if (error instanceof RatchetError) {
      process.stderr.write(`eslint-ratchet: ${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

process.exitCode = main();
