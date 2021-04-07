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
function formatSellQty(quantity, decimals) {

    const reg = new RegExp(`^-?\\d+(?:\.\\d{0,${decimals}})?`, "g")

    if (parseInt(decimals) === 0) {
        if (quantity.indexOf(".") > -1) {
            return quantity.split(".")[0]
        }
        return quantity
    }

    return reg.exec(quantity)[0]
}

(async () => {

    log("")
    log("=====================================================================")
    log("")
    log(`Starting ${process.argv[1].split(path.sep).slice(-1)[0]}`)

    const binanceAccount = await binance.account();
    assert(binanceAccount.canTrade, "Your Binance account is marked as \"can not trade\"!")

    const exchangeInfo = await binance.exchangeInfo();
    log(`Loading exchange informations...`)

    const pairInfo = exchangeInfo.symbols.find(x => x.symbol === `HIVE${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY}`)

    const HIVEBalanceBinance = binanceAccount.balances.find(x => x.asset === "HIVE");
    log(`Loading HIVE Balance from Binance: ${HIVEBalanceBinance.free} HIVE`)

    if (parseFloat(HIVEBalanceBinance.free) >= process.env.VAR_EXCHANGE_MIN_SELL_HIVE) {

        if (parseFloat(HIVEBalanceBinance.free) <= parseFloat(pairInfo.filters.find(x => x.filterType === "MIN_NOTIONAL").minNotional)) {
            log(`Binance does not allow sales for less than ${pairInfo.filters.find(x => x.filterType === "MIN_NOTIONAL").minNotional} HIVE!`)
        }

        const order = await binance.newOrder({
            symbol: `HIVE${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY}`,
            side: "SELL",
            type: "MARKET",
            quantity: formatSellQty(HIVEBalanceBinance.free, process.env.VAR_EXCHANGE_OUTPUT_STEP_SIZE)
        })

        log("HIVE SOLD!");
        log(`Sold ${order.executedQty} HIVE for ${order.cummulativeQuoteQty} ${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY}`);
        log(`Fills: \n${JSON.stringify(order.fills, null, 4)}`)
    } else {
        log(`Can not sell less than ${process.env.VAR_EXCHANGE_MIN_SELL_HIVE} HIVE at Binance!`)
    }

    if (process.env.VAR_EXCHANGE_OUTPUT_CURRENCY === "BTC" && process.env.VAR_EXCHANGE_SELL_TO_FIAT === "true") {
        const BTCBalanceBinance = binanceAccount.balances.find(x => x.asset === "BTC");
        log(`Loading BTC Balance from Binance: ${BTCBalanceBinance.free} BTC`)

        const order = await binance.newOrder({
            symbol: `${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY}EUR`,
            side: "SELL",
            type: "MARKET",
            quantity: formatSellQty(BTCBalanceBinance.free, process.env.VAR_EXCHANGE_OUTPUT_FIAT_STEP_SIZE)
        })

        log("BTC SOLD!");
        log(`Sold ${order.executedQty} ${process.env.VAR_EXCHANGE_OUTPUT_CURRENCY} for ${order.cummulativeQuoteQty} EUR`);
        log(`Fills: \n${JSON.stringify(order.fills, null, 4)}`)
    }

})().catch(e => console.log(e))
