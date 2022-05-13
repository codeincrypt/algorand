const express = require('express')
const app = express();
const PORT = process.env.PORT || 10094;
app.use(express.json())
const moment = require('moment-timezone');
const algosdk = require('algosdk');

const BASE_URL = 'https://testnet-algorand.api.purestake.io/ps2'
const port = "";
const token = {'X-API-key': 'B3SU4KcVKi94Jap2VXkK83xx38bsv95K5UZm2lab'}
const algodClient = new algosdk.Algodv2(token, BASE_URL, port)

moment().tz("Asia/Calcutta").format();
process.env.TZ = 'Asia/Calcutta';

app.listen(PORT, () => {
    console.log(moment().format('DD MMM YYYY hh:mm:ss'))
  console.log("ALGO App now running on port", PORT);
});

app.get("/api/algo/addressGeneration", async (req, res) => {
    try {
        const myaccount = algosdk.generateAccount();
        // console.log("Account Address = " + myaccount.addr);
        let account_mnemonic = algosdk.secretKeyToMnemonic(myaccount.sk);
        // console.log("Account Mnemonic = "+ account_mnemonic);
        var output  = {
            StatusCode: "1",
            Message: "algo address generation is successful.",
            pubkey: myaccount.addr,
            privkey: account_mnemonic,
        }
        console.log(moment().format('DD MMM YYYY hh:mm:ss'), 'addressGeneration', output);
        res.json(output);
        
    } catch (error) {
        console.log(error);
        res.json({ StatusCode: "0", Message: error.message });
    }
});

app.post("/api/algo/getBalance", async (req, res) => {
    var pubkey = req.body.pubkey
    try {
        let accountInfo = await algodClient.accountInformation(pubkey).do();
		let amount = accountInfo.amount / 1000000
        // console.log("Account balance: microAlgos",pubkey,  amount);
        var output = {
            balance: amount,
            StatusCode: "1",
            Message: "Balance is found.",
        }
        console.log(moment().format('DD MMM YYYY hh:mm:ss'), 'getBalance', output);
        res.json(output);
    } catch (error) {
        console.log(error);
        res.json({ StatusCode: "0", Message: error.message });
    }
});

app.post("/api/algo/fundTransfer", async (req, res) => {
    var {senderprivkey, receiverpubkey, amount} = req.body
	try {
		var myAccount = algosdk.mnemonicToSecretKey(senderprivkey);

        // Construct the transaction
        let params = await algodClient.getTransactionParams().do();
        // comment out the next two lines to use suggested fee
        params.fee = algosdk.ALGORAND_MIN_TX_FEE;
        params.flatFee = true;

        const enc = new TextEncoder();
        const note = enc.encode(`ALGO TRANSFER ${amount}`);
        var sender = myAccount.addr;

        let txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: sender, 
            to: receiverpubkey, 
            amount: amount * 1000000, 
            note: note, 
            suggestedParams: params
        });

        // Sign the transaction
        let signedTxn = txn.signTxn(myAccount.sk);
        let txId = txn.txID().toString();
        console.log("Signed transaction with txID: %s", txId);

        // Submit the transaction
        await algodClient.sendRawTransaction(signedTxn).do();

        // Wait for confirmation
        let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
        //Get the completed Transaction
        console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
        let string = new TextDecoder().decode(confirmedTxn.txn.txn.note);
        console.log("Note field: ", string);
        accountInfo = await algodClient.accountInformation(myAccount.addr).do();
        console.log("Transaction Amount ", confirmedTxn.txn.txn.amt);        
        console.log("Transaction Fee", confirmedTxn.txn.txn.fee);
     
        var output  = {
            txnhash: txId,
            StatusCode: "1",
            Message: "ALGO has been sent successfully",
        }
        console.log(moment().format('DD MMM YYYY hh:mm:ss'), 'fundTransfer', output);
        res.json(output);
	} catch (err) {
		console.log("err", err);
        res.json({ StatusCode: "0", Message: err.message });
	}
});

app.post("/api/algo/fundTransfer_old", async (req, res) => {
    var {privkey, receiverpubkey, amount} = req.body
	try {
		var senderAccount = algosdk.mnemonicToSecretKey(privkey);
		console.log(senderAccount.addr);
		//Get the relevant params from the algod
		let params = await algodClient.getTransactionParams().do();

		// move the TEAL  program into Uint8Array
		let program = new Uint8Array(Buffer.from("ASABASI=", "base64"));
		let lsig = algosdk.makeLogicSig(program);
		lsig.sign(senderAccount.sk);

		//create a transaction
		let txn = {
			"from": senderAccount.addr,
			"to": receiverpubkey,
			"fee": params.fee,
			"amount": amount * 1000000,
			"firstRound": params.firstRound,
			"lastRound": params.lastRound,
			"genesisID": params.genesisID,
			"genesisHash": params.genesisHash,
		};

		let rawSignedTxn = algosdk.signLogicSigTransaction(txn, lsig);

		//Submit the lsig signed transaction
		let tx = await algodClient.sendRawTransaction(rawSignedTxn.blob).do();
		console.log("Transaction : " + tx.txId);
        var output  = {
            txnhash: tx.txId,
            StatusCode: "1",
            Message: "ALGO has been sent successfully",
        }
        console.log(moment().format('DD MMM YYYY hh:mm:ss'), 'fundTransfer', output);
        res.json(output);
	} catch (err) {
		console.log("err", err.message);
        res.json({ StatusCode: "0", Message: error });
	}
});
