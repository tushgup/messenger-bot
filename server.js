var request = require('request');
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var compression = require('compression');

var conf = require('./conf');

var app = express();
app.use(compression());
app.set('case sensitive routing', true);
app.use(bodyParser.json());

var httpServer = http.createServer(app);

app.get('/', function (req, res, next) {
  res.send('Welcome to the Shoppingo Facebook Messenger Bot. This is root endpoint');
});
/*
app.get('/webhook/', handleVerify);
app.post('/webhook/', receiveMessage);

function handleVerify(req, res, next) {
    var token = process.env.VERIFY_TOKEN || conf.VERIFY_TOKEN;
    if (req.query['hub.verify_token'] === token) {
        return res.send(req.query['hub.challenge']);
    }
    res.send('Validation failed, Verify token mismatch');
}

function receiveMessage(req, res, next) {
    var message_instances = req.body.entry[0].messaging;
    message_instances.forEach(function(instance){
        var sender = instance.sender.id;
        if(instance.message && instance.message.text) {
            var msg_text = instance.message.text;
            sendMessage(sender, msg_text, true);
        }
    });
    res.sendStatus(200);
}
*/

app.get('/webhook', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === conf.VERIFY_TOKEN) {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});

app.post('/webhook', function (req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
                if (event.message) {
                    receivedMessage(event);
                }

                else if (event.postback) {
                    receivedPostback(event);
                }



                else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.
        res.sendStatus(200);
    }
});

function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageId = message.mid;

    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {

        // If we receive a text message, check to see if it matches a keyword
        // and send back the example. Otherwise, just echo the text we received.
        switch (messageText) {
            case 'generic':
                sendGenericMessage(senderID);
                break;

            default:
                sendTextMessage(senderID, messageText);
        }
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}

function sendGenericMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "rift",
                        subtitle: "Next-generation virtual reality",
                        item_url: "https://www.oculus.com/en-us/rift/",
                        image_url: "http://messengerdemo.parseapp.com/img/rift.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/rift/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for first bubble",
                        }],
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://messengerdemo.parseapp.com/img/touch.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/touch/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for second bubble",
                        }]
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: conf.PROFILE_TOKEN },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            console.log("Successfully sent generic message with id %s to recipient %s",
                messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }
    });
}

function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    sendTextMessage(senderID, "Postback called");
}

var port = process.env.PORT || 8000;
httpServer.listen(port, function () {
    console.log("Express http server listening on port " + port);
});