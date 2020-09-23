const express = require('express');
const fetch = require('node-fetch');
const app = express();
require('dotenv').config()
app.use(express.json());


const commonpool = '0x05e42c4Ae51BA28d8aCF8c371009AD7138312CA4';
const honeymaker = '0x076b64f9f966e3bbd0fcdc79d490ab71cf961bb0';
const issuer = '0xB9FB2aD5820cCD9Fd7BD6a9E35f98B22914DB58A';
const burner = '0x0000000000000000000000000000000000000000';
const HoneyManager = '0x2118c3343f6d6d7a2b2ff68c82581cc188166d54';

const webhook = process.env.WEBHOOK_URI;
app.post('/commonpool-webhook', (req, res) => {
    let body = makebody(req.body);
    if (body != null) {
        fetch(webhook, {
            method: 'post',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        });
    }
    res.sendStatus(200);

});
const port = process.env.PORT || 80;
app.listen(port, () => console.log('Node.js server started on port 9000.'));



function makebody(json) {
    let sampleBody = {
        "embeds": [
            {
                "title": ":honey_pot: Honey Flow (inbound)",
                "color": 3320370,
                "fields": [],
                "url": "",
            },
            {
                "title": ":honey_pot: Honey Flow (outbound)",
                "color": 13571606,
                "fields": [],
                "url": "",
            }
        ],
        "username": "Common Pool Tracker",
        "avatar_url": "https://www.trafalgar.com/real-word/wp-content/uploads/sites/3/2020/01/Screenshot-2020-01-16-at-15.15.54-750x400.png"
    }
    console.log(JSON.stringify(json));
    if (json.status === 'confirmed' && json.network === "xdai") {
        if (json.from === honeymaker && json.to === commonpool) {
            sampleBody.embeds.splice(1, 1);
            let objB = sampleBody.embeds[0];
            objB.fields = [{
                "name": "HoneyMaker Fees",
                "value": `${json.contractCall.decimalValue} HNY`
            },
            {
                "name": "Transaction",
                "value": `https://blockscout.com/poa/xdai/tx/${json.hash}`
            }]
            sampleBody.embeds[0].url = 'https://blockscout.com/poa/xdai/tx/' + json.hash;
        }
        else if (json.from === commonpool) { //approval
            sampleBody.embeds.splice(0, 1);
            let objC = sampleBody.embeds[0];
            objC.fields = [{
                "name": "Approval",
                "value": `${json.contractCall.decimalValue} HNY`
            },
            {
                "name": "Transaction",
                "value": `https://blockscout.com/poa/xdai/tx/${json.hash}`
            }]
            sampleBody.embeds[0].url = 'https://blockscout.com/poa/xdai/tx/' + json.hash;
        }
        else if (json.internalTransactions.to === issuer) {//approval
            sampleBody.embeds.splice(0, 1);
            let objC = sampleBody.embeds[0];
            objC.fields = [{
                "name": "Issued",
                "value": `${json.internalTransactions.contractCall.decimalValue} HNY`
            },
            {
                "name": "Transaction",
                "value": `https://blockscout.com/poa/xdai/tx/${json.hash}`
            }]
            sampleBody.embeds[0].url = 'https://blockscout.com/poa/xdai/tx/' + json.hash;
        }
        else if (json.to === commonpool) {
            sampleBody.embeds.splice(1, 1);
            let objD = sampleBody.embeds[0];
            objD.fields = [{
                "name": "Donation",
                "value": `${json.contractCall.decimalValue} HNY`
            },
            {
                "name": "Transaction",
                "value": `https://blockscout.com/poa/xdai/tx/${json.hash}`
            }]
            sampleBody.embeds[0].url = 'https://blockscout.com/poa/xdai/tx/' + json.hash;
        };

        console.log(JSON.stringify(sampleBody));
        return sampleBody
    }
}