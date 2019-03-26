/************************************************************************
Version: 1.8.2  - FÃ¼r schmid_no1 State Verschnittwasser hinzugefÃ¼gt 
Version: 1.8.1  - Fehler bei der Anzeige vom LanStatus korrigiert.
Version: 1.8.0  - Fehler "Error in callback: Error: INVALID_STATE_ERR: send flag is true" wird jetzt abgefangen.
                  Es wird nur noch eine Warnung ausgegeben, dass keine Netzwerkverbindung zur GrÃ¼nbeck Anlage besteht.
                - Bei Ã„nderungen der State AuÃŸeneingriff konnte es vorkommen, dass diese Ã„nderungen nicht zur Anlage Ã¼bertragen wurden
                  und somit die entsprechenden State's der Anlage nicht identisch mit den State's AuÃŸeneingriff waren. 
                - Neuen State LanStatus hinzugefÃ¼gt. Wenn eine Netzwerkverbindung vom IO Broker zur Anlage besteht, ist dieser true=verbunden. 
                - Fehler behoben das bei Netzwerkabbruch das Script in einer Endlosschleife hÃ¤ngen bleibt. Es werden jetzt maximal 10 Versuche 
                  unternommen, den neuen State an die Anlage zu senden.
Version: 1.7.0  - Merker fÃ¼r Ã„nderungen in Vis so das diese bei aktivem Sendevorgang im Anschluss ausgefÃ¼hrt werden.
Version: 1.6.6  - Texte fÃ¼r Debugmodus ergÃ¤nzt
Version: 1.6.5  - Datum letzter Reset Salzverbrauch
                - Fehler D_C_7_1 Service Intervalldauer behoben
Version: 1.6.4  - Fehler Berechnung Salzverbrauch und Wasserverbrauch behoben.
Version: 1.6.3  - schmid_no1 Wasserverbrauch 0Â°dH + Verschnittwasser berechnen 
Version: 1.6.2  - Neue State ZÃ¤hlerstÃ¤nde (D_K_1|D_K_2|D_K_3|D_K_4|D_K_7|D_K_8|D_K_9|)
                - smartboart Merker fÃ¼r manuellen Regeneration Start 
				- smartboart zusÃ¤tzliches log level
Version: 1.6.1  - NÃ¤chster Versuch den Fehler "send flag true" abzufangen :-)
                - State Salzverbrauch gesamt
Version: 1.6.0  - Formel zum berechnen vom Salzverbrauch
                - State Salzverbrauch in kg
Version: 1.5.1  - Optimierung manuelle Regeneration von smartboart Ã¼bernommen.
Version: 1.5.0  - Neu State fÃ¼r das auslesen vom Fehlerspeicher hinzugefÃ¼gt.
                - zweiter send Befehl nach Ã„nderung vom D_B_1 State unterbunden.
Version: 1.4.2  - AuslÃ¶sen einer manuelle Regeneration ist jetzt Ã¼ber Vis mÃ¶glich
                - State D_Y_6 fÃ¼r die Softwareversion hinzugefÃ¼gt.
Version: 1.4.1  - Fehler "send flag is true" beseitigt.
                - Fehler in der Zeitsynchronisation beseitigt.
                - State D_C_5_2 und D_D_2 und D_Y_8_10 entfernt (ohne Funktion bei SC18)
Version: 1.4.0  - Fehler "send flag is true" sollte nur noch bei manuellen State Ã„nderungen <18 Sek. auftreten.
Version: 1.3.0  - Automatische Zeit Synchronisation wenn Regenerationszeitpunkt auf "1=fest" eingestellt ist
                - Bei Ã„nderung der Werte Ansprechverhalten,Regenerationszeitpunkt,Regenerationszeit wird
                  die Ã„nderung an die SC18 gesendet. 
                - Parameter C_C_5_3 Automatische Umschaltung Sommer-/Winterzeit entfernt (ohne Funktion bei SC18)
Version: 1.2.2  - Konstante fÃ¼r Abfragezyklus eingefÃ¼gt
Version: 1.2.1  - Timeout Variable eingefÃ¼gt
Version: 1.2.0  - Ã„nderung:Nur noch eine Abfrage wo alle Werte abgefragt werden.
Version: 1.1.0  - Fehler korrigiert das bei kÃ¼rzeren Abfragen der Fehler "Error in callback: Error: INVALID_STATE_ERR: send flag is true" auftritt.
                - Alle Werte der Schnittstellenbeschreibung, die sinnvoll bei der SC18 abgefragt werden kÃ¶nnen, hinzugefÃ¼gt.
Version: 1.0.0  - Erstellung Script nach Vorlage  hiasii12
*************************************************************************/

// ++++++++++ USER ANPASSUNGEN ++++++++++++++++++++++
// Hier IP Adresse der Anlage eintragen 
var constIP = "192.168.1.230"
// Hier Anlagen Typ eintragen SC18, SC23, MC32, MC38 (aktuelle geht nur SC18)
var sTyp = "SC18" 
// Instanz eintragen
var instance    = '0';
var instanz     = 'javascript.' + instance + '.';
// Pfad innerhalb der Instanz
var PfadEbene1 = 'Gruenbeck.SC18.';
// Abfragezyklus in Sekunden eintragen ( <10 sek. sind nicht zu empfehlen)
const constPollingCycle = 15
//VerschnitthÃ¤rte zum berechnen vom Wasserverbrauch 0Â°dH und Verschnittwasser
const VerschnitthÃ¤rte = 5
// nur zur Fehleranalyse
var debug = false;
// zusÃ¤tzliches log level fÃ¼r die manuellen Eingaben
var logging = true;
//++++++++++ ENDE USER ANPASSUNGEN ++++++++++++++++++
var PfadEbene2 = ['Parameter.', 'Allgemein.','Netzwerk.','Fehlerspeicher.','Aktualwerte.','Wasserverbrauch.','Regenerationen.', 'Ausseneingriff.','Zaehlerstaende.']

// erstelle States
if (sTyp == 'SC18') {
    // Parameter mit Schreib- und Lesezugriff
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_D_1', {def: 0,name: 'RohwasserhÃ¤rte',type: 'number',role: 'number',desc: 'RohwasserhÃ¤rte',unit: 'Â°dH'});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_A_4_1', {def: "-",name: 'Name Installateur',type: 'string',role: 'string',desc: 'Name Installateur',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_A_4_2', {def: "-",name: 'Tel Installateur',type: 'string',role: 'string',desc: 'Tel Installateur',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_A_4_3', {def: "-",name: 'E-Mail Installateur',type: 'string',role: 'string',desc: 'E-Mail Installateur',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_1_1', {def: 0,name: 'Sprache 0=De 1=En 3=Fr 4=Nl 5=Ru 6=Es 7=Zh',type: 'number',role: 'number',desc: 'Sprache 0=De 1=En 3=Fr 4=Nl 5=Ru 6=Es 7=Zh',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_2_1', {def: 0,name: 'Haerteeinheit 0=Â°dH 1=Â°f 2=Â°e 3=ppm 4=mol/mÂ³',type: 'number',role: 'number',desc: 'Haerteeinheit 0=Â°dH 1=Â°f 2=Â°e 3=ppm 4=mol/mÂ³',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_5_1', {def: 0,name: 'Ansprechverhalten 0=eco 1=Power',type: 'number',role: 'number',desc: 'Ansprechverhalten 0=eco 1=Power'});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_4_1', {def: 0,name: 'Regenerationszeitpunkt 0= Auto 1= Fest',type: 'number',role: 'number',desc: 'Regenerationszeitpunkt 0= Auto 1= Fest',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_4_2', {def: "00:00",name: 'Uhrzeit',type: 'string',role: 'string',desc: 'Uhrzeit',unit: 'Uhr'});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_4_3', {def: "00:00",name: 'Startzeit Regeneration 1',type: 'string',role: 'string',desc: 'Startzeit Regeneration 1',unit: 'Uhr'});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_6_1', {def: 0,name: 'Aktives Display im Standby 0=deaktiviert 1=aktiviert',type: 'number',role: 'number',desc: 'Aktives Display im Standby 0=deaktiviert 1=aktiviert',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_7_1', {def: 0,name: 'Soll Service Intervalldauer',type: 'number',role: 'number',desc: 'Soll Service Intervalldauer',unit: 'Tage'});
    // Allgemein Parameter mit Lesezugriff
    createState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_A_2_2', {def: 0,name: 'Tage bis zur nÃ¤chsten Wartung',type: 'number',role: 'number',desc: 'Tage bis zur nÃ¤chsten Wartung',unit: 'Tage'});
    createState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_5', {def: 0,name: 'Aktueller Regenerationsschritt 0= keine Regeneration 1= Soletank fÃ¼llen 2= Besalzen 3= VerdrÃ¤ngen 4= RÃ¼ckspÃ¼len 5= Erstfiltrat',type: 'number',role: 'number',desc: 'Aktueller Regenerationsschritt 0= keine Regeneration 1= Soletank fÃ¼llen 2= Besalzen 3= VerdrÃ¤ngen 4= RÃ¼ckspÃ¼len 5= Erstfiltrat',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_7', {def: "--.--.--",name: 'Inbetriebnahme-Datum',type: 'string',role: 'string',desc: 'Inbetriebnahme-Datum',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_6', {def: "-",name: 'sw_version',type: 'string',role: 'string',desc: 'sw_version',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_8_11', {def: 0,name: 'Ergebnis letzter E-Mail Versand 0=keine Mail versandt 1=Mail erfolgreich versandt 2=Benutzerdaten fehlerhaft 3= kein Internetzugang/Server nicht bereit',type: 'number',role: 'number',desc: 'Ergebnis letzter E-Mail Versand 0=keine Mail versandt 1=Mail erfolgreich versandt 2=Benutzerdaten fehlerhaft 3= kein Internetzugang/Server nicht bereit',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_10_1', {def: 0,name: 'Aktuelle RestkapazitÃ¤t Austauscher',type: 'number',role: 'number',desc: 'Aktuelle RestkapazitÃ¤t Austauscher',unit: '%'});
    createState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_B_1', {def: 0,name: 'Regeneration aktiv',type: 'number',role: 'number',desc: 'Regeneration aktiv',unit: ''});
    //Netzwerk
    createState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_1', {def: "-",name: 'IP-Adresse WLAN',type: 'string',role: 'string',desc: 'IP-Adresse WLAN',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_2', {def: "-",name: 'Default Gateway WLAN',type: 'string',role: 'string',desc: 'Default Gateway WLAN',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_3', {def: "-",name: 'Primary DNS WLAN',type: 'string',role: 'string',desc: 'Primary DNS WLAN',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_4', {def: "-",name: 'Secondary DNS WLAN',type: 'string',role: 'string',desc: 'Secondary DNS WLAN',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_5', {def: 0,name: 'Status WLAN 1=verbunden',type: 'number',role: 'number',desc: 'Status WLAN 1=verbunden',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_7_1', {def: "-",name: 'IP-Adresse Access Point',type: 'string',role: 'string',desc: 'IP-Adresse Access Point',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_7_2', {def: "-",name: 'SSID Access Point',type: 'string',role: 'string',desc: 'SSID Access Point',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_7_3', {def: 0,name: 'Status Access Point 1=verbunden',type: 'number',role: 'number',desc: 'Status Access Point 1=verbunden',unit: ''});
    createState(instanz + PfadEbene1 + PfadEbene2[2] + 'LanStatus', {def: true,name: 'Netzwerkverbindung IO Broker zur Anlage true=verbunden',type: 'boolean',role: 'State',desc: 'Netzwerkverbindung IO Broker zur Anlage true=verbunden',unit: ''});
    //Fehlerspeicher
    for(var i = 1; i<= 16; i++) {
	    if(i<10){
		    createState(instanz + PfadEbene1 + PfadEbene2[3] + 'D_K_10_0' + i, {def: "-",name: 'Fehlerspeicher ' + i ,type: 'string',role: 'string',desc: 'Fehlerspeicher ' + i ,unit: ''});
	    }
	    else {
		    createState(instanz + PfadEbene1 + PfadEbene2[3] + 'D_K_10_' + i, {def: "-",name: 'Fehlerspeicher ' + i ,type: 'string',role: 'string',desc: 'Fehlerspeicher ' + i ,unit: ''});	
	    }
    }
    //**** Aktualwerte ***
    createState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_1_1', {def: 0,name: 'Aktueller Durchfluss',type: 'number',role: 'number',desc: 'Aktueller Durchfluss',unit: 'mÂ³/h'});
    createState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_1_2', {def: 0,name: 'RestkapazitÃ¤t',type: 'number',role: 'number',desc: 'RestkapazitÃ¤t',unit: 'mÂ³*Â°dH'});
    createState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_1_3', {def: 0,name: 'KapazitÃ¤tszahl',type: 'number',role: 'number',desc: 'KapazitÃ¤tszahl',unit: 'mÂ³*Â°dH'});
    createState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_2_1', {def: 0,name: 'Restzeit/-menge Reg.Schritt',type: 'number',role: 'number',desc: 'Restzeit/-menge Reg.Schritt',unit: 'l oder min'});
    createState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_3_1', {def: "-",name: 'Letzte Regeneration',type: 'string',role: 'string',desc: 'Letzte Regeneration',unit: 'h'});
    createState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_3_2', {def: 0,name: 'Letzte Regeneration Ã¼ber',type: 'number',role: 'number',desc: 'Letzte Regeneration Ã¼ber',unit: '%'});
    createState(instanz + PfadEbene1 + PfadEbene2[4] + 'Salzverbrauch', {def: 0, name: 'Salzverbrauch in kg',type: 'number',role: 'number',desc: 'Salzverbrauch in kg',unit: 'kg'});
    createState(instanz + PfadEbene1 + PfadEbene2[4] + 'SalzverbrauchGesamt', {def: 0, name: 'Salzverbrauch gesamt in kg',type: 'number',role: 'number',desc: 'Salzverbrauch gesamt in kg',unit: 'kg'});
    createState(instanz + PfadEbene1 + PfadEbene2[4] + 'DatumSalzverbrauch', {def: "00.00.00",name: 'Start Datum Gesamtwasserverbrauch',type: 'string',role: 'string',desc: 'Start Datum Gesamtwasserverbrauch',unit: ''});
	//**** Wasserverbrauch *** Regenerationen ***
    for(var i = 1; i<= 14; i++) {
	    if(i<10){
		    createState(instanz + PfadEbene1 + PfadEbene2[5] + 'D_Y_2_0' + i, {def: 0,name: 'Wasserverbrauch vor ' + i + 'Tagen',type: 'number',role: 'number',desc: 'Wasserverbrauch vor ' + i + ' Tagen',unit: 'Liter'});
		    createState(instanz + PfadEbene1 + PfadEbene2[5] + 'Verschnittwasser_0' + i, {def: 0,name: 'Verschnittwasserverbrauch vor ' + i + 'Tagen',type: 'number',role: 'number',desc: 'Verschnittwasserverbrauch vor ' + i + ' Tagen',unit: 'Liter'});
            createState(instanz + PfadEbene1 + PfadEbene2[6] + 'D_Y_4_0' + i, {def: "-",name: 'Zeit letzte Regenereation ' + i + ' vor aktueller',type: 'string',role: 'string',desc: 'Zeit letzte Regenereation ' + i + ' vor aktueller',unit: ''});
	    
        }
	    else {
		    createState(instanz + PfadEbene1 + PfadEbene2[5] + 'D_Y_2_' + i, {def: 0,name: 'Wasserverbrauch vor ' + i + 'Tagen',type: 'number',role: 'number',desc: 'Wasserverbrauch vor ' + i + ' Tagen',unit: 'Liter'});
		    createState(instanz + PfadEbene1 + PfadEbene2[5] + 'Verschnittwasser_' + i, {def: 0,name: 'Verschnittwasserverbrauch vor ' + i + 'Tagen',type: 'number',role: 'number',desc: 'Verschnittwasserverbrauch vor ' + i + ' Tagen',unit: 'Liter'});
            createState(instanz + PfadEbene1 + PfadEbene2[6] + 'D_Y_4_' + i, {def: "-",name: 'Zeit letzte Regenereation ' + i + ' vor aktueller',type: 'string',role: 'string',desc: 'Zeit letzte Regenereation ' + i + ' vor aktueller',unit: ''});	
	    }
    }
    //*** Ausseneingriff ******
    createState(instanz + PfadEbene1 + PfadEbene2[7] + 'Fehlerspeicher' , {def:'false',name:'Fehlerspeicher ' ,type:'boolean',role:'State',desc: 'State zum auslesen vom Fehlerspeicher '});
    createState(instanz + PfadEbene1 + PfadEbene2[7] + 'Regenerationsstart', {def:'false',name:'Regenerationsstart',type:'boolean',role:'State',desc: 'State zum starten der Regeneration'});
	createState(instanz + PfadEbene1 + PfadEbene2[7] + 'ServiceIntervalldauer', {def:'0',name:'Service Intervalldauer',type:'number',role:'State',desc: 'State zum Ã¤ndern der Service Intervalldauer'});
    createState(instanz + PfadEbene1 + PfadEbene2[7] + 'DisplayStandby', {def:'0',name:'Aktives Display im Standby 0=deaktiviert 1=aktiviert',type:'number',role:'State',desc: 'State zum Ã¤ndern Standby Modus Display'});
    createState(instanz + PfadEbene1 + PfadEbene2[7] + 'Sprache', {def:'0',name:'Sprache 0=De 1=En 3=Fr 4=Nl 5=Ru 6=Es 7=Zh',type:'number',role:'State',desc: 'State zum Ã¤ndern der Sprache'});
    createState(instanz + PfadEbene1 + PfadEbene2[7] + 'Rohwasserhaerte', {def:'0',name:'RohwasserhÃ¤rte',type:'number',role:'State',desc: 'State zum Ã¤ndern der RohwasserhÃ¤rte'});
    createState(instanz + PfadEbene1 + PfadEbene2[7] + 'StartzeitRegeneration1', {def: "00:00",name: 'Startzeit Regeneration 1',type: 'string',role: 'State',desc: 'State zum Ã¤ndern der Startzeit Regeneration 1',unit: 'Uhr'});
    createState(instanz + PfadEbene1 + PfadEbene2[7] + 'Regenerationszeitpunkt', {def:'0',name:'Regenerationszeitpunkt 0= Auto 1= Fest',type:'number',role:'State',desc: 'State zum Ã¤ndern des Regenerationszeitpunkt'});
    createState(instanz + PfadEbene1 + PfadEbene2[7] + 'Ansprechverhalten', {def: 0,name: 'Ansprechverhalten 0=eco 1=Power',type: 'number',role: 'State',desc: 'State zum Ã¤ndern des Ansprechverhalten 0=eco 1=Power'});
    //ZÃ¤hlerstÃ¤nde
	createState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_1', {def: 0,name: 'ZÃ¤hler Regenerationen',type: 'number',role: 'number',desc: 'ZÃ¤hler Regenerationen',unit: ''});
	createState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_2', {def: 0,name: 'ZÃ¤hler Weichwassermenge',type: 'number',role: 'number',desc: 'ZÃ¤hler Weichwassermenge',unit: 'mÂ³'});
	createState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_3', {def: 0,name: 'Durchfluss Spitzenwert',type: 'number',role: 'number',desc: 'Durchfluss Spitzenwert',unit: 'mÂ³/h'});
	createState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_4', {def: 0,name: 'ZeitzÃ¤hler Nenndurchfluss Ã¼berschrittten',type: 'number',role: 'number',desc: 'ZeitzÃ¤hler Nenndurchfluss Ã¼berschrittten',unit: 'h'});
	createState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_7', {def: 0,name: 'Schrittanzeige Regenerationsventil',type: 'number',role: 'number',desc: 'Schrittanzeige Regenerationsventil',unit: 'Steps'});
	createState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_8', {def: 0,name: 'VerbrauchskapazitÃ¤tszahl',type: 'number',role: 'number',desc: 'VerbrauchskapazitÃ¤tszahl',unit: 'mÂ³xÂ°dH'});
	createState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_9', {def: 0,name: 'Durchschnittsverbrauch der letzen 3 Tage',type: 'number',role: 'number',desc: 'Durchschnittsverbrauch der letzen 3 Tage',unit: 'mÂ³'});
	createState(instanz + PfadEbene1 + PfadEbene2[8] + 'Wasserzaehler', {def: 0,name: 'Gesamtwasserverbrauch',type: 'number',role: 'number',desc: 'Gesamtwasserverbrauch',unit: 'mÂ³'});
    createState(instanz + PfadEbene1 + PfadEbene2[8] + 'DatumWasserzaehler', {def: "00.00.00",name: 'Start Datum Gesamtwasserverbrauch',type: 'string',role: 'string',desc: 'Start Datum Gesamtwasserverbrauch',unit: ''});
};
//*************************************************************************************************
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var parser = require('xmldom').DOMParser;
var xhr = new XMLHttpRequest();
var sParSend = "";
var sParGet = "";
var neuerWert;
var arryAuswerteEbene;
var KeineRueckmeldung = false;
var TimeoutRueckmeldung;
const idConnectedState = instanz + PfadEbene1 + PfadEbene2[2] + 'LanStatus';
var ConnectedErr = 0;
var z =0;
//**************************************************************************************************


//wird aufgerufen wenn Sendevorgang erfolgreich abgeschlossen wurde
xhr.onload = function () 
{
    if (debug) {console.log("Rueckmeldung SC18:" + xhr.responseText)}
    //if (debug) log ('Pfad Ebene = '+arryAuswerteEbene)
    KeineRueckmeldung = false;
    ConnectedErr=0;
    setState(idConnectedState,true);
    var str = xhr.responseText;
    switch (arryAuswerteEbene)
    {
        case 0:
            // keine Auswertung der RÃ¼ckmeldung erforderlich
            break;
        case 1:
            // Regenerationszeitpunkt
            regex = /<data><code>([^\<]+)<\/code><D_C_4_1>([^\<]+)<\/D_C_4_1><\/data>/;
	        subst = regex.exec(str);
            if (subst){
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_4_1' , parseInt(subst[2]) );
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'Regenerationszeitpunkt', parseInt(subst[2]) );
            }
            break;
        case 2:
            // ServiceIntervalldauer
            regex = /<data><code>([^\<]+)<\/code><D_C_7_1>([^\<]+)<\/D_C_7_1><\/data>/;
	        subst = regex.exec(str);
            if (subst){
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_7_1' , parseInt(subst[2]) );
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'ServiceIntervalldauer', parseInt(subst[2]) );
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
				        setState(instanz + PfadEbene1 + PfadEbene2[3] + 'D_K_10_0'+ iw , subst[iz] );
                    }else{
				        setState(instanz + PfadEbene1 + PfadEbene2[3] + 'D_K_10_'+ iw , subst[iz] );
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
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_6_1' , parseInt(subst[2]) );
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'DisplayStandby', parseInt(subst[2]) );
            }
            break;
        case 5: 
            // Sprache
            regex = /<data><code>([^\<]+)<\/code><D_C_1_1>([^\<]+)<\/D_C_1_1><\/data>/;
	        subst = regex.exec(str);
            if (subst){
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_1_1' , parseInt(subst[2]) );
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'Sprache', parseInt(subst[2]) );
            }
            break;
        case 6:    
            // Auswertung fÃ¼r Zyklisch abfragen
            regex = /<data><code>([^\<]+)<\/code><D_D_1>([^\<]+)<\/D_D_1><D_A_4_1>([^\<]+)<\/D_A_4_1><D_A_4_2>([^\<]+)<\/D_A_4_2><D_A_4_3>([^\<]+)<\/D_A_4_3><D_C_1_1>([^\<]+)<\/D_C_1_1><D_C_2_1>([^\<]+)<\/D_C_2_1><D_C_5_1>([^\<]+)<\/D_C_5_1><D_C_4_1>([^\<]+)<\/D_C_4_1><D_C_4_2>([^\<]+)<\/D_C_4_2><D_C_4_3>([^\<]+)<\/D_C_4_3><D_C_6_1>([^\<]+)<\/D_C_6_1><D_C_7_1>([^\<]+)<\/D_C_7_1><D_A_2_2>([^\<]+)<\/D_A_2_2><D_C_3_6_1>([^\<]+)<\/D_C_3_6_1><D_C_3_6_2>([^\<]+)<\/D_C_3_6_2><D_C_3_6_3>([^\<]+)<\/D_C_3_6_3><D_C_3_6_4>([^\<]+)<\/D_C_3_6_4><D_C_3_6_5>([^\<]+)<\/D_C_3_6_5><D_C_3_7_1>([^\<]+)<\/D_C_3_7_1><D_C_3_7_2>([^\<]+)<\/D_C_3_7_2><D_C_3_7_3>([^\<]+)<\/D_C_3_7_3><D_Y_5>([^\<]+)<\/D_Y_5><D_Y_7>([^\<]+)<\/D_Y_7><D_Y_6>([^\<]+)<\/D_Y_6><D_Y_8_11>([^\<]+)<\/D_Y_8_11><D_Y_10_1>([^\<]+)<\/D_Y_10_1><D_B_1>([^\<]+)<\/D_B_1><D_A_1_1>([^\<]+)<\/D_A_1_1><D_A_1_2>([^\<]+)<\/D_A_1_2><D_A_1_3>([^\<]+)<\/D_A_1_3><D_A_2_1>([^\<]+)<\/D_A_2_1><D_A_3_1>([^\<]+)<\/D_A_3_1><D_A_3_2>([^\<]+)<\/D_A_3_2><D_K_1>([^\<]+)<\/D_K_1><D_K_2>([^\<]+)<\/D_K_2><D_K_3>([^\<]+)<\/D_K_3><D_K_4>([^\<]+)<\/D_K_4><D_K_7>([^\<]+)<\/D_K_7><D_K_8>([^\<]+)<\/D_K_8><D_K_9>([^\<]+)<\/D_K_9><D_Y_2_1>([^\<]+)<\/D_Y_2_1><D_Y_4_1>([^\<]+)<\/D_Y_4_1><D_Y_2_2>([^\<]+)<\/D_Y_2_2><D_Y_4_2>([^\<]+)<\/D_Y_4_2><D_Y_2_3>([^\<]+)<\/D_Y_2_3><D_Y_4_3>([^\<]+)<\/D_Y_4_3><D_Y_2_4>([^\<]+)<\/D_Y_2_4><D_Y_4_4>([^\<]+)<\/D_Y_4_4><D_Y_2_5>([^\<]+)<\/D_Y_2_5><D_Y_4_5>([^\<]+)<\/D_Y_4_5><D_Y_2_6>([^\<]+)<\/D_Y_2_6><D_Y_4_6>([^\<]+)<\/D_Y_4_6><D_Y_2_7>([^\<]+)<\/D_Y_2_7><D_Y_4_7>([^\<]+)<\/D_Y_4_7><D_Y_2_8>([^\<]+)<\/D_Y_2_8><D_Y_4_8>([^\<]+)<\/D_Y_4_8><D_Y_2_9>([^\<]+)<\/D_Y_2_9><D_Y_4_9>([^\<]+)<\/D_Y_4_9><D_Y_2_10>([^\<]+)<\/D_Y_2_10><D_Y_4_10>([^\<]+)<\/D_Y_4_10><D_Y_2_11>([^\<]+)<\/D_Y_2_11><D_Y_4_11>([^\<]+)<\/D_Y_4_11><D_Y_2_12>([^\<]+)<\/D_Y_2_12><D_Y_4_12>([^\<]+)<\/D_Y_4_12><D_Y_2_13>([^\<]+)<\/D_Y_2_13><D_Y_4_13>([^\<]+)<\/D_Y_4_13><D_Y_2_14>([^\<]+)<\/D_Y_2_14><D_Y_4_14>([^\<]+)<\/D_Y_4_14><\/data>/;
	        subst = regex.exec(str);
            if (subst)
	        {
		        var i = 2;
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_D_1' , parseFloat(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_A_4_1' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_A_4_2' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_A_4_3' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_1_1' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_2_1' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_5_1' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_4_1' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_4_2' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_4_3' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_6_1' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_7_1' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_A_2_2' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_1' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_2' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_3' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_4' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_6_5' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_7_1' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_7_2' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[2] + 'D_C_3_7_3' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_5' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_7' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_6' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_8_11' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_Y_10_1' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_B_1' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_1_1' , parseFloat(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_1_2' , parseFloat(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_1_3' , parseFloat(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_2_1' , parseFloat(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_3_1' , subst[i++] );
                setState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_3_2' , parseInt(subst[i++]) );
                setState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_1' , parseFloat(subst[i++]) );
			    setState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_2' , parseFloat(subst[i++]) );
			    setState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_3' , parseFloat(subst[i++]) );
			    setState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_4' , parseFloat(subst[i++]) );
			    setState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_7' , parseFloat(subst[i++]) );
			    setState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_8' , parseFloat(subst[i++]) );
			    setState(instanz + PfadEbene1 + PfadEbene2[8] + 'D_K_9' , parseFloat(subst[i]) );
			    var iz = i;
		        for(var iw = 1; iw<= 14; iw++) 
                {
			        iz++;
			        if(iw<10)
                    {
				        setState(instanz + PfadEbene1 + PfadEbene2[5] + 'D_Y_2_0' + iw , parseInt(subst[iz++]) );
				        setState(instanz + PfadEbene1 + PfadEbene2[6] + 'D_Y_4_0' + iw , subst[iz] );
                    }
			        else 
                    {
				        setState(instanz + PfadEbene1 + PfadEbene2[5] + 'D_Y_2_' + iw , parseInt(subst[iz++]) );
				        setState(instanz + PfadEbene1 + PfadEbene2[6] + 'D_Y_4_' + iw , subst[iz] );
			        }
                }
			
            }
            break;
        case 7:
            //RohwasserhÃ¤rte
            regex = /<data><code>([^\<]+)<\/code><D_D_1>([^\<]+)<\/D_D_1><\/data>/;
	        subst = regex.exec(str);
            if (subst){
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_D_1' , parseInt(subst[2]) );
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'Rohwasserhaerte', parseInt(subst[2]) );
            }
            break;
        case 8:
            //Startzeit Regeneration
            regex = /<data><code>([^\<]+)<\/code><D_C_4_3>([^\<]+)<\/D_C_4_3><\/data>/;
	        subst = regex.exec(str);
            if (subst){
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_4_3' , parseInt(subst[2]) );
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'StartzeitRegeneration1', parseInt(subst[2]) );
            }
            break;
        case 9:
            //Power- Eco-modus
            regex = /<data><code>([^\<]+)<\/code><D_C_5_1>([^\<]+)<\/D_C_5_1><\/data>/;
	        subst = regex.exec(str);
            if (subst){
                setState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_C_5_1' , parseInt(subst[2]) );
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'Ansprechverhalten', parseInt(subst[2]) );
            }
            break;
        default:
    }
};

// State SC18 String erstellen fÃ¼r Zyklisch abfragen
on({time: "*/" + constPollingCycle + " * * * * *"}, function () {
	if (KeineRueckmeldung == false){
        sParSend = "id=3369&code=245&show=D_D_1|D_A_4_1|D_A_4_2|D_A_4_3|D_C_1_1|D_C_2_1|D_C_5_1|D_C_4_1|D_C_4_2|D_C_4_3|D_C_6_1|D_C_7_1|D_A_2_2|D_C_3_6_1|D_C_3_6_2|D_C_3_6_3|D_C_3_6_4|D_C_3_6_5|D_C_3_7_1|D_C_3_7_2|D_C_3_7_3|D_Y_5|D_Y_7|D_Y_6|D_Y_8_11|D_Y_10_1|D_B_1|D_A_1_1|D_A_1_2|D_A_1_3|D_A_2_1|D_A_3_1|D_A_3_2|D_K_1|D_K_2|D_K_3|D_K_4|D_K_7|D_K_8|D_K_9|D_Y_2_1|D_Y_4_1|D_Y_2_2|D_Y_4_2|D_Y_2_3|D_Y_4_3|D_Y_2_4|D_Y_4_4|D_Y_2_5|D_Y_4_5|D_Y_2_6|D_Y_4_6|D_Y_2_7|D_Y_4_7|D_Y_2_8|D_Y_4_8|D_Y_2_9|D_Y_4_9|D_Y_2_10|D_Y_4_10|D_Y_2_11|D_Y_4_11|D_Y_2_12|D_Y_4_12|D_Y_2_13|D_Y_4_13|D_Y_2_14|D_Y_4_14~"
        ShowState (sParSend)
        arryAuswerteEbene = 6  
    } 
});

//Power- Eco-modus umschalten Int 0=eco 1=power
var merkerPowerEco = false;
on(instanz + PfadEbene1 + PfadEbene2[7] + 'Ansprechverhalten', function PowerEco (obj) 
{
    var Trigger = getState(instanz + PfadEbene1 + PfadEbene2[7] + 'Ansprechverhalten').val;
    var AkkRegState = getState(instanz + PfadEbene1 + PfadEbene2[0]+'D_C_5_1').val;
    if ((Trigger === 1 && Trigger != AkkRegState) || (Trigger === 0 && Trigger != AkkRegState))
    {
        if (debug) log ('State Ansprechverhalten wurde geÃ¤ndert. Variable KeineRueckmeldung = '+KeineRueckmeldung)
        if (KeineRueckmeldung === false && merkerPowerEco === true )
        {
            ShowState ("edit=D_C_5_1>"+Trigger+"&show=D_C_5_1&id=3369~")
            arryAuswerteEbene = 9;
            merkerPowerEco =false;
            z=0;
            if (logging && Trigger === 1) log ('neue Einstellung Ansprechverhalten power')
			if (logging && Trigger === 0) log ('neue Einstellung Ansprechverhalten eco')
        }else{
            merkerPowerEco =true;
            z++;
            if (z<10)
            {
                setTimeout(PowerEco, 2000);
			    if (debug) log('neue Einstellung Ansprechverhalten ging wegen fehlender RÃ¼ckmeldung nicht durch')
            }else{
                z=0;
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'Ansprechverhalten',AkkRegState);
            }
        }
    }
});


//Regenerationszeitpunkt Int 0=auto 1=fest
var merkerRegenerationszeitpunkt = false;
on(instanz + PfadEbene1 + PfadEbene2[7] + 'Regenerationszeitpunkt', function Regenerationszeitpunkt (obj) 
{
    var Trigger = getState(instanz + PfadEbene1 + PfadEbene2[7] + 'Regenerationszeitpunkt').val;
    var AkkRegState = getState(instanz + PfadEbene1 + PfadEbene2[0]+'D_C_4_1').val;
    if ((Trigger === 1 || Trigger === 0) && Trigger != AkkRegState)
    {
        if (debug) log ('State Regenerationszeitpunkt wurde geÃ¤ndert. Variable KeineRueckmeldung = '+KeineRueckmeldung)
        if (KeineRueckmeldung === false && merkerRegenerationszeitpunkt === true)
        {
            ShowState ("edit=D_C_4_1>"+Trigger+"&show=D_C_4_1&id=3369~")
            arryAuswerteEbene = 1;
            merkerRegenerationszeitpunkt =false;
            if (logging && Trigger === 1) log ('neue Einstellung Regenerationszeitpunkt fest')
			if (logging && Trigger === 0) log ('neue Einstellung Regenerationszeitpunkt auto')
            z=0;
        }else{
            merkerRegenerationszeitpunkt =true;
            z++;
            if (z<10)
            {
                setTimeout(Regenerationszeitpunkt, 2000);
                if (debug) log('neue Einstellung Regenerationszeitpunkt ging wegen fehlender RÃ¼ckmeldung nicht durch')
            }else{
                z=0;
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'Regenerationszeitpunkt',AkkRegState);
            }
			
            
        }
    }
});


//Uhrzeit String hh:mm wird automatisch Synchronisiert wenn Regenerationszeitpunkt auf "1=fest" eingestellt ist
on(instanz + PfadEbene1 + PfadEbene2[0]+'D_C_4_2', function (obj) 
{
    if (KeineRueckmeldung == false){
        var sZeitState = getState(instanz + PfadEbene1 + PfadEbene2[0]+'D_C_4_2').val;
        var minutes = new Date();
        var Minuten = minutes.getMinutes(); Minuten = Minuten > 9 ? Minuten : '0' + Minuten; 
        var akkZeit = new Date().getHours()+":"+Minuten;
        // wenn Regenerationszeitpunkt = 1 (fest) und aktuelle Zeit nicht gleich Anlagenzeit
        if (getState(instanz + PfadEbene1 +PfadEbene2[0]+'D_C_4_1').val && akkZeit != sZeitState ){
            ShowState ("edit=D_C_4_2>"+ akkZeit +"&id=3369~")
        }
    }
});

//Startzeit Regeneration String hh:mm
var merkerStartzeitRegeneration1 = false;
on(instanz + PfadEbene1 + PfadEbene2[7] + 'StartzeitRegeneration1', function StartzeitRegeneration1 (obj) 
{
    var Trigger = getState(instanz + PfadEbene1 + PfadEbene2[7] + 'StartzeitRegeneration1').val;
    var AkkRegState = getState(instanz + PfadEbene1 + PfadEbene2[0]+'D_C_4_3').val;
    //State Zeitformat prÃ¼fen ********************************
    var strValid = true
    if (merkerStartzeitRegeneration1 === false)
    {
        var strLaenge = Trigger.length
        var strTrennZeichen = Trigger.indexOf(":");
        var strStunden = Trigger.substr(0,2);
        var strMinuten = Trigger.substr(3,2);
        if ((isNaN(strStunden) || isNaN(strMinuten)) && strLaenge <5 && strTrennZeichen != 2) {strValid = false;}
        if (debug) log ('Zeitformat ist = '+strValid+' / '+strStunden+' / '+strMinuten+' / '+strLaenge+' / '+strTrennZeichen)
    }
    //**********************************************
    if (Trigger != AkkRegState && strValid)
    {
        if (debug) log ('State Startzeit Regeneration wurde geÃ¤ndert. Variable KeineRueckmeldung = '+KeineRueckmeldung)
        if (KeineRueckmeldung === false && merkerStartzeitRegeneration1 === true )
        {
            ShowState ("edit=D_C_4_3>"+Trigger+"&show=D_C_4_3&id=3369~")
            merkerStartzeitRegeneration1 = false;
            arryAuswerteEbene = 8;
            if (logging) log ('neue Einstellung Startzeit Regeneration = '+Trigger+' Uhr')
            z=0;
        }else{
            merkerStartzeitRegeneration1 = true;
            z++;
            if (z<10)
            {
                setTimeout(StartzeitRegeneration1, 2000);
			    if (debug) log('neue Einstellung Startzeit Regeneration 1 ging wegen fehlender RÃ¼ckmeldung nicht durch')
            }else{
                z=0;
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'StartzeitRegeneration1',AkkRegState);
            }
        }
    }
});

//RohwasserhÃ¤rte Double Â°dH
var merkerRohwasserhaerte = false;
on(instanz + PfadEbene1 + PfadEbene2[7] + 'Rohwasserhaerte', function Rohwasserhaerte (obj) 
{
    var Trigger = getState(instanz + PfadEbene1 + PfadEbene2[7] + 'Rohwasserhaerte').val;
    var AkkRegState = getState(instanz + PfadEbene1 + PfadEbene2[0]+'D_D_1').val;
    if (!isNaN(Trigger) && Trigger != AkkRegState)
    {
        if (debug) log ('State RohwasserhÃ¤rte wurde geÃ¤ndert. Variable KeineRueckmeldung = '+KeineRueckmeldung)
        if (KeineRueckmeldung === false && merkerRohwasserhaerte === true )
        {
            ShowState ("edit=D_D_1>"+Trigger+"&show=D_D_1&id=3369~")
            merkerRohwasserhaerte = false;
            arryAuswerteEbene = 7;
            if (logging) log ('neue Einstellung RohwasserhÃ¤rte = '+Trigger+' Â°dH')
            z=0;
        }else{
            merkerRohwasserhaerte = true;
            z++;
            if (z<10)
            {
                setTimeout(Rohwasserhaerte, 2000);
			    if (debug) log('neue Einstellung RohwasserhÃ¤rte ging wegen fehlender RÃ¼ckmeldung nicht durch')
            }else{
                z=0;
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'Rohwasserhaerte',AkkRegState);
            }
        }
    }
});
 
//Sprache Int 0=De 1=En 3=Fr 4=Nl 5=Ru 6=Es 7=Zh
var merkerSprache = false;
on(instanz + PfadEbene1 + PfadEbene2[7] + 'Sprache', function Sprache (obj) 
{
    var Trigger = getState(instanz + PfadEbene1 + PfadEbene2[7] + 'Sprache').val;
    var AkkRegState = getState(instanz + PfadEbene1 + PfadEbene2[0]+'D_C_1_1').val;
    if (Trigger >= 0 && Trigger <= 7 && Trigger != AkkRegState)
    {
        if (debug) log ('State Sprache wurde geÃ¤ndert. Variable KeineRueckmeldung = '+KeineRueckmeldung)
        if (KeineRueckmeldung === false && merkerSprache === true )
        {
            ShowState ("edit=D_C_1_1>"+Trigger+"&show=D_C_1_1&id=3369~")
            arryAuswerteEbene = 5;
            merkerSprache = false;
            if (logging) log ('neue Einstellung Sprache = '+Trigger)
            z=0;
        }else{
            merkerSprache = true;
            z++;
            if (z<10)
            {
                setTimeout(Sprache, 2000);
			    if (debug) log('neue Einstellung Sprache ging wegen fehlender RÃ¼ckmeldung nicht durch')
            }else{
                z=0;
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'Sprache',AkkRegState);
            }
        }
    }
});
 
//Aktives Display im Standby Int 0=deaktiviert 1=aktiviert
var merkerDisplay =false
on(instanz + PfadEbene1 + PfadEbene2[7] + 'DisplayStandby', function DisplayStandby (obj) 
{
    var Trigger = getState(instanz + PfadEbene1 + PfadEbene2[7] + 'DisplayStandby').val;
    var AkkRegState = getState(instanz + PfadEbene1 + PfadEbene2[0]+'D_C_6_1').val;
    if ((Trigger === 1 || Trigger === 0) && Trigger != AkkRegState)
    {
        if (debug) log ('State Aktives Display wurde geÃ¤ndert. Variable KeineRueckmeldung = '+KeineRueckmeldung)
        if (KeineRueckmeldung === false && merkerDisplay === true )
        {
            ShowState ("edit=D_C_6_1>"+Trigger+"&show=D_C_6_1&id=3369~")
            arryAuswerteEbene = 4;
            merkerDisplay =false;
            if (logging && Trigger === 1) log ('neue Einstellung Display im Standby ein')
			if (logging && Trigger === 0) log ('neue Einstellung Display im Standby aus')
            z=0;
        }else{
            merkerDisplay =true;
            z++;
            if (z<10)
            {
                setTimeout(DisplayStandby, 2000);
			    if (debug) log('neue Einstellung Display im Standby ging wegen fehlender RÃ¼ckmeldung nicht durch')
            }else{
                z=0;
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'DisplayStandby',AkkRegState);
            }
        }
    }
});

//Soll Service Intervalldauer Int Tage
var merkerService =false
on(instanz + PfadEbene1 + PfadEbene2[7] + 'ServiceIntervalldauer', function ServiceIntervalldauer (obj) 
{
   var Trigger = getState(instanz + PfadEbene1 + PfadEbene2[7] + 'ServiceIntervalldauer').val;
   var AkkRegState = getState(instanz + PfadEbene1 + PfadEbene2[0]+'D_C_7_1').val;
   if (!isNaN(Trigger) && Trigger != AkkRegState)
   { 
        if (debug) log ('State Soll Service Intervalldauer wurde geÃ¤ndert. Variable KeineRueckmeldung = '+KeineRueckmeldung)
        if (KeineRueckmeldung === false && merkerService === true )
        {
            ShowState ("edit=D_C_7_1>"+Trigger+"&show=D_C_7_1&id=3369~")
            arryAuswerteEbene = 2;
            merkerService =false;
            z=0;
        }else{
            merkerService =true;
            z++;
            if (z<10)
            {
                setTimeout(ServiceIntervalldauer, 2000);
			    if (debug) log('neue Einstellung Service Intervalldauer ging wegen fehlender RÃ¼ckmeldung nicht durch')
            }else{
                z=0
                setState(instanz + PfadEbene1 + PfadEbene2[7] + 'ServiceIntervalldauer',AkkRegState);
            }
        }
   } 
});


//manuelle Regeneration Int 1=Start
var merkerRegeneration =false
on(instanz + PfadEbene1 + PfadEbene2[7] + 'Regenerationsstart', function RegenerationStart (obj)
{
	var Trigger = getState(instanz + PfadEbene1 + PfadEbene2[7] + 'Regenerationsstart').val;
    var AkkRegState = getState(instanz + PfadEbene1 + PfadEbene2[1] + 'D_B_1').val;
	if ((KeineRueckmeldung === false && AkkRegState === 0 && Trigger === true)||(KeineRueckmeldung === false && merkerRegeneration === true && AkkRegState === 0)){
		ShowState ("edit=D_B_1>1&id=3369~")
		merkerRegeneration = false;
        z=0;
		if (logging) log ('manueller Regeneratiosstart')
		if (debug) log('Befehl zum Regeneratiosstart wurde abgesetzt')
        arryAuswerteEbene = 0;
    }else{
		if (AkkRegState === 0)
        {
            merkerRegeneration = true;
		    z++;
            if (z<10)
            {
                setTimeout(RegenerationStart, 2000);
                if (debug) log('Befehl zum Regeneratiosstart ging wegen fehlender RÃ¼ckmeldung nicht durch')
		    }else{
                z=0;
            }
        }
	} 
    setState(instanz + PfadEbene1 + PfadEbene2[7]+'Regenerationsstart',false);
});

//Fehlerspeicher Int 1=abfragen
var merkerFehlerspeicher=false;
on(instanz+PfadEbene1+PfadEbene2[7]+'Fehlerspeicher', function FehlerspeicherPrÃ¼fen (obj) 
{
   var Trigger = getState(instanz + PfadEbene1 + PfadEbene2[7]+'Fehlerspeicher').val;
   if (Trigger || merkerFehlerspeicher){
        if (debug) log ('State Fehlerspeicher wurde geÃ¤ndert. Variable KeineRueckmeldung = '+KeineRueckmeldung)
        if (KeineRueckmeldung === false){
            sParSend = "id=3369&code=245&show=D_K_10_1|D_K_10_2|D_K_10_3|D_K_10_4|D_K_10_5|D_K_10_6|D_K_10_7|D_K_10_8|D_K_10_9|D_K_10_10|D_K_10_11|D_K_10_12|D_K_10_13|D_K_10_14|D_K_10_15|D_K_10_16~"
            ShowState (sParSend)
            arryAuswerteEbene = 3; 
            if (debug) log ('Fehlerspeicher Abfrage wurde gesendet')
            merkerFehlerspeicher = false;
            z=0;
        }else{
            merkerFehlerspeicher = true;
            z++;
            if (z<10)
            {
                setTimeout(FehlerspeicherPrÃ¼fen, 2000);
			    if (debug) log('Befehl zum Fehlerspeicher abfragen ging wegen fehlender RÃ¼ckmeldung nicht durch')
            }else{
                z=0;
            }
        } 
   }
   setState(instanz + PfadEbene1 + PfadEbene2[7]+'Fehlerspeicher',false);
});

//Daten abfragen
var merkerDatenSenden = false;
function ShowState (sParSend) 
{
    if(typeof(sParSend) == "undefined")sParSend = "";
    if (!KeineRueckmeldung || merkerDatenSenden === true){
        try {
            KeineRueckmeldung = true;
            xhr.open("POST","http://" + constIP + "/mux_http", true);
	        xhr.setRequestHeader("Content-type", "application/json");
	        xhr.setRequestHeader("Content-length", sParSend.length);
		    xhr.setRequestHeader("Connection", "close");
		    xhr.responseType = "document";
            xhr.send(sParSend);
            if (debug) log (sParSend.length + " Byte an Daten wurden gesendet :" + sParSend)
            var RueckmeldungTimeout = setTimeout(function() 
            {
                xhr.abort();
                ConnectedErr++
                if (debug) log ('Timeout '+ConnectedErr);
                merkerDatenSenden = true;
                if (ConnectedErr < 10)
                {
                    setTimeout(ShowState, 2000,sParSend);
                }else{
                    console.warn ('Keine Netzwerkverbindung zur GrÃ¼nbeck Anlage')
                    merkerDatenSenden = false;
                    KeineRueckmeldung = false;
                    setState(idConnectedState,false);  
                }
            }, 5000);
            xhr.onreadystatechange = function()
            {
                if (xhr.readyState==4)
			    {
                    clearTimeout(RueckmeldungTimeout);
                    merkerDatenSenden = false;
                    KeineRueckmeldung = false;                    
                }

            } 
        }
        catch(Fehler1){
            xhr.abort();
            if (debug) log ('Catch aktiv Fehler = '+Fehler1)
            KeineRueckmeldung = false;
            merkerDatenSenden = false;
            clearTimeout(RueckmeldungTimeout);
            console.warn ('Keine Netzwerkverbindung zur GrÃ¼nbeck Anlage')
            setState(idConnectedState,false);
        }
    }

}

    
    
 
// Salzverbrauch berechnen 
on(instanz + PfadEbene1 + PfadEbene2[5] + 'D_Y_2_01', function (obj){ 
    /*Formel GrÃ¼nbeck bei KapazitÃ¤tszahl 8 mÂ³xÂ°dH und einem HÃ¤rteunterschied von Rohwasser zu Brauchwasser 
     von 12 Â°dH  : 0,0285 kg x 12 Â°dH x 100 mÂ³ = 34,2 kg Regeneriersalz
    Bei der min. KapazitÃ¤tszahl 6 mÂ³xÂ°dH entspricht der Salzverbrauch 0.025 kg
    Bei der max. KapazitÃ¤tszahl 14 mÂ³xÂ°dH entspricht der Salzverbrauch 0.039 kg
    Es wird von einem liniaren Salzverbrauch von 0.00175 kg pro mÂ³xÂ°dH ausgegangen.
    (((KapazitÃ¤tszahl-6)*0.00175)+0.025)x RohwasserhÃ¤rte x (Wasserverbrauch/1000)
    */
    var Rohwasserhaerte = getState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_D_1').val;
    var KapZahl = getState(instanz + PfadEbene1 + PfadEbene2[4] + 'D_A_1_3').val;
    var Wasserverbrauch = getState(instanz + PfadEbene1 + PfadEbene2[5] + 'D_Y_2_01').val;
    var SalzverbrauchAlt = getState(instanz + PfadEbene1 + PfadEbene2[4] + 'Salzverbrauch').val;
    var SalzverbrauchGesamt = getState(instanz + PfadEbene1 + PfadEbene2[4] + 'SalzverbrauchGesamt').val;
    var SalzverbrauchNeu = (((KapZahl-6)*0.00175)+ 0.025)*Rohwasserhaerte*(Wasserverbrauch/1000)
    var Salzverbrauch = SalzverbrauchNeu+SalzverbrauchAlt;
    SalzverbrauchGesamt =SalzverbrauchGesamt+SalzverbrauchNeu;
    setState(instanz + PfadEbene1 + PfadEbene2[4] + 'Salzverbrauch',Salzverbrauch);
    setState(instanz + PfadEbene1 + PfadEbene2[4] + 'SalzverbrauchGesamt',SalzverbrauchGesamt);
    if (debug) {console.log(SalzverbrauchAlt +" : "+ SalzverbrauchNeu)}
});

// Wasserverbrauch 0Â°dH + Verschnittwasser berechnen
on({time: "15 1 * * *"}, function () {
/* Formel: VerschnitthÃ¤rte / (RohwasserhÃ¤rte-VerschnitthÃ¤rte)= ErhÃ¶hungswert
 Beispiel: 5 Â°dH VerschnitthÃ¤rte / ( 21Â° dH RohwasserhÃ¤rte- 5Â° dH VerschnitthÃ¤rte)= 0.3125 ErhÃ¶hungswert
           0Â°dH Wasserverbrauch 400l x 1.3125 ErhÃ¶ungswert = 525l Wasser 5Â°dH */
    var GesamtverbrauchAlt = getState(instanz + PfadEbene1 + PfadEbene2[8] + 'Wasserzaehler').val;
    var Wasserverbrauch = getState(instanz + PfadEbene1 + PfadEbene2[5] + 'D_Y_2_01').val;
    var Rohwasserhaerte = getState(instanz + PfadEbene1 + PfadEbene2[0] + 'D_D_1').val;
    var ErhÃ¶hungswert = (VerschnitthÃ¤rte / (Rohwasserhaerte-VerschnitthÃ¤rte))+1;
    var GesamtverbrauchNeu = Wasserverbrauch*ErhÃ¶hungswert;
    var Gesamtverbrauch = (((GesamtverbrauchAlt*1000) + GesamtverbrauchNeu)/1000).toFixed(3);
    setState(instanz + PfadEbene1 + PfadEbene2[8] + 'Wasserzaehler',parseFloat(Gesamtverbrauch));
    log("neuer ZÃ¤hlerstand Wasser= "+Gesamtverbrauch)
    var akkWasser=0;
    var VerWasser=0;
    for(var i = 1; i<= 14; i++) {
	    if(i<10){
		    akkWasser = getState(instanz + PfadEbene1 + PfadEbene2[5] + 'D_Y_2_0' + i).val
		    VerWasser = akkWasser*ErhÃ¶hungswert
            setState(instanz + PfadEbene1 + PfadEbene2[5] + 'Verschnittwasser_0' + i,VerWasser)
        }
	    else {
		    akkWasser = getState(instanz + PfadEbene1 + PfadEbene2[5] + 'D_Y_2_' + i).val
		    VerWasser = akkWasser*ErhÃ¶hungswert
            setState(instanz + PfadEbene1 + PfadEbene2[5] + 'Verschnittwasser_' + i,VerWasser)
        }
    }
});

// Datum setzen wenn WasserzÃ¤hler zurÃ¼ckgesetzt wird
on(instanz + PfadEbene1 + PfadEbene2[8] + 'Wasserzaehler', function (obj){ 
    var Gesamtverbrauch = getState(instanz + PfadEbene1 + PfadEbene2[8] + 'Wasserzaehler').val;
    if (Gesamtverbrauch === 0){
        var Heute = new Date();
        setState(instanz + PfadEbene1 + PfadEbene2[8] + 'DatumWasserzaehler',Heute.getDate()+'.'+ (Heute.getMonth()+1) +'.'+Heute.getFullYear());
    }
});

// Datum setzen wenn Salzverbrauch zurÃ¼ckgesetzt wird
on(instanz + PfadEbene1 + PfadEbene2[4] + 'Salzverbrauch', function (obj){ 
    var Gesamtverbrauch = getState(instanz + PfadEbene1 + PfadEbene2[4] + 'Salzverbrauch').val;
    if (Gesamtverbrauch === 0){
        var Heute = new Date();
        setState(instanz + PfadEbene1 + PfadEbene2[4] + 'DatumSalzverbrauch',Heute.getDate()+'.'+ (Heute.getMonth()+1) +'.'+Heute.getFullYear());
    }
});
