const api = require('binance');
const binanceRest = new api.BinanceRest({
    key: process.env.VAR_BINANCE_API_KEY,
    secret: process.env.VAR_BINANCE_API_SECRET
})



module.exports = binanceRest;
