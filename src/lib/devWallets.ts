export interface DevAccount {
  index: number;
  address: string;
  label: string;
  balance: number; // in INIT
  privateKeyHint: string; // display only, not a real key
}

// Fixed dev accounts — like Remix's 10 pre-funded accounts
// Deterministic addresses derived from well-known dev mnemonics
export const DEV_ACCOUNTS: DevAccount[] = [
  {
    index: 0,
    address: "init1qyqs2rvra3wt6a5a8d5qfkz9xa9qlzx4r4p6gq",
    label: "Dev Account #0",
    balance: 10000,
    privateKeyHint: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    index: 1,
    address: "init1hpzwl0ggdyrns2v0yyf7an9s8xua6l8vxw8gzm",
    label: "Dev Account #1",
    balance: 10000,
    privateKeyHint: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    index: 2,
    address: "init1fp2sxt5rz85kka7ap0n0qhzl4mf2lvvr4kxw3d",
    label: "Dev Account #2",
    balance: 10000,
    privateKeyHint: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
  {
    index: 3,
    address: "init1hmfkxjgn9a4g0v6qfzx3skrhv6n5nh8pm8d4wk",
    label: "Dev Account #3",
    balance: 10000,
    privateKeyHint: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
  {
    index: 4,
    address: "init1mygxfzrglpj4l7xe3yf4qjxmzlgwz8n5v7lk9p",
    label: "Dev Account #4",
    balance: 10000,
    privateKeyHint: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  },
];

export function getInitUsername(address: string): string {
  // Deterministic .init username from address — use char codes to avoid NaN
  const names = ["dev", "builder", "coder", "hacker", "maker"];
  const charSum = address.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const name = names[charSum % names.length];
  const suffix = address.slice(-6);
  return `${name}${suffix}.init`;
}
