require('dotenv').config(); //.env file parser

// NodeJS Modules
const assert = require("assert");
const path = require("path");
const fs = require("fs");

const HIVE = require("@hiveio/hive-js");
const {binance} = require('../lib')

/**
 * @description Logs the given line to a logfile and the console. Prepends the current date as ISO String
 * @param line
 */
function log(line) {
    const logFile = process.env.VAR_LOG_FILE_PATH || __dirname + `/${process.argv[1].split(path.sep).slice(-1)[0].split(".")[0]}.log`;
    const logLine = `[${(new Date()).toISOString()}] ${line}`
    fs.appendFileSync(logFile, logLine + "\n")
    console.log(logLine)
}

/**
 * @description Returns the HIVE or HBD balance of a given account.
 * @param account
 * @param currency
 * @returns {Promise<number>}
 */
async function getAccountBalance(account, currency = "HIVE") {
    assert(["HIVE", "HBD"].includes(currency), "Can only get HIVE or HBD balance for an account.");
    const [user] = await HIVE.api.getAccountsAsync([account]);
    assert(user !== undefined, `The account does not exist! Unable to check balance for ${account}.`)
    if (currency === "HIVE") {
        return parseFloat(user.balance, 10);
    }

    return parseFloat(user.hbd_balance, 10)

}

/**
 * @description
 * @param amount
 * @param currency
 * @returns {string}
 */
function formatAmount(amount, currency = "HIVE") {
    assert(["HIVE", "HBD"].includes(currency), "Can only format HIVE or HBD balance.");
    assert(typeof amount === "number", "Amount must be a number.")
    return [amount.toFixed(3), currency].join(" ")
}

(async () => {
    log("")
    log("=====================================================================")
    log("")
    log(`Starting ${process.argv[1].split(path.sep).slice(-1)[0]}`)

    const balance = await getAccountBalance(process.env.VAR_HIVE_ACCOUNT, "HIVE");
    log(`Loaded HIVE balance for ${process.env.VAR_HIVE_ACCOUNT}: ${formatAmount(balance)}`)

    const ticker = await binance.tickerPrice({symbol: `HIVE${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY}`});
    log(`Loaded HIVE${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY} price from Binance: ${parseFloat(ticker.price)}`);

    const balance_usdt_value = balance * parseFloat(ticker.price);
    log(`HIVE balance is worth ${balance_usdt_value} ${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY}`)

    if (balance_usdt_value >= process.env.VAR_HIVE_ACCOUNT_USD_THRESHOLD) {
        log("USD Threshold reached! Starting deposit process.")

        const depositAddress = await binance.depositAddress({asset: "HIVE"})
        if (depositAddress.success === false) {
            log(`Could not retrieve deposit address. Error message returned form Binance: ${depositAddress.msg}`)
            return;
        }
        log(`Deposit Address: ${depositAddress.address}`)
        log(`Deposit Memo: ${depositAddress.addressTag}`)

        const depositAmount = balance * process.env.VAR_EXCHANGE_PERCENT;
        const stakeAmount = balance - depositAmount;

        const hive_operations = [];

        if (stakeAmount >= 0.001) {
            hive_operations.push([
                'transfer_to_vesting',
                {
                    from: process.env.VAR_HIVE_ACCOUNT,
                    to: process.env.VAR_HIVE_STAKE_ACCOUNT,
                    amount: formatAmount(stakeAmount)
                }
            ])
        }

        hive_operations.push([
            'transfer',
            {
                from: process.env.VAR_HIVE_ACCOUNT,
                to: depositAddress.address,
                amount: formatAmount(depositAmount),
                memo: depositAddress.addressTag
            }
        ])

        log(`HIVE Operations to broadcast: \n${JSON.stringify(hive_operations, null, 4)}`)

        HIVE.broadcast.send({
            operations: hive_operations
        }, {active: process.env.VAR_HIVE_ACCOUNT_WIF}, (err, result) => {
            if (err) {
                log(`Failed to broadcast operations: ${err.message}`)
                console.log(err)
            } else {
                log(`Deposit of ${depositAmount} HIVE started. ${stakeAmount} HIVE staked to ${process.env.VAR_HIVE_STAKE_ACCOUNT}`);
                log(`https://hiveblocks.com/tx/${result.id}`);
            }
        })

    } else {
        log("USD Threshold NOT reached. Checking again in 5 minutes.")
    }
})().catch(e => log(e))
