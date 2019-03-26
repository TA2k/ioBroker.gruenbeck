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
var xhr = new XMLHttpRequest();
var requestAllCommand = "id=3369&code=245&show=D_D_1|D_A_4_1|D_A_4_2|D_A_4_3|D_C_1_1|D_C_2_1|D_C_5_1|D_C_4_1|D_C_4_2|D_C_4_3|D_C_6_1|D_C_7_1|D_A_2_2|D_C_3_6_1|D_C_3_6_2|D_C_3_6_3|D_C_3_6_4|D_C_3_6_5|D_C_3_7_1|D_C_3_7_2|D_C_3_7_3|D_Y_5|D_Y_7|D_Y_6|D_Y_8_11|D_Y_10_1|D_B_1|D_A_1_1|D_A_1_2|D_A_1_3|D_A_2_1|D_A_3_1|D_A_3_2|D_K_1|D_K_2|D_K_3|D_K_4|D_K_7|D_K_8|D_K_9|D_Y_2_1|D_Y_4_1|D_Y_2_2|D_Y_4_2|D_Y_2_3|D_Y_4_3|D_Y_2_4|D_Y_4_4|D_Y_2_5|D_Y_4_5|D_Y_2_6|D_Y_4_6|D_Y_2_7|D_Y_4_7|D_Y_2_8|D_Y_4_8|D_Y_2_9|D_Y_4_9|D_Y_2_10|D_Y_4_10|D_Y_2_11|D_Y_4_11|D_Y_2_12|D_Y_4_12|D_Y_2_13|D_Y_4_13|D_Y_2_14|D_Y_4_14~"
let pollingInterval
let parseLevels = {"noParsing":0, "regenerationTime":1, "serviceIntervall":2, "errors":3, "displayStandby":4, "language":5, "intervalData":6, "rohwasserHaerte":7, "startZeitRegeneration":8, "powerMode":9}

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
			this.log.info('Starting gruenbeck adapter with:' + this.config.host);
			
			const pollingTime = this.config.pollInterval * 1000 || 300000;
			this.log.debug('[INFO] Configured polling interval: ' + pollingTime);
			this.requestData(requestAllCommand, parseLevels.intervalData)
			
			if (!pollingInterval) {
				pollingInterval = setInterval(() => {this.requestData(requestAllCommand, parseLevels.intervalData)}, pollingTime); //DATAREQUEST;
			} // endIf
			
			this.subscribeStates("*");

		  } else this.log.warn('[START] No IP-address set');


		// Initialize your adapter here

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		// this.log.info("config option1: " + this.config.option1);
		// this.log.info("config option2: " + this.config.option2);

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/

		// await this.setObjectAsync("testVariable", {
		// 	type: "state",
		// 	common: {
		// 		name: "testVariable",
		// 		type: "boolean",
		// 		role: "indicator",
		// 		read: true,
		// 		write: true,
		// 	},
		// 	native: {},
		// });

		// /*
		// setState examples
		// you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		// */
		// // the variable testVariable is set to true as command (ack=false)
		// await this.setStateAsync("testVariable", true);

		// // same thing, but the value is flagged "ack"
		// // ack should be always set to true if the value is received from or acknowledged from the target system
		// await this.setStateAsync("testVariable", { val: true, ack: true });

		// // same thing, but the state is deleted after 30s (this.getState will return null afterwards)
		// await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// // examples for the checkPassword/checkGroup functions
		// let result = await this.checkPasswordAsync("admin", "iobroker");
		// this.log.info("check user admin pw ioboker: " + result);

		// result = await this.checkGroupAsync("admin", "admin");
		// this.log.info("check group user admin group admin: " + result);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			clearInterval(pollingInterval);
			xhr.abort()
			this.log.info('Stopping gruenbeck');
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
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
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
			//	this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			if (id.indexOf("D_Y_2_01") != -1) {
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
						if (states[adapterPrefix+".calculated.WasserverbrauchLC"]) {
							if (states[adapterPrefix + ".calculated.WasserverbrauchLC"].val === state.lc) {
								return
							}
						}
						var Rohwasserhaerte = states[adapterPrefix+".parameter.D_D_1"].val;
						var KapZahl = states[adapterPrefix+".info.D_A_1_3"].val;
						var Wasserverbrauch = states[adapterPrefix+".info.D_Y_2_01"].val;
					
						var SalzverbrauchAlt = states[adapterPrefix+".calculated.Salzverbrauch"]? states[adapterPrefix+".calculated.Salzverbrauch"].val : 0;
						var SalzverbrauchNeu = ((((KapZahl-6)*0.00175)+ 0.025)*Rohwasserhaerte*(Wasserverbrauch/1000)).toFixed(3)
						var Salzverbrauch = SalzverbrauchNeu+SalzverbrauchAlt;

						var SalzverbrauchGesamt
						if (states[adapterPrefix+".calculated.SalzverbrauchGesamt"]){
							SalzverbrauchGesamt = states[adapterPrefix+".calculated.SalzverbrauchGesamt"].val + SalzverbrauchNeu
						} else {
							SalzverbrauchGesamt = SalzverbrauchNeu
							var date = new Date();
							this.setState('calculated.DatumSalzverbrauch', this.getCurrentDate());
						}

						this.setState('calculated.Salzverbrauch', Salzverbrauch);
						this.setState('calculated.SalzverbrauchGesamt', SalzverbrauchGesamt);
						this.setState('calculated.WasserverbrauchLC', state.lc)

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
						var Wasserverbrauch = states[adapterPrefix + '.info.D_Y_2_01'].val;
						var Rohwasserhaerte =  states[adapterPrefix + '.parameter.D_D_1'].val;
						var Erhoehungswert = (Verschnitthaerte / (Rohwasserhaerte-Verschnitthaerte))+1;
						var GesamtverbrauchNeu = Wasserverbrauch*Erhoehungswert;
						var Gesamtverbrauch = (((GesamtverbrauchAlt*1000) + GesamtverbrauchNeu)/1000).toFixed(3);
						this.setState('calculated.Wasserzaehler',parseFloat(Gesamtverbrauch));
						this.log.info("neuer Zählerstand Wasser= "+ Gesamtverbrauch)
						var akkWasser=0;
						var VerWasser=0;
						for(var i = 1; i<= 14; i++) {
							if(i<10){
								akkWasser = states[adapterPrefix + '.info.D_Y_2_0' + i].val
								VerWasser = akkWasser*Erhoehungswert
								this.setState('calculated.Verschnittwasser_0' + i,VerWasser.toFixed(0))
							}
							else {
								akkWasser = states[adapterPrefix + '.info.D_Y_2_' + i].val
								VerWasser = akkWasser*Erhoehungswert
								this.setState('calculated.Verschnittwasser_' + i,VerWasser.toFixed(0))
							}
						}


					}
				})					

			}


		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
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
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }
	requestData(sParSend, parseLevel) {

		try {
            xhr.open("POST","http://" + this.config.host + "/mux_http", true);
	        xhr.setRequestHeader("Content-type", "application/json");
			xhr.timeout = 30000;
			xhr.send(sParSend);
			xhr.ontimeout = (error)=>
            {	
				xhr.abort();
				this.log.error(error.message);
				this.setState('info.connection', false, true);
            }
            xhr.onload = ()=>{this.parseData(xhr.responseText, parseLevel)}
        }
        catch(error){
            xhr.abort();
			this.log.error(error)
            this.setState('info.connection', false, true);
        }
	}

	parseData(response, parseLevel) {
		this.setState('info.connection', true, true);
		var str = response;
		var regex;
		var subst;
		switch (parseLevel)
		{
			case 0:
				// keine Auswertung der RÃ¼ckmeldung erforderlich
				break;
			case 1:
				// Regenerationszeitpunkt
				regex = /<data><code>([^\<]+)<\/code><D_C_4_1>([^\<]+)<\/D_C_4_1><\/data>/;
				subst = regex.exec(str);
				if (subst){
					this.setState('parameter.D_C_4_1' , parseInt(subst[2]) );
					this.setState('info.Regenerationszeitpunkt', parseInt(subst[2]) );
				}
				break;
			case 2:
				// ServiceIntervalldauer
				regex = /<data><code>([^\<]+)<\/code><D_C_7_1>([^\<]+)<\/D_C_7_1><\/data>/;
				subst = regex.exec(str);
				if (subst){
					this.setState('parameter.D_C_7_1' , parseInt(subst[2]) );
					this.setState('info.ServiceIntervalldauer', parseInt(subst[2]) );
				}
				break;
			case 3:
				// Auswertung Fehlerspeicher
				regex = /<data><code>([^\<]+)<\/code><D_K_10_1>([^\<]+)<\/D_K_10_1><D_K_10_2>([^\<]+)<\/D_K_10_2><D_K_10_3>([^\<]+)<\/D_K_10_3><D_K_10_4>([^\<]+)<\/D_K_10_4><D_K_10_5>([^\<]+)<\/D_K_10_5><D_K_10_6>([^\<]+)<\/D_K_10_6><D_K_10_7>([^\<]+)<\/D_K_10_7><D_K_10_8>([^\<]+)<\/D_K_10_8><D_K_10_9>([^\<]+)<\/D_K_10_9><D_K_10_10>([^\<]+)<\/D_K_10_10><D_K_10_11>([^\<]+)<\/D_K_10_11><D_K_10_12>([^\<]+)<\/D_K_10_12><D_K_10_13>([^\<]+)<\/D_K_10_13><D_K_10_14>([^\<]+)<\/D_K_10_14><D_K_10_15>([^\<]+)<\/D_K_10_15><D_K_10_16>([^\<]+)<\/D_K_10_16><\/data>/;
				subst = regex.exec(str);
				if (subst)
				{
					var iz = 2
					for(var iw = 1; iw<= 16; iw++)
					{
						if(iw<10)
						{
							this.setState('error.D_K_10_0'+ iw , subst[iz] );
						}else{
							this.setState('error.D_K_10_'+ iw , subst[iz] );
						}
						iz++;
					}
				}
				break;
			case 4:
				// DisplayStandby
				regex = /<data><code>([^\<]+)<\/code><D_C_6_1>([^\<]+)<\/D_C_6_1><\/data>/;
				subst = regex.exec(str);
				if (subst){
					this.setState('parameter.D_C_6_1' , parseInt(subst[2]) );
					this.setState('info.DisplayStandby', parseInt(subst[2]) );
				}
				break;
			case 5: 
				// Sprache
				regex = /<data><code>([^\<]+)<\/code><D_C_1_1>([^\<]+)<\/D_C_1_1><\/data>/;
				subst = regex.exec(str);
				if (subst){
					this.setState('parameter.D_C_1_1' , parseInt(subst[2]) );
					this.setState('info.Sprache', parseInt(subst[2]) );
				}
				break;
			case 6:    
				// Auswertung für Zyklisch abfragen
				regex = /<data><code>([^\<]+)<\/code><D_D_1>([^\<]+)<\/D_D_1><D_A_4_1>([^\<]+)<\/D_A_4_1><D_A_4_2>([^\<]+)<\/D_A_4_2><D_A_4_3>([^\<]+)<\/D_A_4_3><D_C_1_1>([^\<]+)<\/D_C_1_1><D_C_2_1>([^\<]+)<\/D_C_2_1><D_C_5_1>([^\<]+)<\/D_C_5_1><D_C_4_1>([^\<]+)<\/D_C_4_1><D_C_4_2>([^\<]+)<\/D_C_4_2><D_C_4_3>([^\<]+)<\/D_C_4_3><D_C_6_1>([^\<]+)<\/D_C_6_1><D_C_7_1>([^\<]+)<\/D_C_7_1><D_A_2_2>([^\<]+)<\/D_A_2_2><D_C_3_6_1>([^\<]+)<\/D_C_3_6_1><D_C_3_6_2>([^\<]+)<\/D_C_3_6_2><D_C_3_6_3>([^\<]+)<\/D_C_3_6_3><D_C_3_6_4>([^\<]+)<\/D_C_3_6_4><D_C_3_6_5>([^\<]+)<\/D_C_3_6_5><D_C_3_7_1>([^\<]+)<\/D_C_3_7_1><D_C_3_7_2>([^\<]+)<\/D_C_3_7_2><D_C_3_7_3>([^\<]+)<\/D_C_3_7_3><D_Y_5>([^\<]+)<\/D_Y_5><D_Y_7>([^\<]+)<\/D_Y_7><D_Y_6>([^\<]+)<\/D_Y_6><D_Y_8_11>([^\<]+)<\/D_Y_8_11><D_Y_10_1>([^\<]+)<\/D_Y_10_1><D_B_1>([^\<]+)<\/D_B_1><D_A_1_1>([^\<]+)<\/D_A_1_1><D_A_1_2>([^\<]+)<\/D_A_1_2><D_A_1_3>([^\<]+)<\/D_A_1_3><D_A_2_1>([^\<]+)<\/D_A_2_1><D_A_3_1>([^\<]+)<\/D_A_3_1><D_A_3_2>([^\<]+)<\/D_A_3_2><D_K_1>([^\<]+)<\/D_K_1><D_K_2>([^\<]+)<\/D_K_2><D_K_3>([^\<]+)<\/D_K_3><D_K_4>([^\<]+)<\/D_K_4><D_K_7>([^\<]+)<\/D_K_7><D_K_8>([^\<]+)<\/D_K_8><D_K_9>([^\<]+)<\/D_K_9><D_Y_2_1>([^\<]+)<\/D_Y_2_1><D_Y_4_1>([^\<]+)<\/D_Y_4_1><D_Y_2_2>([^\<]+)<\/D_Y_2_2><D_Y_4_2>([^\<]+)<\/D_Y_4_2><D_Y_2_3>([^\<]+)<\/D_Y_2_3><D_Y_4_3>([^\<]+)<\/D_Y_4_3><D_Y_2_4>([^\<]+)<\/D_Y_2_4><D_Y_4_4>([^\<]+)<\/D_Y_4_4><D_Y_2_5>([^\<]+)<\/D_Y_2_5><D_Y_4_5>([^\<]+)<\/D_Y_4_5><D_Y_2_6>([^\<]+)<\/D_Y_2_6><D_Y_4_6>([^\<]+)<\/D_Y_4_6><D_Y_2_7>([^\<]+)<\/D_Y_2_7><D_Y_4_7>([^\<]+)<\/D_Y_4_7><D_Y_2_8>([^\<]+)<\/D_Y_2_8><D_Y_4_8>([^\<]+)<\/D_Y_4_8><D_Y_2_9>([^\<]+)<\/D_Y_2_9><D_Y_4_9>([^\<]+)<\/D_Y_4_9><D_Y_2_10>([^\<]+)<\/D_Y_2_10><D_Y_4_10>([^\<]+)<\/D_Y_4_10><D_Y_2_11>([^\<]+)<\/D_Y_2_11><D_Y_4_11>([^\<]+)<\/D_Y_4_11><D_Y_2_12>([^\<]+)<\/D_Y_2_12><D_Y_4_12>([^\<]+)<\/D_Y_4_12><D_Y_2_13>([^\<]+)<\/D_Y_2_13><D_Y_4_13>([^\<]+)<\/D_Y_4_13><D_Y_2_14>([^\<]+)<\/D_Y_2_14><D_Y_4_14>([^\<]+)<\/D_Y_4_14><\/data>/;
				subst = regex.exec(str);
				if (subst)
				{
					var i = 2;
					this.setState('parameter.D_D_1' , parseFloat(subst[i++]) );
					this.setState('parameter.D_A_4_1' , subst[i++] );
					this.setState('parameter.D_A_4_2' , subst[i++] );
					this.setState('parameter.D_A_4_3' , subst[i++] );
					this.setState('parameter.D_C_1_1' , parseInt(subst[i++]) );
					this.setState('parameter.D_C_2_1' , parseInt(subst[i++]) );
					this.setState('parameter.D_C_5_1' , parseInt(subst[i++]) );
					this.setState('parameter.D_C_4_1' , parseInt(subst[i++]) );
					this.setState('parameter.D_C_4_2' , subst[i++] );
					this.setState('parameter.D_C_4_3' , subst[i++] );
					this.setState('parameter.D_C_6_1' , parseInt(subst[i++]) );
					this.setState('parameter.D_C_7_1' , parseInt(subst[i++]) );
					this.setState('info.D_A_2_2' , parseInt(subst[i++]) );
					this.setState('network.D_C_3_6_1' , subst[i++] );
					this.setState('network.D_C_3_6_2' , subst[i++] );
					this.setState('network.D_C_3_6_3' , subst[i++] );
					this.setState('network.D_C_3_6_4' , subst[i++] );
					this.setState('network.D_C_3_6_5' , parseInt(subst[i++]) );
					this.setState('network.D_C_3_7_1' , subst[i++] );
					this.setState('network.D_C_3_7_2' , subst[i++] );
					this.setState('network.D_C_3_7_3' , parseInt(subst[i++]) );
					this.setState('info.D_Y_5' , parseInt(subst[i++]) );
					this.setState('info.D_Y_7' , subst[i++] );
					this.setState('info.D_Y_6' , subst[i++] );
					this.setState('info.D_Y_8_11' , parseInt(subst[i++]) );
					this.setState('info.D_Y_10_1' , parseInt(subst[i++]) );
					this.setState('info.D_B_1' , parseInt(subst[i++]) );
					this.setState('info.D_A_1_1' , parseFloat(subst[i++]) );
					this.setState('info.D_A_1_2' , parseFloat(subst[i++]) );
					this.setState('info.D_A_1_3' , parseFloat(subst[i++]) );
					this.setState('info.D_A_2_1' , parseFloat(subst[i++]) );
					this.setState('info.D_A_3_1' , subst[i++] );
					this.setState('info.D_A_3_2' , parseInt(subst[i++]) );
					this.setState('info.D_K_1' , parseFloat(subst[i++]) );
					this.setState('info.D_K_2' , parseFloat(subst[i++]) );
					this.setState('info.D_K_3' , parseFloat(subst[i++]) );
					this.setState('info.D_K_4' , parseFloat(subst[i++]) );
					this.setState('info.D_K_7' , parseFloat(subst[i++]) );
					this.setState('info.D_K_8' , parseFloat(subst[i++]) );
					this.setState('info.D_K_9' , parseFloat(subst[i]) );
					var iz = i;
					for(var iw = 1; iw<= 14; iw++) 
					{
						iz++;
						if(iw<10)
						{
							this.setState('info.D_Y_2_0' + iw , parseInt(subst[iz++]) );
							this.setState('info.D_Y_4_0' + iw , subst[iz] );
						}
						else 
						{
							this.setState('info.D_Y_2_' + iw , parseInt(subst[iz++]) );
							this.setState('info.D_Y_4_' + iw , subst[iz] );
						}
					}
				
				}
				break;
			case 7:
				//Rohwasserhärte
				regex = /<data><code>([^\<]+)<\/code><D_D_1>([^\<]+)<\/D_D_1><\/data>/;
				subst = regex.exec(str);
				if (subst){
					this.setState('parameter.D_D_1' , parseInt(subst[2]) );
					this.setState('info.Rohwasserhaerte', parseInt(subst[2]) );
				}
				break;
			case 8:
				//Startzeit Regeneration
				regex = /<data><code>([^\<]+)<\/code><D_C_4_3>([^\<]+)<\/D_C_4_3><\/data>/;
				subst = regex.exec(str);
				if (subst){
					this.setState('parameter.D_C_4_3' , parseInt(subst[2]) );
					this.setState('info.StartzeitRegeneration1', parseInt(subst[2]) );
				}
				break;
			case 9:
				//Power- Eco-modus
				regex = /<data><code>([^\<]+)<\/code><D_C_5_1>([^\<]+)<\/D_C_5_1><\/data>/;
				subst = regex.exec(str);
				if (subst){
					this.setState('parameter.D_C_5_1' , parseInt(subst[2]) );
					this.setState('info.Ansprechverhalten', parseInt(subst[2]) );
				}
				break;
			default:
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