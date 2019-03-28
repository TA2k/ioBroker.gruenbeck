"use strict";

/*
 * Created with @iobroker/create-adapter v1.11.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
 
// Load your modules here, e.g.:
// const fs = require("fs");
const { XMLHttpRequest } = require("xmlhttprequest-ts");
var DOMParser = require('xmldom').DOMParser;
var domParser = new DOMParser()
var requestAllCommand = "id=0000&code=245&show=D_D_1|D_A_4_1|D_A_4_2|D_A_4_3|D_C_1_1|D_C_2_1|D_C_5_1|D_C_4_1|D_C_4_2|D_C_4_3|D_C_6_1|D_C_7_1|D_A_2_2|D_A_2_3|D_C_3_6_1|D_C_8_1|D_C_8_2|D_C_3_6_2|D_C_3_6_3|D_C_3_6_4|D_C_3_6_5|D_C_3_7_1|D_C_3_7_2|D_C_3_7_3|D_Y_5|D_Y_7|D_Y_6|D_Y_8_11|D_Y_10_1|D_B_1|D_A_1_1|D_A_1_2|D_A_1_3|D_A_2_1|D_A_3_1|D_A_3_2|D_K_1|D_K_2|D_K_3|D_K_4|D_K_7|D_K_8|D_K_9|D_Y_2_1|D_Y_4_1|D_Y_2_2|D_Y_4_2|D_Y_2_3|D_Y_4_3|D_Y_2_4|D_Y_4_4|D_Y_2_5|D_Y_4_5|D_Y_2_6|D_Y_4_6|D_Y_2_7|D_Y_4_7|D_Y_2_8|D_Y_4_8|D_Y_2_9|D_Y_4_9|D_Y_2_10|D_Y_4_10|D_Y_2_11|D_Y_4_11|D_Y_2_12|D_Y_4_12|D_Y_2_13|D_Y_4_13|D_Y_2_14|D_Y_4_14~"
var requestActualsCommand = "id=0000&show=D_A_1_1|D_A_1_2|D_A_2_2|D_A_3_1|D_A_3_2|D_Y_1|D_A_1_3|D_A_2_3|D_Y_5|D_A_2_1|D_C_4_1|D_C_4_3|D_C_1_1|D_C_4_2|D_C_5_1|D_C_6_1|D_C_8_1|D_C_8_2|D_D_1|D_E_1|D_Y_9|D_Y_9_8|D_Y_9_24|D_C_7_1~"
let requestErrorsCommand =  "id=0000&code=245&show=D_K_10_1|D_K_10_2|D_K_10_3|D_K_10_4|D_K_10_5|D_K_10_6|D_K_10_7|D_K_10_8|D_K_10_9|D_K_10_10|D_K_10_11|D_K_10_12|D_K_10_13|D_K_10_14|D_K_10_15|D_K_10_16~"
let requestImpulsCommand =  "id=0000&code=290&show=D_F_5|D_F_6~"
let pollingInterval
var currentCommand = "";
var blockTimeout;
var queueArray = []
let blockConnection = false;

class Gruenbeck extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "gruenbeck",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		if (this.config.host) {
			this.log.debug('Starting gruenbeck adapter with:' + this.config.host);
			const pollingTime = this.config.pollInterval * 1000 || 300000;
			this.log.debug('[INFO] Configured polling interval: ' + pollingTime);
			this.requestData(requestAllCommand)
			
			if (!pollingInterval) {
				pollingInterval = setInterval(() => {this.requestData(requestActualsCommand)}, pollingTime); ;
				setInterval(() => {queueArray.push(requestAllCommand)}, 1*60*60*1000); // 1hour
				setInterval(() => {queueArray.push(requestErrorsCommand)}, 10*60*1000); // 10min
				setInterval(() => {queueArray.push(requestImpulsCommand)}, 4*60*60*1000); // 4hour
			}
			
			this.subscribeStates("*");

		  } else this.log.warn('[START] No IP-address set');
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			clearInterval(pollingInterval);
			//xhr.abort()
			this.log.debug('Stopping gruenbeck');
			this.setState('info.connection', false, true);
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 * @param {string} id
	 * @param {ioBroker.Object | null | undefined} obj
	 */
	onObjectChange(id, obj) {
		if (obj) {
			// The object was changed
			this.log.debug(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.debug(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			var adapterPrefix = this.name+"."+this.instance;
			
			// The state was changed
			if (id === (adapterPrefix + ".info.D_Y_2_1") ) {
				/*Formel Grünbeck bei Kapazitätszahl 8 m³x°dH und einem Härteunterschied von Rohwasser zu Brauchwasser 
				von 12 °dH  : 0,0285 kg x 12 °dH x 100 m³ = 34,2 kg Regeneriersalz
				Bei der min. Kapazitätszahl 6 m³x°dH entspricht der Salzverbrauch 0.025 kg
				Bei der max. Kapazitätszahl 14 m³x°dH entspricht der Salzverbrauch 0.039 kg
				Es wird von einem liniaren Salzverbrauch von 0.00175 kg pro m³x°dH ausgegangen.
				(((Kapazitätszahl-6)*0.00175)+0.025)x Rohwasserhärte x (Wasserverbrauch/1000)
				*/
				this.getStates("*",(err, states) => {
					if (err) {
					this.log.error(err);
					} else {
						if (states[adapterPrefix+".calculated.WVLC"]) {
							
							if (states[adapterPrefix + ".calculated.WVLC"].val === state.lc) {
								
								return
							}
						} 
						var Rohwasserhaerte = states[adapterPrefix+".parameter.D_D_1"].val;
						var KapZahl = states[adapterPrefix+".info.D_A_1_3"].val;
						var Wasserverbrauch = states[adapterPrefix+".info.D_Y_2_1"].val;
					
						var SalzverbrauchAlt = states[adapterPrefix+".calculated.Salzverbrauch"]? states[adapterPrefix+".calculated.Salzverbrauch"].val : 0;
						var SalzverbrauchNeu = ((((KapZahl-6)*0.00175)+ 0.025)*Rohwasserhaerte*(Wasserverbrauch/1000)).toFixed(3)
						var Salzverbrauch = parseFloat(SalzverbrauchNeu)+parseFloat(SalzverbrauchAlt);

						var SalzverbrauchGesamt
						if (states[adapterPrefix+".calculated.SalzverbrauchGesamt"]){
							SalzverbrauchGesamt = parseFloat(states[adapterPrefix+".calculated.SalzverbrauchGesamt"].val) + parseFloat(SalzverbrauchNeu)
						} else {
							SalzverbrauchGesamt = SalzverbrauchNeu
							var date = new Date();
							this.setState('calculated.DatumSalzverbrauch', this.getCurrentDate());
						}

						this.setState('calculated.Salzverbrauch', Salzverbrauch);
						this.setState('calculated.SalzverbrauchGesamt', SalzverbrauchGesamt);
						this.setState('calculated.WVLC', state.lc)

						/* Formel: Verschnitthärte / (Rohwasserhärte-Verschnitthärte)= ErhÃ¶hungswert
					 Beispiel: 5 °dH Verschnitthärte / ( 21° dH Rohwasserhärte- 5° dH Verschnitthärte)= 0.3125 ErhÃ¶hungswert
						0°dH Wasserverbrauch 400l x 1.3125 ErhÃ¶ungswert = 525l Wasser 5°dH */
						var Verschnitthaerte = this.config.verschnitthaerte
						var GesamtverbrauchAlt
						if (states[adapterPrefix + '.calculated.Wasserzaehler']) {
							GesamtverbrauchAlt = states[adapterPrefix + '.calculated.Wasserzaehler'].val 
						} else {
							GesamtverbrauchAlt = 0;
							var date = new Date();
							this.setState('calculated.DatumWasserzaehler', this.getCurrentDate());
						}
						var Wasserverbrauch = states[adapterPrefix + '.info.D_Y_2_1'].val;
						var Rohwasserhaerte =  states[adapterPrefix + '.parameter.D_D_1'].val;
						var Erhoehungswert = (Verschnitthaerte / (Rohwasserhaerte-Verschnitthaerte))+1;
						var GesamtverbrauchNeu = Wasserverbrauch*Erhoehungswert;
						var Gesamtverbrauch = (((GesamtverbrauchAlt*1000) + GesamtverbrauchNeu)/1000).toFixed(3);
						this.setState('calculated.Wasserzaehler',parseFloat(Gesamtverbrauch));
						this.log.debug("neuer Zählerstand Wasser= "+ Gesamtverbrauch)
						var akkWasser=0;
						var VerWasser=0;
						for(var i = 1; i<= 14; i++) {
			
							akkWasser = states[adapterPrefix + '.info.D_Y_2_' + i].val
							VerWasser = akkWasser*Erhoehungswert
							this.setState('calculated.Verschnittwasser_' + i,VerWasser.toFixed(0))
						
						}


					}
				})					

			} else if (id.indexOf("parameter") != -1 && state.ack === false) {
				this.setParameter(id, state.val)
			}


		} else {
			// The state was deleted
			this.log.debug(`state ${id} deleted`);
		}
	}

	getCurrentDate() {
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth() + 1; //January is 0!

		var yyyy = today.getFullYear();
		if (dd < 10) {
		dd = '0' + dd;
		} 
		if (mm < 10) {
		mm = '0' + mm;
		} 
	 	return dd + '.' + mm + '.' + yyyy;
	}
	setParameter(id, val) {
		
		let idArray = id.split(".")
		let code = idArray[idArray.length -1]
		this.log.debug("edit="+code+">"+ val +"&id=0000&show=" + code + "~");
		if (val === true) {
			val = 1
		}
		queueArray.push("edit="+code+">"+ val +"&id=0000&show=" + code + "~")
	}
	requestData(sParSend) {
		if (blockConnection) {
			return
		}
		var xhr = new XMLHttpRequest()
		currentCommand = sParSend;
		if (queueArray.length != 0) {
			currentCommand = queueArray.pop()
		}
		this.log.debug(currentCommand)
		try {
			this.log.debug("sendRequest ")
            xhr.open("POST","http://" + this.config.host + "/mux_http", true);
	        xhr.setRequestHeader("Content-type", "application/json");
			xhr.timeout = (this.config.pollInterval - 2 > 7? this.config.pollInterval - 2 : 7) * 1000;
			xhr.send(currentCommand);
			xhr.ontimeout = (error)=>
            {	
				//xhr.abort();
				this.log.error(error.message);
				this.setState('info.connection', false, true);
            }
            xhr.onload = ()=>{
				this.log.debug("onload")
				this.log.debug(xhr.responseText)
				blockConnection = false;
				if (xhr.responseText) {
					this.parseData(domParser.parseFromString(xhr.responseText,'text/xml'))
				}
				
			}
			xhr.onreadystatechange = () => {
				this.log.debug("statechange: " +xhr.readyState+ " " + xhr.responseText.length)
				if (xhr.readyState === 4) {
					if (xhr.responseText.length === 0 || xhr.responseText.indexOf("Error: ") != -1) {
						

						if (xhr.responseText.length === 0) {
							this.log.debug("Device returns empty repsonse. Resend request.")
							queueArray.push(currentCommand)
							return
						
						} else {
							this.log.warn("Device cannot handle new connections. Pause for 1min")
							
						}

						blockConnection = true
						this.log.error(xhr.responseText);
						clearTimeout(blockTimeout)
						blockTimeout = setTimeout(()=>{
							blockConnection = false
							this.log.debug("Resume connections.")
							queueArray.push(currentCommand)
						},60 * 1000)
						this.setState('info.connection', false, true);
						//xhr.abort();
					}
				}
				
			}
        }
        catch(error){
            xhr.abort();
			this.log.error(error)
            this.setState('info.connection', false, true);
        }
	}

	parseData(response) {
		this.setState('info.connection', true, true);
		if (!response ) {
			return;
		}
		let children = response.childNodes[0].childNodes;
		for (var i = 0; i < children.length; i++) {   
			let nodeName = children[i].nodeName
			if (nodeName === "code") {
				if (children[i].childNodes[0].nodeValue != "ok") {
					this.log.error("wrong code")
				}
			}
			var prefix = "info."
			if (nodeName.indexOf("D_C_3_") != -1) {
				prefix = "network."
			} else if (nodeName.indexOf("D_D_1") != -1 || nodeName.indexOf("D_A_4") != -1 || nodeName.indexOf("D_C_") != -1 || nodeName.indexOf("D_C_8_") != -1){
				prefix = "parameter."
			} else if (nodeName.indexOf("D_K_10_") != -1) {
				prefix = "error."
			}
			
			this.setState(prefix+nodeName , children[i].childNodes[0].nodeValue  , true);
		}
	}


}

if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Gruenbeck(options);
} else {
	// otherwise start the instance directly
	new Gruenbeck();
}