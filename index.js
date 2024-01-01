require('dotenv').config;

const ccxt = require('ccxt'); 
const axios = require('axios');

const tick = async() => {
	const {asset, base, spread, allocation} = config;
	const market = `${asset}/${base}`;

	//cancel previous orders
	const orders = await binanceClient.fetchOpenOrders(market);
	orders.forEach(async order => {
		await binanceClient.cancelOrder(order.id);
	});

	//grab prices from coingecko as this site has all the prices from the different exchanges
	const results = await Promise.all([
		axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
		axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
	]);
 
 	//get actual marketPrice of bitcoin
	const marketPrice = results[0].data.bitcoin.usd / results[1].data.tether.usd

	const sellPrice = marketPrice * (spread + 1);
	const buyPrice = marketPrice * (1 - spread);
	const balances = await binanceClient.fetchBalance();
	const assetBalance = balances.free[asset];
	const baseBalance = balances.free[base];
	const sellVolume = assetBalance * allocation;
	const buyVolume = (baseBalance * allocation)/ marketPrice;

	await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice);
	await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice);

	console.log(`
		New tick for ${market}....
		Create limit sell order for ${sellVolume} @ ${sellPrice}
		Create limit buy order for ${buyVolume} @ ${buyPrice}
	`);
}	


const run = () => {
	const config = {
		asset: 'BTC',
		base: 'USDT',
		allocation: 0.1, //i.e. 10%
		spread: 0.2, //i.e. 20% of current price
		tickInterval: 2000
	};

	const binanceClient = new ccxt.binance({
		apiKey: process.env.API_ENV,
		secret: process.env.API_SECRET
	});

	tick(config, binanceClient);
	setInterval(tick, config.tickIntetval, config, binanceClient);
}

run();