'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const SmartApp = require('@smartthings/smartapp');
const axios = require('axios');

const server = module.exports = express();
server.use(bodyParser.json());

const app = new SmartApp()

/* Only here for Glitch, so that GET doesn't return an error */
server.get('/', (req, res) => {
  res.send('Simple SmartApp Example URL: https://'+ req.hostname);
});

/* Handles lifecycle events from SmartThings */
server.post('/', async (req, res) => {
    app.handleHttpCallback(req, res);
});

/* Defines the SmartApp */
app.enableEventLogging()  // Log and pretty-print all lifecycle events and responses
    .configureI18n()      // Use files from locales directory for configuration page localization
    .page('mainPage', (context, page, configData) => {
        page.section('sensors', section => {
           section.deviceSetting('sensor').capabilities(['contactSensor']).required(true);
        });
        page.section('lights', section => {
            section.deviceSetting('lights').capabilities(['switch']).multiple(true).permissions('rx');
        });
    })
    .updated(async (context, updateData) => {
        await context.api.subscriptions.unsubscribeAll();
        return Promise.all([
            context.api.subscriptions.subscribeToDevices(context.config.sensor, 'contactSensor', 'contact.open', 'openDeviceEventHandler'),
            context.api.subscriptions.subscribeToDevices(context.config.sensor, 'contactSensor', 'contact.closed', 'closedDeviceEventHandler')
        ])
    })
    .subscribedEventHandler('openDeviceEventHandler', (context, deviceEvent) => {
        return context.api.devices.sendCommands(context.config.lights, 'switch', 'on');
    })
    .subscribedEventHandler('closedDeviceEventHandler', (context, deviceEvent) => {
        return context.api.devices.sendCommands(context.config.lights, 'switch', 'off');
    });    

// Handle CONFIRMATION request
server.get('/confirm', async (req, res) => {
  const { token } = req.query;
  console.log('Received CONFIRMATION request with token:', token);

  try {
    // Make the HTTP GET request to the confirmationUrl with the provided token
    const confirmationUrl = `https://my-first-smartapp-marco.glitch.me/confirm?token=${token}`;
    const response = await axios.get(confirmationUrl);

    // If the request is successful, respond with a success message
    res.send('Confirmation received successfully');
  } catch (error) {
    // If there's an error, handle it accordingly (e.g., log the error or respond with an error message)
    console.error('Error confirming the webhook:', error);
    res.status(500).send('Error confirming the webhook');
  }
});

/* Starts the server */
let port = process.env.PORT;
server.listen(port);
console.log(`Open: http://127.0.0.1:${port}`);
