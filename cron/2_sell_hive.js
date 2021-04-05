const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); //.env file parser

// NodeJS Modules
const assert = require("assert");
const fs = require("fs");

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
 * @description Cuts of quantity after second decimal place without rounding.
 * @param quantity
 * @returns {string}
 */
function formatSellQty(quantity) {
    return quantity.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0]
}

(async () => {

    log("")
    log("=====================================================================")
    log("")
    log(`Starting ${process.argv[1].split(path.sep).slice(-1)[0]}`)

    const binanceAccount = await binance.account();
    assert(binanceAccount.canTrade, "Your Binance account is marked as \"can not trade\"!")

    const HIVEBalanceBinance = binanceAccount.balances.find(x => x.asset === "HIVE");
    log(`Loading HIVE Balance from Binance: ${HIVEBalanceBinance.free} HIVE`)

    if (parseFloat(HIVEBalanceBinance.free) < process.env.VAR_EXCHANGE_MIN_SELL_HIVE) {
        log(`Can not sell less than ${process.env.VAR_EXCHANGE_MIN_SELL_HIVE} HIVE at Binance!`)
        return;
    }

    const order = await binance.newOrder({
        symbol: `HIVE${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY}`,
        side: "SELL",
        type: "MARKET",
        quantity: formatSellQty(HIVEBalanceBinance.free)
    })

    log("HIVE SOLD!");
    log(`Sold ${order.executedQty} HIVE for ${order.cummulativeQuoteQty} ${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY}`);
    log(`Fills: \n${JSON.stringify(order.fills, null, 4)}`)

})().catch(e => console.log(e))
