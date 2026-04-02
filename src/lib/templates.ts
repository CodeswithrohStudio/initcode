import type { FileNode } from "@/types";

const CW20_CONTRACT = `use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env,
    MessageInfo, Response, StdError, StdResult, Uint128,
};
use cw20_base::contract::{
    execute as cw20_execute, instantiate as cw20_instantiate, query as cw20_query,
};
use cw20_base::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};
use cw20_base::state::TokenInfo;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    cw20_instantiate(deps, env, info, msg)
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, cw20_base::ContractError> {
    cw20_execute(deps, env, info, msg)
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    cw20_query(deps, env, msg)
}
`;

const CW721_CONTRACT = `use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env,
    MessageInfo, Response, StdResult,
};
use cw721_base::{
    ContractError, ExecuteMsg, InstantiateMsg, MintMsg, QueryMsg,
};

pub type Extension = Option<cosmwasm_std::Empty>;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    cw721_base::entry::instantiate(deps, env, info, msg)
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg<Extension, cosmwasm_std::Empty>,
) -> Result<Response, ContractError> {
    cw721_base::entry::execute(deps, env, info, msg)
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg<cosmwasm_std::Empty>) -> StdResult<Binary> {
    cw721_base::entry::query(deps, env, msg)
}
`;

const ESCROW_CONTRACT = `use cosmwasm_std::{
    entry_point, to_json_binary, BankMsg, Binary, Coin, Deps, DepsMut,
    Env, MessageInfo, Response, StdError, StdResult, Timestamp,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct State {
    pub arbiter: cosmwasm_std::Addr,
    pub recipient: cosmwasm_std::Addr,
    pub source: cosmwasm_std::Addr,
    pub end_time: Timestamp,
    pub balance: Vec<Coin>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstantiateMsg {
    pub arbiter: String,
    pub recipient: String,
    pub end_time_seconds: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Approve {},
    Refund {},
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    GetState {},
}

const STATE_KEY: &str = "state";

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let state = State {
        arbiter: deps.api.addr_validate(&msg.arbiter)?,
        recipient: deps.api.addr_validate(&msg.recipient)?,
        source: info.sender.clone(),
        end_time: Timestamp::from_seconds(env.block.time.seconds() + msg.end_time_seconds),
        balance: info.funds.clone(),
    };

    deps.storage.set(STATE_KEY.as_bytes(), &cosmwasm_std::to_json_vec(&state)?);

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("arbiter", msg.arbiter)
        .add_attribute("recipient", msg.recipient))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    let state: State = cosmwasm_std::from_json(
        deps.storage.get(STATE_KEY.as_bytes()).ok_or(StdError::not_found("state"))?
    )?;

    match msg {
        ExecuteMsg::Approve {} => {
            if info.sender != state.arbiter {
                return Err(StdError::generic_err("Unauthorized: only arbiter can approve"));
            }
            let msgs = vec![BankMsg::Send {
                to_address: state.recipient.to_string(),
                amount: state.balance,
            }];
            Ok(Response::new()
                .add_messages(msgs)
                .add_attribute("action", "approve"))
        }
        ExecuteMsg::Refund {} => {
            if env.block.time < state.end_time {
                return Err(StdError::generic_err("Escrow has not expired yet"));
            }
            let msgs = vec![BankMsg::Send {
                to_address: state.source.to_string(),
                amount: state.balance,
            }];
            Ok(Response::new()
                .add_messages(msgs)
                .add_attribute("action", "refund"))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetState {} => {
            let state: State = cosmwasm_std::from_json(
                deps.storage.get(STATE_KEY.as_bytes()).ok_or(StdError::not_found("state"))?
            )?;
            to_json_binary(&state)
        }
    }
}
`;

const CARGO_TOML = `[package]
name = "my-initia-contract"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[features]
library = []

[dependencies]
cosmwasm-std = { version = "2.0", features = ["stargate"] }
cosmwasm-schema = "2.0"
cw-storage-plus = "2.0"
serde = { version = "1.0", features = ["derive"] }
thiserror = "1.0"

[profile.release]
codegen-units = 1
opt-level = 3
debug = false
rpath = false
lto = true
debug-assertions = false
panic = "abort"
overflow-checks = true
`;

const README = `# My Initia Contract

A CosmWasm smart contract deployed on the Initia ecosystem.

## Overview

This project was built using **InitCode** — the browser-based IDE for Initia.

## Development

### Prerequisites
- InitCode IDE (no local setup needed!)
- Or: Rust, CosmWasm toolchain, Initia CLI

### Build
\`\`\`bash
cargo build --release --target wasm32-unknown-unknown
\`\`\`

### Deploy
Use the Deploy button in InitCode, or:
\`\`\`bash
initiad tx wasm store target/wasm32-unknown-unknown/release/contract.wasm \\
  --from <your-key> --chain-id initiation-2 --gas auto
\`\`\`

## Contract Addresses
| Network | Address |
|---------|---------|
| Initia Testnet | TBD |

## Built with InitCode
[InitCode](https://initcode.dev) — The browser IDE for Initia ecosystem development.
`;

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export const DEFAULT_FILES: FileNode[] = [
  {
    id: makeId(),
    name: "src",
    type: "folder",
    parentId: null,
    children: [
      {
        id: makeId(),
        name: "contract.rs",
        type: "file",
        language: "rust",
        parentId: "src",
        content: CW20_CONTRACT,
      },
    ],
  },
  {
    id: makeId(),
    name: "Cargo.toml",
    type: "file",
    language: "toml",
    parentId: null,
    content: CARGO_TOML,
  },
  {
    id: makeId(),
    name: "README.md",
    type: "file",
    language: "markdown",
    parentId: null,
    content: README,
  },
];

// Fix parent IDs after construction
DEFAULT_FILES[0].children![0].parentId = DEFAULT_FILES[0].id;

export interface Template {
  id: string;
  name: string;
  description: string;
  category: "token" | "nft" | "defi" | "utility";
  files: { name: string; content: string; language: string }[];
}

export const TEMPLATES: Template[] = [
  {
    id: "cw20-token",
    name: "CW20 Token",
    description: "Fungible token contract with mint, burn, and transfer capabilities.",
    category: "token",
    files: [
      { name: "contract.rs", content: CW20_CONTRACT, language: "rust" },
      { name: "Cargo.toml", content: CARGO_TOML, language: "toml" },
    ],
  },
  {
    id: "cw721-nft",
    name: "CW721 NFT",
    description: "Non-fungible token contract with minting and transfer functionality.",
    category: "nft",
    files: [
      { name: "contract.rs", content: CW721_CONTRACT, language: "rust" },
      { name: "Cargo.toml", content: CARGO_TOML, language: "toml" },
    ],
  },
  {
    id: "escrow",
    name: "Escrow Contract",
    description: "Time-locked escrow that releases funds after expiry or arbiter approval.",
    category: "defi",
    files: [
      { name: "contract.rs", content: ESCROW_CONTRACT, language: "rust" },
      { name: "Cargo.toml", content: CARGO_TOML, language: "toml" },
    ],
  },
];
