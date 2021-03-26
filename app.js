var express = require('express');
var request = require('request');
var hashmap = require('hashmap');
var config = require('config');
var path = require('path');
var bodyParser = require('body-parser');
const readline = require('readline');

var app = express();
var map = new hashmap();

app.use(bodyParser.json({type : ['application/*+json','application/json']}));

// Define the static file path
app.use(express.static(__dirname + '/public'));

var csePoA = "http://"+config.cse.ip+":"+config.cse.port;
var cseRelease = config.cse.release;
var deviceTypes = new hashmap();
var templates = config.templates;
var acpi = {};
var requestNr = 0;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});							

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname+'/index.html'));
})

app.get('/templates', function (req, res) {
	res.send(templates);
})

app.get('/devices', function (req, res) {
	var devices =[];
	map.forEach(function(value, key) {
	    devices.push({typeIndex:value.typeIndex,name: key, type: value.type, data: value.data, icon: value.icon,unit:value.unit,stream:value.stream});
  	});
	res.send(devices);
})

app.delete('/devices/:name', function (req, res) {
	map.remove(req.params.name);
	deleteAE(req.params.name);

	res.sendStatus(204);
})

app.post('/devices/:name', function (req, res) {
	let typeIndex = req.query.typeIndex;
	let name = req.params.name;
	let value = req.query.value;
	updateDevice(typeIndex,name,value);

	res.sendStatus(201);
})

app.post('/devices', function (req, res) {
	let typeIndex = req.query.type;
	let name = req.query.name;
	var object = {
		typeIndex: typeIndex,
		type: templates[typeIndex].type,
		data: random(templates[typeIndex].min, templates[typeIndex].max),
		icon: templates[typeIndex].icon,
		unit:templates[typeIndex].unit,
		stream:templates[typeIndex].stream
	}
	map.set(name,object);

	createAE(name,typeIndex);
	res.sendStatus(201);
})
  
app.listen(config.app.port, function () {
	console.log('Simulator API listening on port ' + config.app.port)
})

function listen(name,typeIndex){
	app.post('/'+name, function (req, res) {
		console.log("\n[NOTIFICATION]")
		console.log(req.body["m2m:sgn"].nev.rep["m2m:cin"]);
		var content;
		if(req.body["m2m:sgn"].nev.rep["m2m:cin"].con == "[switchOn]"){
			content = "1";
		} else {
			content = "0";
		}
		console.log(templates[typeIndex].type+" "+name+" is switched to "+content);
		
		updateDevice(typeIndex, name, content);
		res.set("X-M2M-RSC",2000);
		res.status(200);
		if(cseRelease != "1") {
			res.set("X-M2M-RVI",cseRelease);
		}
		res.send();
	});
}

function createAE(name,typeIndex){
	console.log("\n[REQUEST]");
	
		var options = {
		uri: csePoA + "/" + config.cse.name,
		method: "POST",
		headers: {
			"X-M2M-Origin": "Cae-"+name,
			"X-M2M-RI": "req"+requestNr,
			"Content-Type": "application/vnd.onem2m-res+json;ty=2"
		},
		json: { 
			"m2m:ae":{
				"rn":name,			
				"api":"Napp.company.com",
				"rr":false
			}
		}
	};

	var rr="false";
	var poa = "";
	if(templates[typeIndex].stream=="down"){
		options.json["m2m:ae"]["rr"] = true;
		options.json["m2m:ae"] = Object.assign(options.json["m2m:ae"], {"poa":["http://" + config.app.ip + ":" + config.app.port + "/" + name]});
		listen(name,typeIndex)
	}

	console.log("");
	console.log(options.method + " " + options.uri);
	console.log(options.json);

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
		options.json["m2m:ae"] = Object.assign(options.json["m2m:ae"], {"srv":["2a"]});
	}
	
	requestNr += 1;
	request(options, function (err, resp, body) {
		console.log("[RESPONSE]");
		if(err){
			console.log("AE Creation error : " + err);
		} else {
			console.log("AE Creation :" + resp.statusCode);
			if(resp.statusCode==409){
				resetAE(name,typeIndex);
			}else{
				if(config.cse.acp_required) {
					createAccessControlPolicy(name,typeIndex);
				} else {
					createDataContainer(name,typeIndex);
				}
			}
		}
	});
}



function deleteAE(name){
	console.log("\n[REQUEST]");

	var options = {
		uri: csePoA + "/" + config.cse.name + "/" + name,
		method: "DELETE",
		headers: {
			"X-M2M-Origin": "Cae-"+name,
			"X-M2M-RI": "req"+requestNr,
		}
	};

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
	}
	
	requestNr += 1;
	request(options, function (error, response, body) {
		console.log("[RESPONSE]");
		if(error){
			console.log(error);
		}else{			
			console.log(response.statusCode);
			console.log(body);

		}
	});
}

function resetAE(name,typeIndex){
	console.log("\n[REQUEST]");

	var options = {
		uri: csePoA + "/" + config.cse.name + "/" + name,
		method: "DELETE",
		headers: {
			"X-M2M-Origin": "Cae-"+name,
			"X-M2M-RI": "req"+requestNr,
		}
	};

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
	}
	
	requestNr += 1;
	request(options, function (error, response, body) {
		console.log("[RESPONSE]");
		if(error){
			console.log(error);
		}else{			
			console.log(response.statusCode);
			console.log(body);
			createAE(name,typeIndex);
		}
	});
}

function createAccessControlPolicy(name,typeIndex){
	console.log("\n[REQUEST]");
	
	var options = {
		uri: csePoA + "/" + config.cse.name + "/" + name,
		method: "POST",
		headers: {
			"X-M2M-Origin": "Cae-"+name,
			"X-M2M-RI": "req"+requestNr,
			"Content-Type": "application/json;ty=1"
		},
		json: {
			 "m2m:acp": {
				"rn":"MyACP",
				"pv":{
					"acr":[{
						"acor":["all"],
						"acop":63
						}]
					},
				"pvs":{
					"acr":[{
						"acor":["all"],
						"acop":63
						}]
					}
				}
			}
		};

	console.log("");
	console.log(options.method + " " + options.uri);
	console.log(options.json);

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
	}
	
	requestNr += 1;
	request(options, function (error, response, body) {
		console.log("[RESPONSE]");
		if(error){
			console.log(error);
		}else{
			console.log(response.statusCode);
			console.log(body);
		
			acpi = {
				"acpi":[config.cse.name + "/" + name + "/MyACP"]
			}
			createDataContainer(name, typeIndex);
		}
	});
}

function createDataContainer(name,typeIndex){
	console.log("\n[REQUEST]");
	
	var options = {
		uri: csePoA + "/" + config.cse.name + "/" + name,
		method: "POST",
		headers: {
			"X-M2M-Origin": "Cae-"+name,
			"X-M2M-RI": "req"+requestNr,
			"Content-Type": "application/json;ty=3"
		},
		json: {
			"m2m:cnt":{
				"rn":"DATA",
				"mni":10	
			}
		}
	};

	options.json["m2m:cnt"] = Object.assign(options.json["m2m:cnt"], acpi);
	
	console.log("");
	console.log(options.method + " " + options.uri);
	console.log(options.json);

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
	}
	
	requestNr += 1;
	request(options, function (error, response, body) {
		console.log("[RESPONSE]");
		if(error){
			console.log(error);
		}else{
			console.log(response.statusCode);
			console.log(body);
		
			createContentInstance(name,typeIndex,fire);

			if(templates[typeIndex].stream=="up"){
				var fire = setInterval(function() {
					createContentInstance(name,typeIndex,fire);
				}, templates[typeIndex].freq*1000);
			} else if(templates[typeIndex].stream=="down"){
				createCommandContainer(name,typeIndex);	
			}
		
		}
	});
}

function createCommandContainer(name,typeIndex){
	console.log("\n[REQUEST]");
	
	var options = {
		uri: csePoA + "/" + config.cse.name + "/" + name,
		method: "POST",
		headers: {
			"X-M2M-Origin": "Cae-"+name,
			"X-M2M-RI": "req"+requestNr,
			"Content-Type": "application/json;ty=3"
		},
		json: {
			"m2m:cnt":{
				"rn":"COMMAND",
				"mni":10	
			}
		}
	};

	options.json["m2m:cnt"] = Object.assign(options.json["m2m:cnt"], acpi);
	
	console.log("");
	console.log(options.method + " " + options.uri);
	console.log(options.json);

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
	}
	
	requestNr += 1;
	request(options, function (error, response, body) {
		console.log("[RESPONSE]");
		if(error){
			console.log(error);
		}else{
			console.log(response.statusCode);
			console.log(body);
		
			createSubscription(name,typeIndex)	
		
		}
	});
}


function updateDevice(typeIndex,name,data){
	var con = data;

	var object = {
		typeIndex: typeIndex,
		type: templates[typeIndex].type,
		data: con,
		icon: templates[typeIndex].icon,
		unit: templates[typeIndex].unit,
		stream:templates[typeIndex].stream
	}

		console.log("\n[REQUEST]");

		map.set(name,object);

		var options = {
			uri: csePoA + "/" + config.cse.name + "/" + name + "/DATA",
			method: "POST",
			headers: {
				"X-M2M-Origin": "Cae-"+name,
				"X-M2M-RI": "req"+requestNr,
				"Content-Type": "application/json;ty=4"
			},
			json: {
				"m2m:cin":{
					"con": con
				}
			}
		};
	
		console.log("");
		console.log(options.method + " " + options.uri);
		console.log(options.json);

		if(cseRelease != "1") {
			options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
		}
		
		requestNr += 1;
		request(options, function (error, response, body) {
			console.log("[RESPONSE]");
			if(error){
				console.log(error);
			}else{
				console.log(response.statusCode);
				console.log(body);
			}
		});

}

function createContentInstance(name,typeIndex,fire){
	var con = random(templates[typeIndex].min, templates[typeIndex].max).toString();
	var object = {
		typeIndex: typeIndex,
		type: templates[typeIndex].type,
		data: con,
		icon: templates[typeIndex].icon,
		unit: templates[typeIndex].unit,
		stream:templates[typeIndex].stream
	}
	if(map.has(name)){
		console.log("\n[REQUEST]");

		map.set(name,object);
		
		var options = {
			uri: csePoA + "/" + config.cse.name + "/" + name + "/DATA",
			method: "POST",
			headers: {
				"X-M2M-Origin": "Cae-"+name,
				"X-M2M-RI": "req"+requestNr,
				"Content-Type": "application/json;ty=4"
			},
			json: {
				"m2m:cin":{
					"con": con
				}
			}
		};
	
		console.log("");
		console.log(options.method + " " + options.uri);
		console.log(options.json);

		if(cseRelease != "1") {
			options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
		}
	
		requestNr += 1;
		request(options, function (error, response, body) {
			console.log("[RESPONSE]");
			if(error){
				console.log(error);
			}else{
				console.log(response.statusCode);
				console.log(body);
			}
		});

	}else{
		clearInterval(fire);
	}


}

function createSubscription(name,typeIndex){
	console.log("\n[REQUEST]");

	var options = {
		uri: csePoA + "/" + config.cse.name + "/" + name + "/COMMAND",
		method: "POST",
		headers: {
			"X-M2M-Origin": "Cae-"+name,
			"X-M2M-RI": "req"+requestNr,
			"Content-Type": "application/json;ty=23"
		},
		json: {
			"m2m:sub": {
				"rn": "sub",
				"nu": [config.cse.name + "/" +  name],
				"nct": 1,
				"enc": {
					"net": [3]
				}
			}
		}
	};
	
	if(config.cse.poa_in_nu) {
		options.json["m2m:sub"].nu = ["http://" + config.app.ip + ":" + config.app.port + "/" + name]; 
	}

	console.log("");
	console.log(options.method + " " + options.uri);
	console.log(options.json);

	if(cseRelease != "1") {
		options.headers = Object.assign(options.headers, {"X-M2M-RVI":cseRelease});
	}
	
	requestNr += 1;
	request(options, function (error, response, body) {
		console.log("[RESPONSE]");
		if(error){
			console.log(error);
		}else{
			console.log(response.statusCode);
			console.log(body);
		}
	});
}

function random(min, max) { 
	return Math.floor(Math.random() * (max - min + 1) + min);
}