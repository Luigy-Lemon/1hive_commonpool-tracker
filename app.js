require('dotenv').config()
const fs = require('fs')
const express = require('express')
const fetch = require('node-fetch')

const DISCORD_WEBHOOK_URI = process.env.WEBHOOK_URI

const COMMON_POOL_ADDRESS = '0x05e42c4Ae51BA28d8aCF8c371009AD7138312CA4'
const HONEY_MAKER_ADDRESS = '0x076b64f9f966e3bbd0fcdc79d490ab71cf961bb0'
const ISSUER_ADDRESS = '0xB9FB2aD5820cCD9Fd7BD6a9E35f98B22914DB58A'
const BURNER_ADDRESS = '0x0000000000000000000000000000000000000000'
const HONEY_MANAGER_ADDRESS = '0x2118c3343f6d6d7a2b2ff68c82581cc188166d54'

function parseEvent (tx) {
  if (tx.status !== 'confirmed' || tx.network !== 'xdai') {
    return null
  }

  const event = {}
  if (tx.from === HONEY_MAKER_ADDRESS && tx.to === COMMON_POOL_ADDRESS) {
    event.direction = 'incoming'
    event.source = 'honeymaker'
    event.value = tx.contractCall.decimalValue
  } else if (tx.from === COMMON_POOL_ADDRESS) {
    event.direction = 'outgoing'
    event.value = tx.contractCall.decimalValue
  } else if (tx.internalTransactions.to === ISSUER_ADDRESS) {
    event.direction = 'incoming'
    event.source = 'issuance'
    event.value = tx.internalTransactions.contractCall.decimalValue
  } else if (tx.to === COMMON_POOL_ADDRESS) {
    event.direction = 'incoming'
    event.source = 'donation'
    event.value = tx.contractCall.decimalValue
  }
  event.value = Number(event.value)

  return event
}

function formatPercentage (num, total) {
  return `${num / total * 100}%`
}

function sendSummary (events) {
  const incomingTotal = events.filter(
    (event) => event.direction === 'incoming'
  ).reduce(
    (sum, event) => sum + event.value,
    0
  )
  const outgoingTotal = events.filter(
    (event) => event.direction === 'outgoing'
  ).reduce(
    (sum, event) => sum + event.value,
    0
  )

  const incomingSources = {
    issuance: 0,
    honeymaker: 0,
    donation: 0
  }
  for (const event of events) {
    if (event.direction !== 'incoming') continue

    incomingSources[event.source] += event.value
  }

  const incomingEmbed = {
    title: ':honey_pot: Honey Flow (inbound, 24hrs)',
    color: 3320370,
    fields: [{
      name: 'Total Inflow',
      value: `${incomingTotal} HNY`
    }, {
      name: 'Honeymaker',
      value: `${incomingSources['honeymaker']} HNY (${formatPercentage(incomingSources['honeymaker'], incomingTotal)})`
    }, {
      name: 'Issuance',
      value: `${incomingSources['issuance']} HNY (${formatPercentage(incomingSources['issuance'], incomingTotal)})`
    }, {
      name: 'Donations',
      value: `${incomingSources['donation']} HNY (${formatPercentage(incomingSources['donation'], incomingTotal)})`
    }]
  }
  const outgoingEmbed = {
    title: ':honey_pot: Honey Flow (outbound, 24hrs)',
    color: 13571606,
    fields: [{
      name: 'Outflow',
      value: `${outgoingTotal} HNY`
    }]
  }
  const nothingEmbed = {
    title: 'No activity'
  }

  const embeds = []
  if (incomingTotal > 0) {
    embeds.push(incomingEmbed)
  }
  if (outgoingTotal > 0) {
    embeds.push(outgoingTotal)
  }
  if (embeds.length === 0) {
    embeds.push(nothingEmbed)
  }

  return fetch(DISCORD_WEBHOOK_URI, {
    method: 'post',
    body: JSON.stringify({
      embeds,
      username: 'Bee Bot',
      avatar_url: 'https://www.trafalgar.com/real-word/wp-content/uploads/sites/3/2020/01/Screenshot-2020-01-16-at-15.15.54-750x400.png'
    }),
    headers: { 'Content-Type': 'application/json' }
  })
}

let events = JSON.parse(fs.readFileSync('db.json'))
const app = express()
app.use(express.json())
  .post('/commonpool-webhook', (req, res) => {
    const event = parseEvent(req.body)

    // Persist event
    if (event !== null) {
      events.push(event)
      fs.writeFileSync('db.json', JSON.stringify(events))
    }
    res.sendStatus(200)
  })

// Send Discord message every 24hrs
const ONE_DAY = 24 * 60 * 60 * 1000
setInterval(() => {
  sendSummary(events).then(() => {
    events = []
    fs.writeFileSync('db.json', JSON.stringify([]))
  })
}, ONE_DAY)

// Start server
const PORT = process.env.PORT || 80
app.listen(PORT, () => console.log(`Listening on ${PORT}`))
