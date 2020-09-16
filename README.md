# oneM2M-IoT-Device-Simulator

=========================================================================================

1. Create simulated devices
Open a new command line interface and change directory to "onem2m-device-simulator".

1.1. Install required node modules
Install the required node modules using the following command:
```
> npm install
```
1.2. Configure the simulator (Optional)
You can keep the default configuration for a local demonstration.
If needed, you can change the configuration by editing the config file “default.json” file located in the "config" folder using a text editor.
Before starting the oneM2M simulator, if needed, you can update the target oneM2M platform by editing the "cse" section:
```
{
   "cse":{
        "ip":"127.0.0.1",
        "port": 8080,
        "id":"server",
        "name":"server"
    },
    ...
}
```
You can use the same template to add your own sensors and actuators in the "templates" section 
(Set the "stream" attribute to "up" for sensors and "down" for actuators). Any new template added to the list 
will be incorporated by the simulator.
```
"templates":[
    {
        "stream":"up",
        "type": "luminosity",
        "unit": "Lux",
        "min":200,
        "max":400,
        "freq":10,
        "icon": "https://link/to/luminosity/icon.png"
    },
    {
        "stream":"down",
        "type": "lamp",
        "unit": "",
        "min":0,
        "max":1,
        "icon": "https://link/to/lamp/icon.png"
    },
    ...
    ]
}
```
1.3. Start the simulator
Start the oneM2M device simulator using the following command:
```
> sudo node app.js
```
Open the simulator dashboard interface on your browser. By default the simulator is available on the following address: http://127.0.0.1:80
<h4>Known issue: The tool does not work with Firefox browser but is fine with Chrome or Edge.</h4>
  

1.4. Simulate virtual oneM2M devices
You can select a type and chose a name for your device then confirm to simulate a device.
![devices](https://hackster.imgix.net/uploads/attachments/1075568/image_nf44rXa9Kz.png?auto=compress%2Cformat&w=740&h=555&fit=max)

Every simulated sensor (e.g. Temperature, Luminosity, Humidity, Power, Presence, etc.) will push data periodically to the oneM2M platform following the configuration file.
It is possible to change the status of every simulated actuator (e.g. Lamp, Buzzer, etc.) using the "update" button. The new status will published immediately to the oneM2M platfom.
You can delete any simulated device by clicking on the "delete" button.

1.5. Simulate a luminosity sensor
for example, chose the type "Luminosity" and enter "luminosity_0" as name then confirm.
The luminosity sensor pushes data periodically (By default, a random luminosity value between 200 Lux and 400 Lux is published every 10 seconds)

