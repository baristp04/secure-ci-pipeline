import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

export const PORT = Number(args.port ?? process.env.PORT ?? 3000);

// INTENTIONALLY VULNERABLE (course baseline, see BASELINE.md): hardcoded FAKE secret.
// Not a real key. Should be caught by secret scanning in Week 2.
export const FAKE_API_KEY = 'sk_test_FAKE_NOT_A_REAL_KEY_0000';
