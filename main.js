"use strict";

/*
 * Created with @iobroker/create-adapter v1.11.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

// Load your modules here, e.g.:
// const fs = require("fs");
const descriptions = require("./descriptions");
const axios = require("axios");
const querystring = require("querystring");
const crypto = require("crypto");
const WebSocket = require("ws");
const { XMLHttpRequest } = require("xmlhttprequest-ts");
const DOMParser = require("xmldom").DOMParser;
const domParser = new DOMParser();
const requestAllCommand =
    "id=0000&code=245&show=D_D_1|D_A_4_1|D_A_4_2|D_A_4_3|D_C_1_1|D_C_2_1|D_C_5_1|D_C_4_1|D_C_4_2|D_C_4_3|D_C_6_1|D_C_7_1|D_A_2_2|D_A_2_3|D_C_3_6_1|D_C_8_1|D_C_8_2|D_C_3_6_2|D_C_3_6_3|D_C_3_6_4|D_C_3_6_5|D_C_3_7_1|D_C_3_7_2|D_C_3_7_3|D_Y_5|D_Y_7|D_Y_6|D_Y_8_11|D_Y_10_1|D_B_1|D_A_1_1|D_A_1_2|D_A_1_3|D_A_2_1|D_A_3_1|D_A_3_2|D_K_1|D_K_2|D_K_3|D_K_4|D_K_7|D_K_8|D_K_9|D_Y_2_1|D_Y_4_1|D_Y_2_2|D_Y_4_2|D_Y_2_3|D_Y_4_3|D_Y_2_4|D_Y_4_4|D_Y_2_5|D_Y_4_5|D_Y_2_6|D_Y_4_6|D_Y_2_7|D_Y_4_7|D_Y_2_8|D_Y_4_8|D_Y_2_9|D_Y_4_9|D_Y_2_10|D_Y_4_10|D_Y_2_11|D_Y_4_11|D_Y_2_12|D_Y_4_12|D_Y_2_13|D_Y_4_13|D_Y_2_14|D_Y_4_14~";
const requestActualsCommand =
    "id=0000&show=D_A_1_1|D_A_1_2|D_A_2_2|D_A_3_1|D_A_3_2|D_Y_1|D_A_1_3|D_A_2_3|D_Y_5|D_A_2_1|D_C_4_1|D_C_4_3|D_C_1_1|D_C_4_2|D_C_5_1|D_C_6_1|D_C_8_1|D_C_8_2|D_D_1|D_E_1|D_Y_9|D_Y_9_8|D_Y_9_24|D_C_7_1|D_Y_10_1|D_B_1~";
const requestErrorsCommand =
    "id=0000&code=245&show=D_K_10_1|D_K_10_2|D_K_10_3|D_K_10_4|D_K_10_5|D_K_10_6|D_K_10_7|D_K_10_8|D_K_10_9|D_K_10_10|D_K_10_11|D_K_10_12|D_K_10_13|D_K_10_14|D_K_10_15|D_K_10_16~";
const requestImpulsCommand = "id=0000&code=290&show=D_F_5|D_F_6~";
const durchflussCommand = "id=0000&show=D_A_1_1~";
let pollingInterval;
let actualInterval;
let allInterval;
let dailyInterval;
let errorInterval;
let impulsInterval;
let clockInterval;
let powerModeInterval;
let currentCommand = "";
let blockTimeout;
const queueArray = [];
const parameterQueueArray = [];
let blockConnection = false;

let ws = null;

let refreshToken = "";
let accessToken = "";
let wsAccessToken = "";
let wsUrl = "";
let wsConnectionId = "";
let mgDeviceId = "";
let tenant = "";
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
        this.sdVersion = "2020-08-03";
        this.userAgent = "Gruenbeck/354 CFNetwork/1209 Darwin/20.2.0";
        this.subscribeStates("*");
        if (this.config.host) {
            this.log.debug("Starting gruenbeck adapter with:" + this.config.host);
            // @ts-ignore
            const pollingTime = this.config.pollInterval * 1000 || 30000;
            // @ts-ignore
            const pollingDurchflussTime = this.config.pollWasserverbrauchInterval * 1000 || 7000;
            this.log.debug("[INFO] Configured polling interval: " + pollingTime);
            this.requestData(requestAllCommand);
            this.setClock();
            this.setPowerMode();

            if (!pollingInterval) {
                //pollingInterval = setInterval(() => {this.requestData(requestActualsCommand)}, pollingTime); ;
                pollingInterval = setInterval(() => {
                    this.requestData(durchflussCommand);
                }, pollingDurchflussTime);
                actualInterval = setInterval(() => {
                    if (queueArray[queueArray.length - 1] !== requestActualsCommand) {
                        queueArray.push(requestActualsCommand);
                    }
                }, pollingTime);
                allInterval = setInterval(() => {
                    queueArray.push(requestAllCommand);
                }, 1 * 60 * 60 * 1000); // 1hour
                errorInterval = setInterval(() => {
                    queueArray.push(requestErrorsCommand);
                }, 10 * 60 * 1000); // 10min
                impulsInterval = setInterval(() => {
                    queueArray.push(requestImpulsCommand);
                }, 4 * 60 * 60 * 1000); // 4hour
                clockInterval = setInterval(() => this.setClock(), 1 * 60 * 60 * 1000); // 1hour
                powerModeInterval = setInterval(() => this.setPowerMode(), 1 * 60 * 60 * 1000); // 1hour
            }
        } else if (this.config.mgUser && this.config.mgPass) {
            if (this.config.mgInterval && this.config.mgInterval < 360) {
                this.log.warn("Interval ist zu niedrig. Auf 360sec erhöht um Blocking zu vermeiden.");
                this.config.mgInterval = 360;
            }
            this.login().then(() =>
                this.getMgDevices().then(() => {
                    this.parseMgInfos();

                    this.parseMgInfos("parameters");
                    this.parseMgInfos("measurements/salt");
                    this.parseMgInfos("measurements/water");
                    this.connectMgWebSocket();
                    this.enterSD()
                        .then(() => {
                            this.refreshSD().catch(() => {
                                this.log.error("Failed refresh SD");
                            });
                        })
                        .catch(() => {
                            this.log.error("Failed enter SD");
                        });
                    allInterval = setInterval(() => {
                        this.parseMgInfos();
                    }, 1 * 60 * 60 * 1000); //1hour
                    dailyInterval = setInterval(() => {
                        this.parseMgInfos("measurements/salt/");
                        this.parseMgInfos("measurements/water/");
                    }, 24 * 60 * 60 * 1000); //24hour
                    actualInterval = setInterval(() => {
                        this.log.debug("Start refresh");
                        this.enterSD()
                            .then(() => {
                                this.refreshSD().catch(() => {
                                    this.log.error("Failed refresh SD");
                                });
                            })
                            .catch(() => {
                                this.log.error("Failed enter SD");
                            });
                    }, this.config.mgInterval * 1000);
                })
            );
        } else {
            this.log.warn("[START] No IP-address set");
        }
    }
    login() {
        return new Promise((resolve, reject) => {
            const [code_verifier, codeChallange] = this.getCodeChallenge();
            const axiosInitConfig = {
                headers: {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Encoding": "br, gzip, deflate",
                    Connection: "keep-alive",
                    "Accept-Language": "de-de",
                    "User-Agent": this.userAgent,
                },
            };
            axios
                .get(
                    "https://gruenbeckb2c.b2clogin.com/a50d35c1-202f-4da7-aa87-76e51a3098c6/b2c_1_signinup/oauth2/v2.0/authorize?" +
                        "x-client-Ver=0.8.0&state=NjkyQjZBQTgtQkM1My00ODBDLTn3MkYtOTZCQ0QyQkQ2NEE5&client_info=1&response_type=code&code_challenge_method=S256&x-app-name=Gr%C3%BCnbeck&x-client-OS=14.3&x-app-ver=1.2.0&scope=https%3A%2F%2Fgruenbeckb2c.onmicrosoft.com%2Fiot%2Fuser_impersonation%20openid%20profile%20offline_access&x-client-SKU=MSAL.iOS&" +
                        "code_challenge=" +
                        codeChallange +
                        "&x-client-CPU=64&client-request-id=F2929DED-2C9D-49F5-A0F4-31215427667C&redirect_uri=msal5a83cc16-ffb1-42e9-9859-9fbf07f36df8%3A%2F%2Fauth&client_id=5a83cc16-ffb1-42e9-9859-9fbf07f36df8&haschrome=1&return-client-request-id=true&x-client-DM=iPhone",
                    axiosInitConfig
                )
                .then((response) => {
                    this.log.debug("Login step 1");
                    this.log.debug(JSON.stringify(response.data));
                    // handle success
                    let start, end;
                    start = response.data.indexOf("csrf") + 7;
                    end = response.data.indexOf(",", start) - 1;
                    const csrf = response.data.substring(start, end);
                    start = response.data.indexOf("transId") + 10;
                    end = response.data.indexOf(",", start) - 1;
                    const transId = response.data.substring(start, end);
                    start = response.data.indexOf("policy") + 9;
                    end = response.data.indexOf(",", start) - 1;
                    const policy = response.data.substring(start, end);
                    start = response.data.indexOf("tenant") + 9;
                    end = response.data.indexOf(",", start) - 1;
                    tenant = response.data.substring(start, end);
                    const filteredCookies = response.headers["set-cookie"].map((element) => {
                        return element.split("; ")[0];
                    });
                    const cookie = filteredCookies.join("; ");
                    const axiosConfig = {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                            "X-CSRF-TOKEN": csrf,
                            Accept: "application/json, text/javascript, */*; q=0.01",
                            "X-Requested-With": "XMLHttpRequest",
                            Origin: "https://gruenbeckb2c.b2clogin.com",

                            Referer:
                                "https://gruenbeckb2c.b2clogin.com/a50d35c1-202f-4da7-aa87-76e51a3098c6/b2c_1_signinup/oauth2/v2.0/authorize?x-client-Ver=0.8.0&state=NjkyQjZBQTgtQkM1My00ODBDLTk3MkYtOTZCQ0QyQkQ2NEE5&client_info=1&response_type=code&code_challenge_method=S256&x-app-name=Gr%C3%BCnbeck&x-client-OS=14.3&x-app-ver=1.1.4&scope=https%3A%2F%2Fgruenbeckb2c.onmicrosoft.com%2Fiot%2Fuser_impersonation%20openid%20profile%20offline_access&x-client-SKU=MSAL.iOS&code_challenge=SJ4qbue1p8KeyKbLmMMEOvRgIe01ZEm5olMVHIvCmc0&x-client-CPU=64&client-request-id=F2929DED-2C9D-49F5-A0F4-31215427667C&redirect_uri=msal5a83cc16-ffb1-42e9-9859-9fbf07f36df8%3A%2F%2Fauth&client_id=5a83cc16-ffb1-42e9-9859-9fbf07f36df8&haschrome=1&return-client-request-id=true&x-client-DM=iPhone",
                            Cookie: cookie,
                            "User-Agent": this.userAgent,
                        },
                    };
                    this.log.debug("https://gruenbeckb2c.b2clogin.com" + tenant + "/SelfAsserted?tx=" + transId + "&p=" + policy);
                    axios
                        .post(
                            "https://gruenbeckb2c.b2clogin.com" + tenant + "/SelfAsserted?tx=" + transId + "&p=" + policy,
                            querystring.stringify({
                                request_type: "RESPONSE",
                                logonIdentifier: this.config.mgUser,
                                password: this.config.mgPass,
                            }),
                            axiosConfig
                        )
                        .then((response) => {
                            this.log.debug("Login step 2");
                            this.log.debug(JSON.stringify(response.data));
                            const filteredCookies = response.headers["set-cookie"].map((element) => {
                                return element.split("; ")[0];
                            });
                            let cookie = filteredCookies.join("; ");
                            cookie += "; x-ms-cpim-csrf=" + csrf;
                            const axiosGetConfig = {
                                maxRedirects: 0,
                                headers: {
                                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                                    "Accept-Encoding": "br, gzip, deflate",
                                    Connection: "keep-alive",
                                    "Accept-Language": "de-de",
                                    Cookie: cookie,
                                    "User-Agent": this.userAgent,
                                },
                            };
                            axios
                                .get("https://gruenbeckb2c.b2clogin.com" + tenant + "/api/CombinedSigninAndSignup/confirmed?csrf_token=" + csrf + "&tx=" + transId + "&p=" + policy, axiosGetConfig)
                                .then((response) => {
                                    this.log.warn(response);
                                })
                                .catch((error) => {
                                    // handle error
                                    if (error.response && error.response.status === 302) {
                                        if (error.response.data.indexOf("code") !== -1) {
                                            start = error.response.data.indexOf("code%3d") + 7;
                                            end = error.response.data.indexOf(">here") - 1;
                                            const code = error.response.data.substring(start, end);
                                            const axiosPostConfig = {
                                                maxRedirects: 0,
                                                headers: {
                                                    Host: "gruenbeckb2c.b2clogin.com",
                                                    "x-client-SKU": "MSAL.iOS",
                                                    Accept: "application/json",
                                                    "x-client-OS": "14.3",
                                                    "x-app-name": "Grünbeck",
                                                    "x-client-CPU": "64",
                                                    "x-app-ver": "1.2.0",
                                                    "Accept-Language": "de-de",
                                                    "client-request-id": "F2929DED-2C9D-49F5-A0F4-31215427667C",
                                                    "x-ms-PkeyAuth": "1.0",
                                                    "x-client-Ver": "0.8.0",
                                                    "x-client-DM": "iPhone",
                                                    "User-Agent": "Gruenbeck/354 CFNetwork/1209 Darwin/20.2.0",
                                                    "return-client-request-id": "true",
                                                },
                                            };
                                            axios
                                                .post(
                                                    "https://gruenbeckb2c.b2clogin.com" + tenant + "/oauth2/v2.0/token",
                                                    querystring.stringify({
                                                        client_info: "1",
                                                        scope: "https://gruenbeckb2c.onmicrosoft.com/iot/user_impersonation openid profile offline_access",
                                                        code: code,
                                                        grant_type: "authorization_code",
                                                        code_verifier: code_verifier,
                                                        redirect_uri: "msal5a83cc16-ffb1-42e9-9859-9fbf07f36df8://auth",
                                                        client_id: "5a83cc16-ffb1-42e9-9859-9fbf07f36df8",
                                                    }),
                                                    axiosPostConfig
                                                )
                                                .then((response) => {
                                                    accessToken = response.data.access_token;
                                                    refreshToken = response.data.refresh_token;
                                                    setInterval(() => this.startRefreshToken(), 50 * 60 * 1000); //50min
                                                    this.setState("info.connection", true, true);
                                                    resolve();
                                                })
                                                .catch((error) => {
                                                    // handle error
                                                    this.log.error(error);
                                                });
                                        }
                                    } else {
                                        this.log.error(error);
                                    }
                                });
                        })
                        .catch((error) => {
                            // handle error
                            this.log.error(error);
                        });
                })
                .catch((error) => {
                    // handle error
                    this.log.error(error);
                    this.log.error(JSON.stringify(error));
                });
        });
    }
    refreshSD() {
        return new Promise((resolve, reject) => {
            this.log.debug("refreshSD");
            const axiosConfig = {
                headers: {
                    Host: "prod-eu-gruenbeck-api.azurewebsites.net",
                    Accept: "application/json, text/plain, */*",
                    "User-Agent": "Gruenbeck/354 CFNetwork/1209 Darwin/20.2.0",
                    "Accept-Language": "de-de",
                    Authorization: "Bearer " + accessToken,
                },
            };
            axios
                .post("https://prod-eu-gruenbeck-api.azurewebsites.net/api/devices/" + mgDeviceId + "/realtime/refresh?api-version=" + this.sdVersion, {}, axiosConfig)
                .then((response) => {
                    this.log.debug("refreshSD response:");
                    this.log.debug(JSON.stringify(response.data));
                    if (response.status < 400) {
                        resolve();
                    } else {
                        reject();
                    }
                })
                .catch((error) => {
                    // handle error
                    this.log.error(error.config.url);
                    this.log.error(error);
                    reject();
                });
        });
    }
    enterSD() {
        return new Promise((resolve, reject) => {
            this.log.debug("EnterSD");
            const axiosConfig = {
                headers: {
                    Host: "prod-eu-gruenbeck-api.azurewebsites.net",
                    Accept: "application/json, text/plain, */*",
                    "User-Agent": "Gruenbeck/354 CFNetwork/1209 Darwin/20.2.0",
                    "Accept-Language": "de-de",
                    Authorization: "Bearer " + accessToken,
                },
            };
            axios
                .post("https://prod-eu-gruenbeck-api.azurewebsites.net/api/devices/" + mgDeviceId + "/realtime/enter?api-version=" + this.sdVersion, {}, axiosConfig)
                .then((response) => {
                    this.log.debug("enterSD response");
                    this.log.debug(JSON.stringify(response.data));
                    if (response.status < 400) {
                        resolve();
                    } else {
                        reject();
                    }
                })
                .catch((error) => {
                    // handle error
                    this.log.error(error.config.url);
                    this.log.error(error);
                    reject();
                });
        });
    }
    leaveSD() {
        return new Promise((resolve, reject) => {
            const axiosConfig = {
                headers: {
                    Host: "prod-eu-gruenbeck-api.azurewebsites.net",
                    Accept: "application/json, text/plain, */*",
                    "User-Agent": "Gruenbeck/354 CFNetwork/1209 Darwin/20.2.0",
                    "Accept-Language": "de-de",
                    Authorization: "Bearer " + accessToken,
                },
            };
            axios
                .post("https://prod-eu-gruenbeck-api.azurewebsites.net/api/devices/" + mgDeviceId + "/realtime/leave?api-version=" + this.sdVersion, {}, axiosConfig)
                .then((response) => {
                    this.log.debug(JSON.stringify(response.data));
                    if (response.status < 400) {
                        resolve();
                    } else {
                        reject();
                    }
                })
                .catch((error) => {
                    // handle error
                    this.log.error(error.config.url);
                    this.log.error(error);
                    reject();
                });
        });
    }
    getMgDevices() {
        return new Promise((resolve, reject) => {
            const axiosConfig = {
                headers: {
                    Host: "prod-eu-gruenbeck-api.azurewebsites.net",
                    Accept: "application/json, text/plain, */*",
                    "User-Agent": "Gruenbeck/354 CFNetwork/1209 Darwin/20.2.0",
                    Authorization: "Bearer " + accessToken,
                    "Accept-Language": "de-de",
                    "cache-control": "no-cache",
                },
            };
            axios
                .get("https://prod-eu-gruenbeck-api.azurewebsites.net/api/devices?api-version=" + this.sdVersion, axiosConfig)
                .then(async (response) => {
                    if (response.data && response.data.length > 0) {
                        try {
                            //filter for softliq devices
                            this.log.debug(JSON.stringify(response.data));
                            response.data = response.data.filter((el) => el.id.toLowerCase().indexOf("soft") > -1);
                            const device = response.data[0];
                            mgDeviceId = device.id;
                            await this.setObjectNotExistsAsync(device.id, {
                                type: "state",
                                common: {
                                    name: device.name,
                                    role: "indicator",
                                    type: "mixed",
                                    write: false,
                                    read: true,
                                },
                                native: {},
                            });

                            resolve();
                        } catch (error) {
                            this.log.error(error);
                            this.log.debug(response.data);
                            reject();
                        }
                    } else {
                        reject();
                    }
                })
                .catch((error) => {
                    this.log.error(error);
                });
        });
    }

    pushMgParameter(data) {
        this.log.debug("https://prod-eu-gruenbeck-api.azurewebsites.net/api/devices/" + mgDeviceId + "/parameters?api-version=" + this.sdVersion);
        this.log.debug(JSON.stringify(data));
        const config = {
            method: "patch",
            url: "https://prod-eu-gruenbeck-api.azurewebsites.net/api/devices/" + mgDeviceId + "/parameters?api-version=" + this.sdVersion,
            headers: {
                Host: "prod-eu-gruenbeck-api.azurewebsites.net",
                "Content-Type": "application/json",
                Accept: "application/json, text/plain, */*",
                "Accept-Language": "de-de",
                "User-Agent": this.userAgent,
                Authorization: "Bearer " + accessToken,
            },
            data: data,
        };

        axios(config)
            .then((response) => {
                this.log.debug(JSON.stringify(response.data));
                setTimeout(() => {
                    this.parseMgInfos("parameters");
                }, 1000 * 15);
            })
            .catch((error) => {
                this.log.error(error);
            });
    }
    parseMgInfos(endpoint) {
        return new Promise((resolve, reject) => {
            endpoint = endpoint || "";
            const axiosConfig = {
                headers: {
                    Host: "prod-eu-gruenbeck-api.azurewebsites.net",
                    Accept: "application/json, text/plain, */*",
                    "User-Agent": this.userAgent,
                    Authorization: "Bearer " + accessToken,
                    "Accept-Language": "de-de",
                    "cache-control": "no-cache",
                },
            };
            this.log.debug("GET: " + "https://prod-eu-gruenbeck-api.azurewebsites.net/api/devices/" + mgDeviceId + "/" + endpoint + "?api-version=" + this.sdVersion);
            axios
                .get("https://prod-eu-gruenbeck-api.azurewebsites.net/api/devices/" + mgDeviceId + "/" + endpoint + "?api-version=" + this.sdVersion, axiosConfig)
                .then(async (response) => {
                    if (response.data) {
                        if (endpoint) {
                            endpoint = endpoint.replace("/", ".");
                            endpoint = endpoint;
                        }
                        try {
                            this.log.debug(JSON.stringify(response.data));
                            if (Array.isArray(response.data)) {
                                if (endpoint) {
                                    endpoint = endpoint.replace("/", ".");
                                }
                                await this.setObjectNotExistsAsync(mgDeviceId + "." + endpoint, {
                                    type: "state",
                                    common: {
                                        name: endpoint,
                                        type: "string",
                                        role: "indicator",
                                        write: false,
                                        read: true,
                                    },
                                    native: {},
                                });
                                this.setState(mgDeviceId + "." + endpoint, JSON.stringify(response.data), true);
                            } else {
                                if (endpoint) {
                                    endpoint = endpoint.replace("/", ".");
                                    endpoint = endpoint + ".";
                                }
                                for (const key in response.data) {
                                    await this.setObjectNotExistsAsync(mgDeviceId + "." + endpoint + key, {
                                        type: "state",
                                        common: {
                                            name: descriptions[key] || key,
                                            type: typeof response.data[key],
                                            role: "indicator",
                                            write: endpoint ? true : false,
                                            read: true,
                                        },
                                        native: {},
                                    });
                                    if (Array.isArray(response.data[key])) {
                                        this.setState(mgDeviceId + "." + endpoint + key, JSON.stringify(response.data[key]), true);
                                    } else {
                                        if (typeof response.data[key] === "object") {
                                            response.data[key] = JSON.stringify(response.data[key]);
                                        }
                                        this.setState(mgDeviceId + "." + endpoint + key, response.data[key], true);
                                    }
                                }
                            }
                            resolve();
                        } catch (error) {
                            this.log.error(error);
                            reject();
                        }
                    } else {
                        reject();
                    }
                })
                .catch((error) => {
                    this.log.error(error);
                });
        });
    }

    connectMgWebSocket() {
        const axiosConfig = {
            headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                Origin: "file://",
                Accept: "*/*",
                "User-Agent": "Gruenbeck/354 CFNetwork/1209 Darwin/20.2.0",
                Authorization: "Bearer " + accessToken,
                "Accept-Language": "de-de",
                "cache-control": "no-cache",
                "X-Requested-With": "XMLHttpRequest",
            },
        };
        axios
            .get("https://prod-eu-gruenbeck-api.azurewebsites.net/api/realtime/negotiate", axiosConfig)
            .then((response) => {
                this.log.debug(JSON.stringify(response.data));
                if (response.data) {
                    wsUrl = response.data.url;
                    wsAccessToken = response.data.accessToken;
                    const axiosPostConfig = {
                        headers: {
                            "Content-Type": "text/plain;charset=UTF-8",
                            Origin: "file://",
                            Accept: "*/*",
                            "User-Agent": "Gruenbeck/354 CFNetwork/1209 Darwin/20.2.0",
                            Authorization: "Bearer " + wsAccessToken,
                            "Accept-Language": "de-de",
                            "X-Requested-With": "XMLHttpRequest",
                        },
                    };
                    axios
                        .post("https://prod-eu-gruenbeck-signalr.service.signalr.net/client/negotiate?hub=gruenbeck", {}, axiosPostConfig)
                        .then((response) => {
                            this.log.debug(JSON.stringify(response.data));
                            if (response.data) {
                                try {
                                    wsConnectionId = response.data.connectionId;

                                    ws = new WebSocket("wss://prod-eu-gruenbeck-signalr.service.signalr.net/client/?hub=gruenbeck&id=" + wsConnectionId + "&access_token=" + wsAccessToken, {
                                        headers: {
                                            Upgrade: "websocket",
                                            Host: "prod-eu-gruenbeck-signalr.service.signalr.net",
                                            Origin: "null",
                                            Pragma: "no-cache",
                                            "Cache-Control": "no-cache",

                                            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
                                        },
                                    });

                                    ws.on("open", async () => {
                                        this.log.debug("WS connected");
                                        ws.send('{"protocol":"json","version":1}');
                                        await this.setObjectNotExistsAsync(mgDeviceId + ".Stream", {
                                            type: "state",
                                            common: {
                                                name: "Streaminformation via myGruenbeck",
                                                role: "indicator",
                                                type: "mixed",
                                                write: false,
                                                read: true,
                                            },
                                            native: {},
                                        });
                                    });
                                    ws.on("close", (data) => {
                                        this.log.info(data);
                                        this.log.info("Websocket closed");
                                    });
                                    ws.on("message", (data) => {
                                        this.log.debug(data);
                                        try {
                                            const message = JSON.parse(data.replace("", ""));
                                            if (message.arguments) {
                                                message.arguments.forEach(async (argument) => {
                                                    for (const key in argument) {
                                                        await this.setObjectNotExistsAsync(mgDeviceId + ".Stream." + key, {
                                                            type: "state",
                                                            common: {
                                                                name: descriptions[key] || key,
                                                                type: typeof argument[key],
                                                                role: "indicator",
                                                                write: false,
                                                                read: true,
                                                            },
                                                            native: {},
                                                        });
                                                        if (Array.isArray(response.data[key])) {
                                                            this.setState(mgDeviceId + ".Stream." + key, JSON.stringify(argument[key]), true);
                                                        } else {
                                                            this.setState(mgDeviceId + ".Stream." + key, argument[key], true);
                                                        }
                                                    }
                                                });
                                            }
                                        } catch (error) {
                                            this.log.error("Websocket parse error");
                                            this.log.error(error);
                                            this.log.error(data);
                                            ws.close();
                                            setTimeout(() => {
                                                this.connectMgWebSocket();
                                            }, 5000);
                                        }
                                    });
                                } catch (error) {
                                    this.log.error(error);
                                    this.log.debug(response.data);
                                }
                            }
                        })
                        .catch((error) => {
                            // handle error
                            this.log.error(error);
                        });
                } else {
                }
            })
            .catch((error) => {
                // handle error
                this.log.error(error);
            });
    }
    startRefreshToken() {
        this.log.debug("Start Refresh Token");
        const axiosPostConfig = {
            maxRedirects: 0,
            headers: {
                Host: "gruenbeckb2c.b2clogin.com",
                "x-client-SKU": "MSAL.iOS",
                Accept: "application/json",
                "x-client-OS": "14.3",
                "x-app-name": "Grünbeck",
                "x-client-CPU": "64",
                "x-app-ver": "1.2.0",
                "Accept-Language": "de-de",
                "client-request-id": "F2929DED-2C9D-49F5-A0F4-31215427667C",
                "x-ms-PkeyAuth": "1.0",
                "x-client-Ver": "0.8.0",
                "x-client-DM": "iPhone",
                "User-Agent": "Gruenbeck/354 CFNetwork/1209 Darwin/20.2.0",
                "return-client-request-id": "true",
            },
        };
        axios
            .post(
                "https://gruenbeckb2c.b2clogin.com" + tenant + "/oauth2/v2.0/token",
                querystring.stringify({
                    client_id: "5a83cc16-ffb1-42e9-9859-9fbf07f36df8",
                    scope: "https://gruenbeckb2c.onmicrosoft.com/iot/user_impersonation openid profile offline_access",
                    refresh_token: refreshToken,
                    client_info: "1",
                    grant_type: "refresh_token",
                }),
                axiosPostConfig
            )
            .then((response) => {
                this.log.debug("Refresh Token succesfull");
                this.log.debug(JSON.stringify(response.data));
                accessToken = response.data.access_token;
                refreshToken = response.data.refresh_token;
            })
            .catch((error) => {
                this.log.error("Refreshtoken error");
                this.log.error(error);
                setTimeout(() => this.startRefreshToken(), 5 * 60 * 1000);
            });
    }
    getCodeChallenge() {
        let hash = "";
        let result = "";
        while (hash === "" || hash.indexOf("+") !== -1 || hash.indexOf("/") !== -1 || hash.indexOf("=") !== -1 || result.indexOf("+") !== -1 || result.indexOf("/") !== -1) {
            const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            result = "";
            for (let i = 64; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
            result = Buffer.from(result).toString("base64");
            result = result.replace(/=/g, "");
            hash = crypto.createHash("sha256").update(result).digest("base64");
            hash = hash.slice(0, hash.length - 1);
        }
        return [result, hash];
    }

    setClock() {
        const d = new Date();
        queueArray.push("edit=D_C_4_2>" + d.getHours() + ":" + d.getMinutes() + "&id=0000&show=D_C_4_2~");
    }
    setPowerMode() {
        if (!this.config.powerActive) {
            this.log.debug("Powermode schedule not active");
            return;
        }
        const d = new Date();
        const day = d.getDay();
        const adapterPrefix = this.name + "." + this.instance;
        this.getState(adapterPrefix + ".parameter.D_C_5_1", (err, powerMode) => {
            if (!powerMode) {
                return;
            }
            switch (day) {
                case 1:
                    if (this.config.power1 && powerMode.val == 0) {
                        queueArray.push("edit=D_C_5_1>1&id=0000&show=D_C_5_1~");
                    } else if (!this.config.power1 && powerMode.val === 1) {
                        queueArray.push("edit=D_C_5_1>0&id=0000&show=D_C_5_1~");
                    }
                    break;
                case 2:
                    if (this.config.power2 && powerMode.val == 0) {
                        queueArray.push("edit=D_C_5_1>1&id=0000&show=D_C_5_1~");
                    } else if (!this.config.power2 && powerMode.val == 1) {
                        queueArray.push("edit=D_C_5_1>0&id=0000&show=D_C_5_1~");
                    }
                    break;
                case 3:
                    if (this.config.power3 && powerMode.val == 0) {
                        queueArray.push("edit=D_C_5_1>1&id=0000&show=D_C_5_1~");
                    } else if (!this.config.power3 && powerMode.val == 1) {
                        queueArray.push("edit=D_C_5_1>0&id=0000&show=D_C_5_1~");
                    }
                    break;
                case 4:
                    if (this.config.power4 && powerMode.val == 0) {
                        queueArray.push("edit=D_C_5_1>1&id=0000&show=D_C_5_1~");
                    } else if (!this.config.power4 && powerMode.val == 1) {
                        queueArray.push("edit=D_C_5_1>0&id=0000&show=D_C_5_1~");
                    }
                    break;
                case 5:
                    if (this.config.power5 && powerMode.val == 0) {
                        queueArray.push("edit=D_C_5_1>1&id=0000&show=D_C_5_1~");
                    } else if (!this.config.power5 && powerMode.val == 1) {
                        queueArray.push("edit=D_C_5_1>0&id=0000&show=D_C_5_1~");
                    }
                    break;
                case 6:
                    if (this.config.power6 && powerMode.val == 0) {
                        queueArray.push("edit=D_C_5_1>1&id=0000&show=D_C_5_1~");
                    } else if (!this.config.power6 && powerMode.val == 1) {
                        queueArray.push("edit=D_C_5_1>0&id=0000&show=D_C_5_1~");
                    }
                    break;
                case 7:
                    if (this.config.power7 && powerMode.val == 0) {
                        queueArray.push("edit=D_C_5_1>1&id=0000&show=D_C_5_1~");
                    } else if (!this.config.power7 && powerMode.val == 1) {
                        queueArray.push("edit=D_C_5_1>0&id=0000&show=D_C_5_1~");
                    }
                    break;
                default:
            }
        });
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            if (mgDeviceId) {
                this.leaveSD();
            }
            clearInterval(pollingInterval);
            clearInterval(actualInterval);
            clearInterval(allInterval);
            clearInterval(dailyInterval);
            clearInterval(errorInterval);
            clearInterval(impulsInterval);
            clearInterval(clockInterval);
            clearInterval(clockInterval);
            ws.close();
            //xhr.abort()
            this.log.debug("Stopping gruenbeck");
            this.setState("info.connection", false, true);
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
        if (id.indexOf(".parameters.") !== -1 && state.ack === false) {
            const action = id.split(".").slice(-1);
            const data = {};
            data[action] = state.val;
            this.pushMgParameter(data);
            return;
        }

        if (state) {
            const adapterPrefix = this.name + "." + this.instance;

            // The state was changed
            if (id === adapterPrefix + ".info.D_A_1_1" && state.lc && state.lc === state.ts && this.config.schleichStart && this.config.schleichEnd) {
                const d = new Date();
                if (d.getHours() >= this.config.schleichStart && d.getHours() < this.config.schleichEnd) {
                    this.setState("calculated.schleichWasserAlarm", 1, true);
                }
            }
            if (id === adapterPrefix + ".info.D_A_1_1" && state.lc && state.lc === state.ts) {
                this.getState(adapterPrefix + ".parameter.D_D_1", (err, rohwasserState) => {
                    const Verschnitthaerte = this.config.verschnitthaerte || 5;
                    let Rohwasserhaerte;
                    if (rohwasserState) {
                        Rohwasserhaerte = rohwasserState.val;
                    }
                    if (Rohwasserhaerte - Verschnitthaerte <= 0) {
                        this.log.error("Verschnitthärte kleiner gleich Rohwasserhärte: " + Rohwasserhaerte + " " + Verschnitthaerte);
                    } else {
                        const Erhoehungswert = Verschnitthaerte / (Rohwasserhaerte - Verschnitthaerte) + 1;
                        const wasserVerbrauch = ((state.val * Erhoehungswert * 1000) / 60).toFixed(2);
                        this.setState("calculated.aktuellerWasserverbrauch", wasserVerbrauch, true);
                    }
                });
                const d = new Date();

                if (this.config.schleichStart && this.config.schleichEnd && d.getHours() >= this.config.schleichStart && d.getHours() < this.config.schleichEnd) {
                    this.setState("calculated.schleichWasserAlarm", 1, true);
                }
            }

            if (id === adapterPrefix + ".error.D_K_10_1" && state.lc && state.lc === state.ts) {
                if (state.val != "0") {
                    this.getState(adapterPrefix + ".calculated.allErrorJSON", (err, errorState) => {
                        if (err) {
                            this.log.error(err);
                        } else {
                            const errorID = state.val.split("_h")[0];
                            const errorHours = state.val.split("_h")[1];
                            const d = new Date();
                            d.setHours(d.getHours() - parseInt(errorHours));
                            const errorObject = {
                                date: this.getCurrentDate(d, true),
                                value: errorID,
                            };
                            let currentErrorJSON = [];
                            if (errorState) {
                                try {
                                    currentErrorJSON = JSON.parse(errorState.val);
                                } catch (error) {
                                    currentErrorJSON = [];
                                }
                            }
                            const currentLength = currentErrorJSON.length;
                            let shared = false;
                            for (const k in currentErrorJSON) {
                                if (currentErrorJSON[k].date === errorObject.date && currentErrorJSON[k].value === errorObject.value) {
                                    shared = true;
                                    break;
                                }
                            }
                            if (!shared) currentErrorJSON.push(errorObject);
                            if (currentLength != currentErrorJSON.length) {
                                this.setState("calculated.allErrorJSON", JSON.stringify(currentErrorJSON), true);
                                let errorCode = state.val.split("_h")[0][1];
                                if (errorCode == "0") {
                                    errorCode = "10";
                                }
                                this.setState("calculated.newError", errorCode, true);
                            }
                        }
                    });
                }
            }

            if (id === adapterPrefix + ".info.D_Y_2_1" && state.lc === state.ts) {
                /*Formel Grünbeck bei Kapazitätszahl 8 m³x°dH und einem Härteunterschied von Rohwasser zu Brauchwasser 
				von 12 °dH  : 0,0285 kg x 12 °dH x 100 m³ = 34,2 kg Regeneriersalz
				Bei der min. Kapazitätszahl 6 m³x°dH entspricht der Salzverbrauch 0.025 kg
				Bei der max. Kapazitätszahl 14 m³x°dH entspricht der Salzverbrauch 0.039 kg
				Es wird von einem liniaren Salzverbrauch von 0.00175 kg pro m³x°dH ausgegangen.
				(((Kapazitätszahl-6)*0.00175)+0.025)x Rohwasserhärte x (Wasserverbrauch/1000)
				*/
                this.getStates("*", (err, states) => {
                    if (err) {
                        this.log.error(err);
                    } else {
                        const Rohwasserhaerte = states[adapterPrefix + ".parameter.D_D_1"].val;
                        const KapZahl = states[adapterPrefix + ".info.D_A_1_3"].val;
                        const Wasserverbrauch = states[adapterPrefix + ".info.D_Y_2_1"].val;

                        const SalzverbrauchAlt = states[adapterPrefix + ".calculated.Salzverbrauch"] ? states[adapterPrefix + ".calculated.Salzverbrauch"].val : 0;
                        const SalzverbrauchNeu = (((KapZahl - 6) * 0.00175 + 0.025) * Rohwasserhaerte * (Wasserverbrauch / 1000)).toFixed(3);
                        const Salzverbrauch = (parseFloat(SalzverbrauchNeu) + parseFloat(SalzverbrauchAlt)).toFixed(3);

                        let SalzverbrauchGesamt;
                        if (states[adapterPrefix + ".calculated.SalzverbrauchGesamt"] && states[adapterPrefix + ".calculated.SalzverbrauchGesamt"].val > 0) {
                            SalzverbrauchGesamt = (parseFloat(states[adapterPrefix + ".calculated.SalzverbrauchGesamt"].val) + parseFloat(SalzverbrauchNeu)).toFixed(3);
                        } else {
                            SalzverbrauchGesamt = SalzverbrauchNeu;

                            this.setState("calculated.DatumSalzverbrauch", this.getCurrentDate());
                        }

                        this.setState("calculated.Salzverbrauch", Salzverbrauch);
                        this.setState("calculated.SalzverbrauchGesamt", SalzverbrauchGesamt);
                        const salzMax = this.config.salzkg || 35;
                        this.setState("calculated.Salzstand", parseInt(((salzMax - Salzverbrauch) * 100) / salzMax));

                        /* Formel: Verschnitthärte / (Rohwasserhärte-Verschnitthärte)= ErhÃ¶hungswert
					 Beispiel: 5 °dH Verschnitthärte / ( 21° dH Rohwasserhärte- 5° dH Verschnitthärte)= 0.3125 ErhÃ¶hungswert
						0°dH Wasserverbrauch 400l x 1.3125 ErhÃ¶ungswert = 525l Wasser 5°dH */
                        const Verschnitthaerte = this.config.verschnitthaerte || 5;
                        let GesamtverbrauchAlt;
                        if (states[adapterPrefix + ".calculated.Wasserzaehler"] && states[adapterPrefix + ".calculated.Wasserzaehler"].val > 0) {
                            GesamtverbrauchAlt = states[adapterPrefix + ".calculated.Wasserzaehler"].val;
                        } else {
                            GesamtverbrauchAlt = 0;
                            this.setState("calculated.DatumWasserzaehler", this.getCurrentDate());
                        }

                        if (Rohwasserhaerte - Verschnitthaerte <= 0) {
                            this.log.error("Verschnitthärte kleiner gleich Rohwasserhärte: " + Rohwasserhaerte + " " + Verschnitthaerte);
                        } else {
                            const Erhoehungswert = Verschnitthaerte / (Rohwasserhaerte - Verschnitthaerte) + 1;
                            const GesamtverbrauchNeu = Wasserverbrauch * Erhoehungswert;
                            const Gesamtverbrauch = ((GesamtverbrauchAlt * 1000 + GesamtverbrauchNeu) / 1000).toFixed(3);
                            this.setState("calculated.Wasserzaehler", parseFloat(Gesamtverbrauch));
                            this.log.debug("neuer Zählerstand Wasser= " + Gesamtverbrauch);
                            let akkWasser = 0;
                            let VerWasser = 0;
                            for (var i = 1; i <= 14; i++) {
                                akkWasser = states[adapterPrefix + ".info.D_Y_2_" + i].val;
                                VerWasser = akkWasser * Erhoehungswert;
                                this.setState("calculated.Verschnittwasser_" + i, VerWasser.toFixed(0));
                            }
                        }
                        //calc json history
                        this.log.debug("calc JSON");
                        const newWaterLog = [];
                        let akkWasser = 0;
                        for (var i = 1; i <= 14; i++) {
                            const d = new Date();
                            d.setDate(d.getDate() - i);
                            akkWasser = states[adapterPrefix + ".info.D_Y_2_" + i].val;
                            newWaterLog.push({
                                date: this.getCurrentDate(d),
                                value: akkWasser,
                            });
                        }
                        const currentWaterLogState = states[adapterPrefix + ".calculated.allWaterJSON"];
                        let currentWaterLog = [];
                        if (currentWaterLogState) {
                            try {
                                currentWaterLog = JSON.parse(currentWaterLogState.val);
                            } catch (erro) {
                                currentWaterLog = [];
                            }
                        }

                        let waterLog = [];
                        for (const k in newWaterLog) {
                            let shared = false;
                            for (const j in currentWaterLog)
                                if (currentWaterLog[j].date == newWaterLog[k].date) {
                                    shared = true;
                                    break;
                                }
                            if (!shared) waterLog.push(newWaterLog[k]);
                        }
                        waterLog = waterLog.concat(currentWaterLog);

                        this.setState("calculated.allWaterJSON", JSON.stringify(waterLog), true);
                    }
                });
            } else if (id.indexOf("parameter") != -1 && state.ack === false) {
                this.setParameter(id, state.val);
            }
        }
    }

    getCurrentDate(date, withHours) {
        if (!date) {
            date = new Date();
        }
        const today = date;
        let dd = today.getDate();
        let mm = today.getMonth() + 1; //January is 0!

        const yyyy = today.getFullYear();
        if (dd < 10) {
            dd = "0" + dd;
        }
        if (mm < 10) {
            mm = "0" + mm;
        }
        if (withHours) {
            return dd + "." + mm + "." + yyyy + " " + today.getHours() + ":00";
        } else {
            return dd + "." + mm + "." + yyyy;
        }
    }
    setParameter(id, val) {
        const idArray = id.split(".");
        const idOnly = idArray[idArray.length - 1];
        if (idOnly === "resetSalz") {
            this.setState("calculated.Salzverbrauch", 0, true);
            this.setState("calculated.Salzstand", 100, true);
        } else {
            if (val === true) {
                val = 1;
            }
            let code = "";
            if (idOnly === "D_M_3_3") {
                code = "&code=189";
                this.setState("calculated.newError", "0", true);
            }
            this.log.debug("edit=" + idOnly + ">" + val + "&id=0000" + code + "&show=" + idOnly + "~");

            parameterQueueArray.push("edit=" + idOnly + ">" + val + "&id=0000" + code + "&show=" + idOnly + "~");
        }
    }
    requestData(sParSend) {
        if (blockConnection) {
            return;
        }
        const xhr = new XMLHttpRequest();
        currentCommand = sParSend;
        if (parameterQueueArray.length != 0) {
            currentCommand = parameterQueueArray.pop();
        } else if (queueArray.length != 0) {
            currentCommand = queueArray.pop();
        }
        this.log.debug(currentCommand);
        try {
            this.log.debug("sendRequest ");
            xhr.open("POST", "http://" + this.config.host + "/mux_http", true);
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.timeout = (this.config.pollInterval - 1 > 1 ? this.config.pollInterval - 1 : 1) * 1000;
            xhr.send(currentCommand);
            xhr.ontimeout = (error) => {
                //xhr.abort();
                this.log.debug(error.message);
                this.setState("info.connection", false, true);
            };
            xhr.onload = () => {
                this.log.debug("onload");
                this.log.debug(xhr.responseText);
                blockConnection = false;
                if (xhr.responseText) {
                    this.parseData(domParser.parseFromString(xhr.responseText, "text/xml"));
                }
            };
            xhr.onreadystatechange = () => {
                this.log.debug("statechange: " + xhr.readyState + " " + xhr.responseText.length);
                if (xhr.readyState === 4) {
                    if (xhr.responseText.length === 0 || xhr.responseText.indexOf("Error: ") != -1) {
                        if (xhr.responseText.length === 0) {
                            this.log.debug("Device returns empty repsonse. Resend request.");
                            if (currentCommand.indexOf("edit=") != -1) {
                                parameterQueueArray.push(currentCommand);
                            } else {
                                queueArray.push(currentCommand);
                            }

                            return;
                        }
                        this.log.info("Device cannot handle new connections this is normal. Adapter pause all requests for 1min");
                        blockConnection = true;
                        this.log.debug(xhr.responseText);
                        clearTimeout(blockTimeout);
                        blockTimeout = setTimeout(() => {
                            blockConnection = false;
                            this.log.debug("Resume connections.");
                            if (currentCommand.indexOf("edit=") != -1) {
                                parameterQueueArray.push(currentCommand);
                            } else {
                                queueArray.push(currentCommand);
                            }
                        }, 60 * 1000);
                        this.setState("info.connection", false, true);
                    }
                }
            };
        } catch (error) {
            xhr.abort();
            this.log.error(error);
            this.setState("info.connection", false, true);
        }
    }

    async parseData(response) {
        this.setState("info.connection", true, true);
        if (!response) {
            return;
        }
        const children = response.childNodes[0].childNodes;
        for (let i = 0; i < children.length; i++) {
            const nodeName = children[i].nodeName;
            if (nodeName === "code") {
                if (children[i].childNodes[0].nodeValue != "ok") {
                    this.log.error("wrong code");
                }
            }
            let prefix = "info.";
            if (nodeName.indexOf("D_C_3_") != -1) {
                prefix = "network.";
            } else if (nodeName.indexOf("D_D_1") != -1 || nodeName.indexOf("D_A_4") != -1 || nodeName.indexOf("D_C_") != -1 || nodeName.indexOf("D_C_8_") != -1) {
                prefix = "parameter.";
            } else if (nodeName.indexOf("D_K_10_") != -1) {
                prefix = "error.";
            }
            let value = children[i].childNodes[0].nodeValue;
            if (value.indexOf(":") === -1 && (value.match(/\./g) || []).length <= 1) {
                value = isNaN(parseFloat(value)) === true ? value : parseFloat(value);
            }
            await this.setObjectNotExistsAsync(prefix + nodeName, {
                type: "state",
                common: {
                    name: nodeName,
                    role: "indicator",
                    type: typeof value,
                    write: true,
                    read: true,
                },
                native: {},
            });
            this.setState(prefix + nodeName, value, true);
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
