# HIVE Sell Bot For Druckado

Bot used to automatically transfer HIVE to Binance and sell it. 

### Installation

```
git clone git@github.com:wehmoen/hive_sell_bot.git
cd hive_sell_bot
npm install
```

Copy the `example_dot_env` to `.env` and insert the required details. 
You can create an API Key for Binance at: https://www.binance.com/en/my/settings/api-management
You need to enable "Enable Reading" and "Enable Spot & Margin Trading".

I recommend to restrict access to your server IP Address!

### Usage

Setup two cronjobs:
```
*/5 * * * * node path/to/hive_sell_bot/cron/1_check_hive_account.js
*/5 * * * * node path/to/hive_sell_bot/cron/2_sell_hive.js
```


