'use strict';
const mqtt = require('mqtt');


const net = require('net');
let client = new net.Socket();

/*
   TCP / IP settings
 */
const port = process.env.PORT || 2111;
const ip = process.env.BAR_CODE_READER_IP || '192.168.1.4';

/*
    MQTT settings
 */
const mqtt_broker = process.env.MQTT_BROKER || 'mqtt://192.168.1.5';
const mqtt_port = process.env.MQTT_PORT || 1883;

const mqtt_client = mqtt.connect(`${mqtt_broker}$:${mqtt_port}`);


/*
    HAC settings
 */
const hac_id = process.env.HAC_ID || "hostname";

/*
    CHANNEL settings (device name - hardcoded)
 */

const channel = "CLV620";


/**
 * MQTT TOPIC
 * @type {*|string}
 * E.g call API (sub mqtt) = /hac_1/CLV620/ttl
 */
const topic = `${hac_id}/${channel}`;




client.connect(port, ip, function () {
    console.log('Connected - Bar code reader');
});


client.on('data', function (data) {
    let buffLength = data.length;

    // Rules for no read case
    let nothingMsgChar = "*"; // from nothing message default : *NoRead*
    const subtractValueToFindChar = 4;
    const errorMsg = "*NoRead*";

    // Rules for read case
    const intervalIndexes = [1, 2]; // (constant) 2 indexes in delimiter array where the code from bar code is in the string received
    const delimiter = []; // list of index where we replaced space character by ,
    const codeFromReader = []; // contains every character read between the delimiter index 1 and index 2 in the data string

    // e.g
    // received string with 5 spaces :
    // FORMAT empty :
    // TT=157ms OTL=0mm CC=0 OI=27818
    // *NoRead*
    // 

    // FORMAT read data
    //TT=157ms OTL=0mm CC=1 OI=27905
    // 09593 /*the code from bar code here (the size is related to the bar code scanned size)*/
    //   C128 67% ST=0 RA=48 CL=_5 CS=_67 DIR=1 OD=175 FC=0
    //
    // 

    // replace spaces with , character
    // constant indexes 1 and 2 (data ways send with the same format)
    // based on both indexes, get every chars between them to get the code from bar code


    // common response
    let response = {
        status: "",
        body: ""
    };


    if (new Buffer.from([parseInt(data[buffLength - subtractValueToFindChar])]).toString() === nothingMsgChar) {
        response.status = 204; // means no data read on the moment, but the reader is ready
        response.body = errorMsg;
    } else {
        let strData = data.toString().replace(/(\r\n|\n|\r)/gm, ",");

        for (let i in strData) {
            if (strData[i] === ',') {
                delimiter.push(i);
            }
        }

        for (let l = parseInt(delimiter[intervalIndexes[0]]) + 1; l < parseInt(delimiter[intervalIndexes[1]]); l++) {
            codeFromReader.push(strData[l])
        }

        response.status = 200;
        response.body = codeFromReader.join('');
    }


    if (response.status !== 204) {
        console.log(`Reader Bar Code => status : ${response.status} / code : ${response.body}`);
        mqtt_client.publish(topic, response.body);
    }

    //client.destroy(); // kill client after server's response
});


mqtt_client.on('connect', function () {
    mqtt_client.subscribe(topic, function (err) {
            if (err) {
                console.log(err);
            }
        }
    )
});


// E.g when message has been published with success, this event is triggered
/*
mqtt_client.on('message', function (topic, message) {
    // message is Buffer
    console.log("MQTT NEW MESSAGE PUBLISHED : " , message.toString())
});
 */

/* E.g stop TCP / IP event
client.on('close', () => {
    console.log("Close connection - Bar code reader");
});
 */
