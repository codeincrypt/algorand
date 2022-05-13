const express = require("express");
const app = express();
app.use(express.json());

const moment = require("moment-timezone");
const algosdk = require("algosdk");

const BASE_URL = "https://testnet-algorand.api.purestake.io/ps2";
const port = "";
const token = { "X-API-key": "B3SU4KcVKi94Jap2VXkK83xx38bsv95K5UZm2lab" };
const algodClient = new algosdk.Algodv2(token, BASE_URL, port);

const POOL_PUBLIC_KEY = "T2AAWM6XPHBJNUWPB2MY64WGUHZASFP2YR5RHPAZ5IPT6RMFL4O7CJSF7U";

moment().tz("Asia/Calcutta").format();
process.env.TZ = "Asia/Calcutta";

var myArr = [
    {
        private_key:
        "patient reflect helmet display office opinion wet ladder office faculty adapt ceiling pistol empower sand asthma spot slender keen vacant december game early abandon trigger",
        public_key: "4DI6Y4JNQWOSSOAKPMIAUTZKWTSICXHHW4LTWME72ENZPKIPMFUTVQJCPI",
        balance: 8.49,
    },
    {
        private_key:
        "salon gain six vibrant tooth want lamp alien opinion vote now picture fossil welcome gap cupboard calm pause enable figure kangaroo whip canal ability employ",
        public_key: "JIXBACNODFRUH3GV35VJ3AFDOR2HTM2JZULDJWMIWULFFI6QGWPSYDEEXQ",
        balance: 0.998,
    },
];

const runSchedular = async () => {
  console.log(moment().format("DD MMM YYYY hh:mm:ss"));

  // const myArr = JSON.parse(body);
  for (let i = 0; i < myArr.length; i++) {
    try {

      let accountInfo = await algodClient.accountInformation(myArr[i].public_key).do();
      let node_bal = accountInfo.amount / 1000000;
      console.log('node_bal', myArr[i].public_key, node_bal)
      var db_balance6prec = parseFloat(myArr[i].balance).toFixed(6);
  
      if (parseFloat(node_bal) === parseFloat(db_balance6prec)) {
        console.log("No received");
      } else {
        const extra_balance = parseFloat(node_bal) - parseFloat(db_balance6prec);
        console.log("Extra balance.. " + extra_balance.toFixed(6));
  
        if (parseFloat(extra_balance.toFixed(6)) > 3) {
          const send_pool = extra_balance.toFixed(6) - 1;
          console.log("Sending to pool.." + send_pool);
  
          sendToPoolAccount(i, myArr[i].private_key, send_pool);
        }
      }
      
    } catch (error) {
      console.log('error', error.message);
    }
  }
};

const sendToPoolAccount = async (i, private_key, amount) => {

  try {
    let params = await algodClient.getTransactionParams().do();
    params.fee = algosdk.ALGORAND_MIN_TX_FEE;
    params.flatFee = true;
  
    const enc = new TextEncoder();
    const note = enc.encode("Fund Transfering to Pool Account.");
    let sender = algosdk.mnemonicToSecretKey(private_key);
    let txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: POOL_PUBLIC_KEY,
      amount: amount * 1000000,
      note: note,
      suggestedParams: params,
    });
    let signedTxn = txn.signTxn(sender.sk);
    let txId = txn.txID().toString();
    await algodClient.sendRawTransaction(signedTxn).do();
    console.log("txId", txId);

    let accountInfo = await algodClient.accountInformation(myArr[i].public_key).do();
    let node_bal = accountInfo.amount / 1000000;
    console.log('after transaction to pool account', sender.addr, node_bal)

  } catch (error) {
    console.log('error in sendToPoolAccount', error)
  }
};

setInterval(runSchedular, 10000);
