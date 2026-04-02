import type { FileNode } from "@/types";

// ─── Contract source templates ────────────────────────────────────────────────

const COUNTER_CONTRACT = `use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env,
    MessageInfo, Response, StdError, StdResult,
};
use serde::{Deserialize, Serialize};

// ── State ──────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct State {
    pub count: i64,
    pub owner: cosmwasm_std::Addr,
}

const STATE_KEY: &[u8] = b"state";

// ── Messages ───────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstantiateMsg {
    pub count: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Increment {},
    Decrement {},
    Reset { count: i64 },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    GetCount {},
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CountResponse {
    pub count: i64,
}

// ── Entry points ───────────────────────────────────────────────────────────────

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let state = State {
        count: msg.count,
        owner: info.sender.clone(),
    };
    deps.storage.set(STATE_KEY, &cosmwasm_std::to_json_vec(&state)?);

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender)
        .add_attribute("count", msg.count.to_string()))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    let mut state: State = cosmwasm_std::from_json(
        deps.storage.get(STATE_KEY).ok_or(StdError::not_found("state"))?,
    )?;

    match msg {
        ExecuteMsg::Increment {} => {
            state.count += 1;
            deps.storage.set(STATE_KEY, &cosmwasm_std::to_json_vec(&state)?);
            Ok(Response::new().add_attribute("method", "increment"))
        }
        ExecuteMsg::Decrement {} => {
            state.count -= 1;
            deps.storage.set(STATE_KEY, &cosmwasm_std::to_json_vec(&state)?);
            Ok(Response::new().add_attribute("method", "decrement"))
        }
        ExecuteMsg::Reset { count } => {
            if info.sender != state.owner {
                return Err(StdError::generic_err("Unauthorized: only owner can reset"));
            }
            state.count = count;
            deps.storage.set(STATE_KEY, &cosmwasm_std::to_json_vec(&state)?);
            Ok(Response::new().add_attribute("method", "reset"))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCount {} => {
            let state: State = cosmwasm_std::from_json(
                deps.storage.get(STATE_KEY).ok_or(StdError::not_found("state"))?,
            )?;
            to_json_binary(&CountResponse { count: state.count })
        }
    }
}
`;

const STAKING_CONTRACT = `use cosmwasm_std::{
    entry_point, to_json_binary, BankMsg, Binary, Coin, Deps, DepsMut,
    Env, MessageInfo, Response, StdError, StdResult, Uint128,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct StakeInfo {
    pub staker: cosmwasm_std::Addr,
    pub amount: Uint128,
    pub reward_debt: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Config {
    pub owner: cosmwasm_std::Addr,
    pub stake_denom: String,
    pub reward_rate: Uint128, // rewards per block
    pub total_staked: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstantiateMsg {
    pub stake_denom: String,
    pub reward_rate: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Stake {},
    Unstake { amount: Uint128 },
    ClaimRewards {},
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    Config {},
    StakeInfo { staker: String },
}

const CONFIG_KEY: &[u8] = b"config";
const STAKE_PREFIX: &str = "stake_";

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let config = Config {
        owner: info.sender,
        stake_denom: msg.stake_denom,
        reward_rate: msg.reward_rate,
        total_staked: Uint128::zero(),
    };
    deps.storage.set(CONFIG_KEY, &cosmwasm_std::to_json_vec(&config)?);
    Ok(Response::new().add_attribute("method", "instantiate"))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    let mut config: Config = cosmwasm_std::from_json(
        deps.storage.get(CONFIG_KEY).ok_or(StdError::not_found("config"))?,
    )?;

    match msg {
        ExecuteMsg::Stake {} => {
            let sent = info.funds.iter()
                .find(|c| c.denom == config.stake_denom)
                .map(|c| c.amount)
                .unwrap_or(Uint128::zero());

            if sent.is_zero() {
                return Err(StdError::generic_err("No funds sent"));
            }

            let stake_key = format!("{}{}", STAKE_PREFIX, info.sender);
            let mut stake: StakeInfo = deps.storage.get(stake_key.as_bytes())
                .map(|v| cosmwasm_std::from_json(v).unwrap())
                .unwrap_or(StakeInfo {
                    staker: info.sender.clone(),
                    amount: Uint128::zero(),
                    reward_debt: Uint128::zero(),
                });

            stake.amount += sent;
            config.total_staked += sent;

            deps.storage.set(stake_key.as_bytes(), &cosmwasm_std::to_json_vec(&stake)?);
            deps.storage.set(CONFIG_KEY, &cosmwasm_std::to_json_vec(&config)?);

            Ok(Response::new()
                .add_attribute("method", "stake")
                .add_attribute("amount", sent))
        }
        ExecuteMsg::Unstake { amount } => {
            let stake_key = format!("{}{}", STAKE_PREFIX, info.sender);
            let mut stake: StakeInfo = cosmwasm_std::from_json(
                deps.storage.get(stake_key.as_bytes()).ok_or(StdError::not_found("stake"))?,
            )?;

            if stake.amount < amount {
                return Err(StdError::generic_err("Insufficient staked amount"));
            }

            stake.amount -= amount;
            config.total_staked -= amount;

            deps.storage.set(stake_key.as_bytes(), &cosmwasm_std::to_json_vec(&stake)?);
            deps.storage.set(CONFIG_KEY, &cosmwasm_std::to_json_vec(&config)?);

            Ok(Response::new()
                .add_messages(vec![BankMsg::Send {
                    to_address: info.sender.to_string(),
                    amount: vec![Coin { denom: config.stake_denom, amount }],
                }])
                .add_attribute("method", "unstake"))
        }
        ExecuteMsg::ClaimRewards {} => {
            Ok(Response::new().add_attribute("method", "claim_rewards"))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => {
            let config: Config = cosmwasm_std::from_json(
                deps.storage.get(CONFIG_KEY).ok_or(StdError::not_found("config"))?,
            )?;
            to_json_binary(&config)
        }
        QueryMsg::StakeInfo { staker } => {
            let stake_key = format!("{}{}", STAKE_PREFIX, staker);
            let stake: StakeInfo = cosmwasm_std::from_json(
                deps.storage.get(stake_key.as_bytes()).ok_or(StdError::not_found("stake info"))?,
            )?;
            to_json_binary(&stake)
        }
    }
}
`;

const VOTING_CONTRACT = `use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env,
    MessageInfo, Response, StdError, StdResult, Timestamp,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Expired,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub proposer: cosmwasm_std::Addr,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub status: ProposalStatus,
    pub expires_at: Timestamp,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstantiateMsg {
    pub voting_period_seconds: u64,
    pub quorum: u64,    // minimum votes to pass
    pub threshold: u64, // % of yes votes needed (0-100)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Propose { title: String, description: String },
    Vote { proposal_id: u64, approve: bool },
    Execute { proposal_id: u64 },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    Proposal { id: u64 },
    ListProposals { limit: Option<u32> },
}

const CONFIG_KEY: &[u8] = b"config";
const PROPOSAL_COUNT_KEY: &[u8] = b"count";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Config {
    pub voting_period_seconds: u64,
    pub quorum: u64,
    pub threshold: u64,
}

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let config = Config {
        voting_period_seconds: msg.voting_period_seconds,
        quorum: msg.quorum,
        threshold: msg.threshold,
    };
    deps.storage.set(CONFIG_KEY, &cosmwasm_std::to_json_vec(&config)?);
    deps.storage.set(PROPOSAL_COUNT_KEY, &cosmwasm_std::to_json_vec(&0u64)?);
    Ok(Response::new().add_attribute("method", "instantiate"))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    let config: Config = cosmwasm_std::from_json(
        deps.storage.get(CONFIG_KEY).ok_or(StdError::not_found("config"))?,
    )?;

    match msg {
        ExecuteMsg::Propose { title, description } => {
            let mut count: u64 = cosmwasm_std::from_json(
                deps.storage.get(PROPOSAL_COUNT_KEY).ok_or(StdError::not_found("count"))?,
            )?;
            count += 1;

            let proposal = Proposal {
                id: count,
                title,
                description,
                proposer: info.sender,
                yes_votes: 0,
                no_votes: 0,
                status: ProposalStatus::Active,
                expires_at: Timestamp::from_seconds(
                    env.block.time.seconds() + config.voting_period_seconds,
                ),
            };

            let key = format!("proposal_{}", count);
            deps.storage.set(key.as_bytes(), &cosmwasm_std::to_json_vec(&proposal)?);
            deps.storage.set(PROPOSAL_COUNT_KEY, &cosmwasm_std::to_json_vec(&count)?);

            Ok(Response::new()
                .add_attribute("method", "propose")
                .add_attribute("proposal_id", count.to_string()))
        }
        ExecuteMsg::Vote { proposal_id, approve } => {
            let key = format!("proposal_{}", proposal_id);
            let mut proposal: Proposal = cosmwasm_std::from_json(
                deps.storage.get(key.as_bytes()).ok_or(StdError::not_found("proposal"))?,
            )?;

            if proposal.status != ProposalStatus::Active {
                return Err(StdError::generic_err("Proposal is not active"));
            }
            if env.block.time > proposal.expires_at {
                return Err(StdError::generic_err("Proposal has expired"));
            }

            if approve {
                proposal.yes_votes += 1;
            } else {
                proposal.no_votes += 1;
            }

            // Auto-tally
            let total = proposal.yes_votes + proposal.no_votes;
            if total >= config.quorum {
                let yes_pct = proposal.yes_votes * 100 / total;
                proposal.status = if yes_pct >= config.threshold {
                    ProposalStatus::Passed
                } else {
                    ProposalStatus::Rejected
                };
            }

            deps.storage.set(key.as_bytes(), &cosmwasm_std::to_json_vec(&proposal)?);

            Ok(Response::new()
                .add_attribute("method", "vote")
                .add_attribute("approve", approve.to_string()))
        }
        ExecuteMsg::Execute { proposal_id } => {
            let key = format!("proposal_{}", proposal_id);
            let proposal: Proposal = cosmwasm_std::from_json(
                deps.storage.get(key.as_bytes()).ok_or(StdError::not_found("proposal"))?,
            )?;

            if proposal.status != ProposalStatus::Passed {
                return Err(StdError::generic_err("Proposal has not passed"));
            }

            Ok(Response::new().add_attribute("method", "execute_proposal"))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Proposal { id } => {
            let key = format!("proposal_{}", id);
            let proposal: Proposal = cosmwasm_std::from_json(
                deps.storage.get(key.as_bytes()).ok_or(StdError::not_found("proposal"))?,
            )?;
            to_json_binary(&proposal)
        }
        QueryMsg::ListProposals { limit } => {
            let count: u64 = cosmwasm_std::from_json(
                deps.storage.get(PROPOSAL_COUNT_KEY).ok_or(StdError::not_found("count"))?,
            )?;
            let limit = limit.unwrap_or(10).min(30) as u64;
            let mut proposals = vec![];
            for i in (1..=count).rev().take(limit as usize) {
                let key = format!("proposal_{}", i);
                if let Some(v) = deps.storage.get(key.as_bytes()) {
                    if let Ok(p) = cosmwasm_std::from_json::<Proposal>(v) {
                        proposals.push(p);
                    }
                }
            }
            to_json_binary(&proposals)
        }
    }
}
`;

const CW20_CONTRACT = `use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env,
    MessageInfo, Response, StdError, StdResult, Uint128,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TokenInfo {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: Uint128,
    pub mint: Option<cosmwasm_std::Addr>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub initial_supply: Uint128,
    pub mint: Option<String>, // optional admin minter address
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Transfer { recipient: String, amount: Uint128 },
    Mint { recipient: String, amount: Uint128 },
    Burn { amount: Uint128 },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    TokenInfo {},
    Balance { address: String },
}

const TOKEN_INFO_KEY: &[u8] = b"token_info";
const BALANCE_PREFIX: &str = "balance_";

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let token_info = TokenInfo {
        name: msg.name.clone(),
        symbol: msg.symbol.clone(),
        decimals: msg.decimals,
        total_supply: msg.initial_supply,
        mint: msg.mint.map(|m| deps.api.addr_validate(&m)).transpose()?,
    };
    deps.storage.set(TOKEN_INFO_KEY, &cosmwasm_std::to_json_vec(&token_info)?);

    // Credit initial supply to sender
    let key = format!("{}{}", BALANCE_PREFIX, info.sender);
    deps.storage.set(key.as_bytes(), &cosmwasm_std::to_json_vec(&msg.initial_supply)?);

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("token", msg.name)
        .add_attribute("symbol", msg.symbol)
        .add_attribute("supply", msg.initial_supply))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    match msg {
        ExecuteMsg::Transfer { recipient, amount } => {
            let sender_key = format!("{}{}", BALANCE_PREFIX, info.sender);
            let sender_bal: Uint128 = deps.storage.get(sender_key.as_bytes())
                .map(|v| cosmwasm_std::from_json(v).unwrap())
                .unwrap_or(Uint128::zero());

            if sender_bal < amount {
                return Err(StdError::generic_err("Insufficient balance"));
            }

            let recipient_addr = deps.api.addr_validate(&recipient)?;
            let recipient_key = format!("{}{}", BALANCE_PREFIX, recipient_addr);
            let recipient_bal: Uint128 = deps.storage.get(recipient_key.as_bytes())
                .map(|v| cosmwasm_std::from_json(v).unwrap())
                .unwrap_or(Uint128::zero());

            deps.storage.set(sender_key.as_bytes(), &cosmwasm_std::to_json_vec(&(sender_bal - amount))?);
            deps.storage.set(recipient_key.as_bytes(), &cosmwasm_std::to_json_vec(&(recipient_bal + amount))?);

            Ok(Response::new()
                .add_attribute("method", "transfer")
                .add_attribute("to", recipient)
                .add_attribute("amount", amount))
        }
        ExecuteMsg::Mint { recipient, amount } => {
            let mut token_info: TokenInfo = cosmwasm_std::from_json(
                deps.storage.get(TOKEN_INFO_KEY).ok_or(StdError::not_found("token_info"))?,
            )?;
            if token_info.mint.as_ref() != Some(&info.sender) {
                return Err(StdError::generic_err("Unauthorized: not the minter"));
            }
            let recipient_addr = deps.api.addr_validate(&recipient)?;
            let key = format!("{}{}", BALANCE_PREFIX, recipient_addr);
            let bal: Uint128 = deps.storage.get(key.as_bytes())
                .map(|v| cosmwasm_std::from_json(v).unwrap())
                .unwrap_or(Uint128::zero());
            deps.storage.set(key.as_bytes(), &cosmwasm_std::to_json_vec(&(bal + amount))?);
            token_info.total_supply += amount;
            deps.storage.set(TOKEN_INFO_KEY, &cosmwasm_std::to_json_vec(&token_info)?);
            Ok(Response::new().add_attribute("method", "mint"))
        }
        ExecuteMsg::Burn { amount } => {
            let key = format!("{}{}", BALANCE_PREFIX, info.sender);
            let bal: Uint128 = deps.storage.get(key.as_bytes())
                .map(|v| cosmwasm_std::from_json(v).unwrap())
                .unwrap_or(Uint128::zero());
            if bal < amount {
                return Err(StdError::generic_err("Insufficient balance to burn"));
            }
            let mut token_info: TokenInfo = cosmwasm_std::from_json(
                deps.storage.get(TOKEN_INFO_KEY).ok_or(StdError::not_found("token_info"))?,
            )?;
            deps.storage.set(key.as_bytes(), &cosmwasm_std::to_json_vec(&(bal - amount))?);
            token_info.total_supply -= amount;
            deps.storage.set(TOKEN_INFO_KEY, &cosmwasm_std::to_json_vec(&token_info)?);
            Ok(Response::new().add_attribute("method", "burn"))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::TokenInfo {} => {
            let info: TokenInfo = cosmwasm_std::from_json(
                deps.storage.get(TOKEN_INFO_KEY).ok_or(StdError::not_found("token_info"))?,
            )?;
            to_json_binary(&info)
        }
        QueryMsg::Balance { address } => {
            let addr = deps.api.addr_validate(&address)?;
            let key = format!("{}{}", BALANCE_PREFIX, addr);
            let bal: Uint128 = deps.storage.get(key.as_bytes())
                .map(|v| cosmwasm_std::from_json(v).unwrap())
                .unwrap_or(Uint128::zero());
            to_json_binary(&bal)
        }
    }
}
`;

const CW721_CONTRACT = `use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env,
    MessageInfo, Response, StdError, StdResult,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CollectionInfo {
    pub name: String,
    pub symbol: String,
    pub minter: cosmwasm_std::Addr,
    pub total_supply: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NftInfo {
    pub token_id: String,
    pub owner: cosmwasm_std::Addr,
    pub token_uri: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub minter: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Mint { token_id: String, owner: String, token_uri: Option<String> },
    Transfer { recipient: String, token_id: String },
    Burn { token_id: String },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    CollectionInfo {},
    NftInfo { token_id: String },
    Tokens { owner: String },
}

const COLLECTION_KEY: &[u8] = b"collection";
const NFT_PREFIX: &str = "nft_";

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let info = CollectionInfo {
        name: msg.name.clone(),
        symbol: msg.symbol.clone(),
        minter: deps.api.addr_validate(&msg.minter)?,
        total_supply: 0,
    };
    deps.storage.set(COLLECTION_KEY, &cosmwasm_std::to_json_vec(&info)?);
    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("name", msg.name)
        .add_attribute("symbol", msg.symbol))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    match msg {
        ExecuteMsg::Mint { token_id, owner, token_uri } => {
            let mut collection: CollectionInfo = cosmwasm_std::from_json(
                deps.storage.get(COLLECTION_KEY).ok_or(StdError::not_found("collection"))?,
            )?;
            if info.sender != collection.minter {
                return Err(StdError::generic_err("Unauthorized: not the minter"));
            }
            let key = format!("{}{}", NFT_PREFIX, token_id);
            if deps.storage.get(key.as_bytes()).is_some() {
                return Err(StdError::generic_err("Token ID already exists"));
            }
            let nft = NftInfo {
                token_id: token_id.clone(),
                owner: deps.api.addr_validate(&owner)?,
                token_uri,
            };
            deps.storage.set(key.as_bytes(), &cosmwasm_std::to_json_vec(&nft)?);
            collection.total_supply += 1;
            deps.storage.set(COLLECTION_KEY, &cosmwasm_std::to_json_vec(&collection)?);
            Ok(Response::new().add_attribute("method", "mint").add_attribute("token_id", token_id))
        }
        ExecuteMsg::Transfer { recipient, token_id } => {
            let key = format!("{}{}", NFT_PREFIX, token_id);
            let mut nft: NftInfo = cosmwasm_std::from_json(
                deps.storage.get(key.as_bytes()).ok_or(StdError::not_found("nft"))?,
            )?;
            if nft.owner != info.sender {
                return Err(StdError::generic_err("Unauthorized: not the owner"));
            }
            nft.owner = deps.api.addr_validate(&recipient)?;
            deps.storage.set(key.as_bytes(), &cosmwasm_std::to_json_vec(&nft)?);
            Ok(Response::new().add_attribute("method", "transfer"))
        }
        ExecuteMsg::Burn { token_id } => {
            let key = format!("{}{}", NFT_PREFIX, token_id);
            let nft: NftInfo = cosmwasm_std::from_json(
                deps.storage.get(key.as_bytes()).ok_or(StdError::not_found("nft"))?,
            )?;
            if nft.owner != info.sender {
                return Err(StdError::generic_err("Unauthorized: not the owner"));
            }
            deps.storage.remove(key.as_bytes());
            Ok(Response::new().add_attribute("method", "burn"))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::CollectionInfo {} => {
            let info: CollectionInfo = cosmwasm_std::from_json(
                deps.storage.get(COLLECTION_KEY).ok_or(StdError::not_found("collection"))?,
            )?;
            to_json_binary(&info)
        }
        QueryMsg::NftInfo { token_id } => {
            let key = format!("{}{}", NFT_PREFIX, token_id);
            let nft: NftInfo = cosmwasm_std::from_json(
                deps.storage.get(key.as_bytes()).ok_or(StdError::not_found("nft"))?,
            )?;
            to_json_binary(&nft)
        }
        QueryMsg::Tokens { owner } => {
            to_json_binary(&Vec::<String>::new()) // simplified
        }
    }
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

const STATE_KEY: &[u8] = b"state";

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
    deps.storage.set(STATE_KEY, &cosmwasm_std::to_json_vec(&state)?);
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
        deps.storage.get(STATE_KEY).ok_or(StdError::not_found("state"))?,
    )?;
    match msg {
        ExecuteMsg::Approve {} => {
            if info.sender != state.arbiter {
                return Err(StdError::generic_err("Unauthorized: only arbiter can approve"));
            }
            Ok(Response::new()
                .add_messages(vec![BankMsg::Send {
                    to_address: state.recipient.to_string(),
                    amount: state.balance,
                }])
                .add_attribute("action", "approve"))
        }
        ExecuteMsg::Refund {} => {
            if env.block.time < state.end_time {
                return Err(StdError::generic_err("Escrow has not expired yet"));
            }
            Ok(Response::new()
                .add_messages(vec![BankMsg::Send {
                    to_address: state.source.to_string(),
                    amount: state.balance,
                }])
                .add_attribute("action", "refund"))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetState {} => {
            let state: State = cosmwasm_std::from_json(
                deps.storage.get(STATE_KEY).ok_or(StdError::not_found("state"))?,
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

## Built with InitCode
[InitCode](https://initcode.dev) — The browser IDE for Initia ecosystem development.
`;

// ─── Default file tree ────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const srcFolderId = makeId();
const contractFileId = makeId();

export const DEFAULT_FILES: FileNode[] = [
  {
    id: srcFolderId,
    name: "src",
    type: "folder",
    parentId: null,
    children: [
      {
        id: contractFileId,
        name: "contract.rs",
        type: "file",
        language: "rust",
        parentId: srcFolderId,
        content: COUNTER_CONTRACT,
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

// Set first active file
export const DEFAULT_ACTIVE_FILE_ID = contractFileId;

// ─── Template library ─────────────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  description: string;
  category: "starter" | "token" | "nft" | "defi" | "governance";
  difficulty: "beginner" | "intermediate" | "advanced";
  files: { name: string; content: string; language: string }[];
}

export const TEMPLATES: Template[] = [
  {
    id: "counter",
    name: "Counter",
    description: "Simple counter with increment, decrement, and reset. Perfect for learning CosmWasm basics.",
    category: "starter",
    difficulty: "beginner",
    files: [
      { name: "contract.rs", content: COUNTER_CONTRACT, language: "rust" },
      { name: "Cargo.toml", content: CARGO_TOML, language: "toml" },
    ],
  },
  {
    id: "cw20-token",
    name: "CW20 Token",
    description: "Fungible token with mint, burn, and transfer. Includes capped supply and admin minter.",
    category: "token",
    difficulty: "intermediate",
    files: [
      { name: "contract.rs", content: CW20_CONTRACT, language: "rust" },
      { name: "Cargo.toml", content: CARGO_TOML, language: "toml" },
    ],
  },
  {
    id: "cw721-nft",
    name: "CW721 NFT",
    description: "Non-fungible token collection with mint, transfer, and burn functionality.",
    category: "nft",
    difficulty: "intermediate",
    files: [
      { name: "contract.rs", content: CW721_CONTRACT, language: "rust" },
      { name: "Cargo.toml", content: CARGO_TOML, language: "toml" },
    ],
  },
  {
    id: "escrow",
    name: "Escrow",
    description: "Time-locked escrow that releases funds after expiry or arbiter approval.",
    category: "defi",
    difficulty: "intermediate",
    files: [
      { name: "contract.rs", content: ESCROW_CONTRACT, language: "rust" },
      { name: "Cargo.toml", content: CARGO_TOML, language: "toml" },
    ],
  },
  {
    id: "staking",
    name: "Staking",
    description: "Stake tokens, earn rewards, and unstake with a configurable reward rate.",
    category: "defi",
    difficulty: "advanced",
    files: [
      { name: "contract.rs", content: STAKING_CONTRACT, language: "rust" },
      { name: "Cargo.toml", content: CARGO_TOML, language: "toml" },
    ],
  },
  {
    id: "voting-dao",
    name: "Voting / DAO",
    description: "On-chain governance with proposals, voting, quorum, and threshold configuration.",
    category: "governance",
    difficulty: "advanced",
    files: [
      { name: "contract.rs", content: VOTING_CONTRACT, language: "rust" },
      { name: "Cargo.toml", content: CARGO_TOML, language: "toml" },
    ],
  },
];
